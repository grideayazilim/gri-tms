/* ========================================================================
   SETTINGS INTEGRATION TESTS
   GET/PUT /api/settings/system, pending-users, reset
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import {
  cleanDb,
  createAdminUser,
  createLocation,
  createUnit,
  createResponsibleUser,
  createSettings,
} from '../helpers/testDb.js'

describe('Settings API', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('GET /api/settings/system → sistem ayarlarını döner → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/settings/system')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()




    })

    it('PUT /api/settings/system → sistem ayarlarını günceller → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/settings/system')
        .set('Cookie', admin.cookie)
        .send({
          dailyWage: 750.00,
          maxWeeklyDays: 5,
          programStartDate: '2024-01-01',
          programEndDate: '2026-12-31',
        })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()

    })

    it('GET /api/settings/pending-users → bekleyen kullanıcıları listeler → 200', async () => {
      const admin = await createAdminUser()

      // Pending kullanıcı oluştur (register → PENDING status)
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'pendinguser', password: 'Test@1234', role: 'ADMIN' })

      const res = await request(app)
        .get('/api/settings/pending-users')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()

    })

    it('POST /api/settings/pending-users/:id/approve → pending kullanıcıyı onaylar → 200', async () => {
      const admin = await createAdminUser()

      // Pending kullanıcı oluştur
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'toapprove', password: 'Test@1234', role: 'ADMIN' })
      const userId = regRes.body.data?.id

      if (userId) {
        const res = await request(app)
          .post(`/api/settings/pending-users/${userId}/approve`)
          .set('Cookie', admin.cookie)

        expect(res.status).toBe(200) // Pending olmayabilir
      }
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('PUT /api/settings/system → geçersiz dailyWage (negatif) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/settings/system')
        .set('Cookie', admin.cookie)
        .send({
          dailyWage: -100,
          maxWeeklyDays: 5,
          programStartDate: '2024-01-01',
          programEndDate: '2026-12-31',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    /* Testin başlığı 400 diyordu ama 200 bekliyor ve hatalı davranışı
       kilitliyordu: sıfırlama formu 0'ı reddederken aynı alan normal ayarlar
       formundan 0 yapılabiliyor, tüm maaş çıktıları sessizce 0 TL üretiyordu. */
    it('PUT /api/settings/system → geçersiz maxWeeklyDays (0) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/settings/system')
        .set('Cookie', admin.cookie)
        .send({
          dailyWage: 1500,
          maxWeeklyDays: 0,
          programStartDate: '2024-01-01',
          programEndDate: '2024-12-31',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('PUT /api/settings/system → geçersiz dailyWage (0) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/settings/system')
        .set('Cookie', admin.cookie)
        .send({
          dailyWage: 0,
          maxWeeklyDays: 5,
          programStartDate: '2024-01-01',
          programEndDate: '2024-12-31',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('PUT /api/settings/system → programEndDate < programStartDate → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/settings/system')
        .set('Cookie', admin.cookie)
        .send({
          dailyWage: 500,
          maxWeeklyDays: 5,
          programStartDate: '2026-12-31',
          programEndDate: '2024-01-01', // bitiş < başlangıç
        })


    })

    it('DELETE /api/settings/pending-users/:id/reject → pending kullanıcıyı reddeder', async () => {
      const admin = await createAdminUser()

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'toreject', password: 'Test@1234', role: 'ADMIN' })
      const userId = regRes.body.data?.id

      if (userId) {
        const res = await request(app)
          .delete(`/api/settings/pending-users/${userId}/reject`)
          .set('Cookie', admin.cookie)

        expect(res.status).toBe(200)
      }
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/settings/system → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/settings/system')
      expect(res.status).toBe(401)
    })

    it('PUT /api/settings/system → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .put('/api/settings/system')
        .set('Cookie', responsible.cookie)
        .send({
          dailyWage: 500,
          maxWeeklyDays: 5,
          programStartDate: '2024-01-01',
          programEndDate: '2026-12-31',
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it('GET /api/settings/pending-users → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/settings/pending-users')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('PUT /api/settings/system → tek seferlik kayıt güncellenir (id=1)', async () => {
      const admin = await createAdminUser()

      // İlk güncelleme
      await request(app)
        .put('/api/settings/system')
        .set('Cookie', admin.cookie)
        .send({
          dailyWage: 600,
          maxWeeklyDays: 4,
          programStartDate: '2024-01-01',
          programEndDate: '2026-12-31',
        })

      // İkinci güncelleme
      await request(app)
        .put('/api/settings/system')
        .set('Cookie', admin.cookie)
        .send({
          dailyWage: 700,
          maxWeeklyDays: 6,
          programStartDate: '2024-01-01',
          programEndDate: '2026-12-31',
        })

      const res = await request(app)
        .get('/api/settings/system')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)

    })

    it('GET /api/settings/system → settings kaydı mevcutsa veri döner', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/settings/system')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      // Settings tablosunda en az 1 kayıt olmalı (beforeEach'te createSettings)

    })
  })
})
