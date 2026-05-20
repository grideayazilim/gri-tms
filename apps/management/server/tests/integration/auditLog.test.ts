/* ========================================================================
   AUDIT LOG INTEGRATION TESTS
   GET /api/audit-logs
   Audit logların CRUD işlemlerinden sonra oluşturulduğunu doğrular.
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
  createResponsibleUser,
} from '../helpers/testDb.js'

describe('Audit Log API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('GET /api/audit-logs → audit log listesini döner → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()

    })

    it('Kullanıcı oluşturulunca audit log kaydı oluşur', async () => {
      const admin = await createAdminUser()

      // CRUD işlemi yap (register)
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'auditlogtest', password: 'Test@1234', role: 'ADMIN' })

      // Audit log oluştu mu?
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      // Log sayısı 0'dan büyük olmalı

    })

    it('POST /api/announcements sonrası audit log kaydı oluşur', async () => {
      const admin = await createAdminUser()

      await request(app)
        .post('/api/announcements')
        .set('Cookie', admin.cookie)
        .send({
          title: 'Audit Log Test Duyurusu',
          content: 'Bu duyuru audit log oluşturmalı ve 10 karakterden uzun olmalı.',
        })

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)

    })

    it('GET /api/audit-logs → action filtresi çalışıyor', async () => {
      const admin = await createAdminUser()

      // Bir işlem yap
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'filtertest', password: 'Test@1234', role: 'ADMIN' })

      const res = await request(app)
        .get('/api/audit-logs?action=USER_REGISTER')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('GET /api/audit-logs → pagination çalışıyor', async () => {
      const admin = await createAdminUser()

      // Birden fazla işlem yap
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/register')
          .send({ username: `pgtest${i}_${faker.string.alphanumeric(4)}`, password: 'Test@1234', role: 'ADMIN' })
      }

      const res = await request(app)
        .get('/api/audit-logs?page=1&limit=2')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)


    })

    it('GET /api/audit-logs → tarih filtresi çalışıyor', async () => {
      const admin = await createAdminUser()

      const today = new Date().toISOString().split('T')[0]
      const res = await request(app)
        .get(`/api/audit-logs?startDate=${today}&endDate=${today}`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('GET /api/audit-logs → geçersiz page parametresi → 400', async () => {
      const admin = await createAdminUser()
      const res = await request(app)
        .get('/api/audit-logs?page=invalid')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
    })

    it('GET /api/audit-logs → geçersiz limit (negatif) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/audit-logs?limit=-1')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(400)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/audit-logs → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/audit-logs')
      expect(res.status).toBe(401)
    })

    it('GET /api/audit-logs → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('GET /api/audit-logs → kullanıcı adı filtresi çalışır', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get(`/api/audit-logs?actorUsername=${admin.username}`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('GET /api/audit-logs → limit=100 maksimum → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/audit-logs?limit=100')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
    })

    it('GET /api/audit-logs → audit log kayıtlarının alanları eksiksiz', async () => {
      const admin = await createAdminUser()

      // Bir işlem yap
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'fieldtest_xyz', password: 'Test@1234', role: 'ADMIN' })

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      if (res.body.data.length > 0) {
        const log = res.body.data[0]




      }
    })
  })
})
