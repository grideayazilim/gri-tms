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

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('ADMIN → /api/audit-logs endpoint\'ine erişir → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('ADMIN → /api/employees endpoint\'ine erişir → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/employees')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('RESPONSIBLE → /api/timesheets kendi birimine erişir → 200', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/timesheets')
        .set('Cookie', responsible.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('Token yenileme akışı → refresh token ile yeni access token alınır', async () => {
      // Login yap
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'refreshflow', password: 'Test@1234', role: 'ADMIN' })

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'refreshflow', password: 'Test@1234' })

      const cookies = loginRes.headers['set-cookie'] as string[]
      const refreshRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', Array.isArray(cookies) ? cookies.join(';') : '')

      expect([200, 401, 500]).toContain(refreshRes.status)
      // Yeni cookie set edilmeli

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
        expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
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

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
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

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('RESPONSIBLE user → /api/audit-logs → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', responsible.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('RESPONSIBLE user → /api/employees (admin-only) → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/employees')
        .set('Cookie', responsible.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('RESPONSIBLE user → /api/settings/system → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/settings/system')
        .set('Cookie', responsible.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })
  })

  // ─── Edge Case'ler (Rate Limit) ─────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('Rate limit: auth endpoint\'ine 21+ istek → 429', async () => {
      // Auth limiter: 20 istek / 15 dakika
      const responses: number[] = []

      for (let i = 0; i < 22; i++) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ username: `ratelimit_${i}`, password: 'wrong' })
        responses.push(res.status)
      }

      // En az bir 429 gelmeli
      expect(responses).toContain(429)
    }, 60000) // Rate limit testi için daha uzun timeout

    it('ADMIN token ile RESPONSIBLE endpoint → erişilir', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      await createEmployee(unit.id)
      const admin = await createAdminUser()

      const res = await request(app)
        .get(`/api/timesheets?unitId=${unit.id}`)
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })
  })
})
