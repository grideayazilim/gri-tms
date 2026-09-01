/* ========================================================================
   AUTHORIZATION INTEGRATION TESTS
   Rol bazlı erişim kontrolü ve rate limit testleri
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { faker } from '@faker-js/faker/locale/tr'
import app from '../../src/app.js'
import {
  cleanDb,
  createAdminUser,
  createLocation,
  createUnit,
  createEmployee,
  createResponsibleUser,
} from '../helpers/testDb.js'

describe('Authorization Tests', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('ADMIN → /api/users endpoint\'ine erişir → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/users')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
    })

    it('ADMIN → /api/audit-logs endpoint\'ine erişir → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
    })

    it('ADMIN → /api/employees endpoint\'ine erişir → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/employees')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
    })

    it('RESPONSIBLE → /api/timesheets kendi birimine erişir → 200', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/timesheets')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(200)
    })

    it('Token yenileme akışı → refresh token ile yeni access token alınır', async () => {
      // ACTIVE kullanıcı yarat (register değil, direkt DB insert — PENDING'e takılmaz)
      const user = await createAdminUser({ username: 'refreshflow', password: 'Test@1234' })

      // Login yap — ACTIVE kullanıcı 200 + httpOnly cookie döner
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: user.username, password: user.password })

      expect(loginRes.status).toBe(200)

      const cookies = loginRes.get('Set-Cookie') || []
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', Array.isArray(cookies) ? cookies.join(';') : cookies)

      expect(refreshRes.status).toBe(200)
      expect(refreshRes.get('Set-Cookie')).toBeDefined()
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('Auth olmadan tüm korumalı endpoint\'ler → 401', async () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/users' },
        { method: 'get', path: '/api/employees' },
        { method: 'get', path: '/api/audit-logs' },
        { method: 'get', path: '/api/timesheets' },
        { method: 'get', path: '/api/announcements' },
      ] as const

      for (const endpoint of protectedEndpoints) {
        const res = await request(app)[endpoint.method](endpoint.path)
        expect(res.status).toBe(401)
      }
    })

    it('Süresi dolmuş token ile /api/auth/me → 401', async () => {
      // Manuel olarak expired token oluştur (exp: 1 geçmiş)
      const jwt = (await import('jsonwebtoken')).default
      const expiredToken = jwt.sign(
        { id: 'test', username: 'test', role: 'ADMIN' },
        process.env['ACCESS_TOKEN_SECRET']!,
        { expiresIn: -1 } // Zaten süresi dolmuş
      )

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `accessToken=${expiredToken}`)

      expect(res.status).toBe(401)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('RESPONSIBLE user → /api/users → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/users')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })

    it('RESPONSIBLE user → /api/audit-logs → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })

    it('RESPONSIBLE user → /api/employees (admin-only) → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/employees')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })

    it('RESPONSIBLE user → /api/settings/system → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/settings/system')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })
  })

  // ─── Edge Case'ler (Rate Limit) ─────────────────────────────────────────
  describe("Edge case'ler", () => {
    /* IP başına sayaç 20 → LOGIN_IP_RATE_LIMIT_MAX (varsayılan 100) oldu.
       Okulda tüm bilgisayarlar tek dış IP'nin arkasında olduğu için 20 çok
       dardı. Brute force'a karşı ASIL koruma kullanıcı adı başına sayaçtır
       (15 dakikada 10) — değişmedi ve muafiyeti yok. Bu test artık onu
       sınıyor: aynı kullanıcı adına art arda denemeler. */
    it('Rate limit: aynı kullanıcı adına 11+ deneme → 429', async () => {
      const responses: number[] = []

      for (let i = 0; i < 12; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({ username: 'ratelimit_hedefi', password: `wrong-${i}` })
        responses.push(res.status)
      }

      expect(responses).toContain(429)
    }, 60000) // Rate limit testi için daha uzun timeout

    /* asıl kabul ölçütü: farklı kullanıcı adlarına yapılan denemeler
       IP sayacını doldurup masum kullanıcıları kilitlememeli. */
    it('Farklı kullanıcı adlarına 22 deneme IP sayacını doldurmaz', async () => {
      const responses: number[] = []

      for (let i = 0; i < 22; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .set('x-test-rate-limit', 'true')
          .send({ username: `ip_sayaci_${i}`, password: 'wrong' })
        responses.push(res.status)
      }

      expect(responses).not.toContain(429)
    }, 60000)

    it('ADMIN token ile RESPONSIBLE endpoint → erişilir', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      await createEmployee(unit.id)
      const admin = await createAdminUser()

      const res = await request(app)
        .get(`/api/timesheets?unitId=${unit.id}`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
    })
  })
})
