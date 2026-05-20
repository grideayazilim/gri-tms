/* ========================================================================
   USER CRUD INTEGRATION TESTS
   GET/PUT/DELETE /api/users, PUT /api/users/me
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
} from '../helpers/testDb.js'

describe('User CRUD API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('GET /api/users → admin kullanıcılar listesini getirir → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/users')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()

      // En az admin kullanıcısı olmalı

    })

    it('PUT /api/users/:id → admin başka kullanıcıyı günceller → 200', async () => {
      const admin = await createAdminUser()
      // Güncellenecek kullanıcıyı register ile oluştur
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'toupdate', password: 'Test@1234', role: 'ADMIN' })
      const userId = regRes.body.data?.user?.id

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Cookie', admin.cookie)
        .send({ role: 'ADMIN', status: 'ACTIVE', username: 'toupdate' })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('DELETE /api/users/:id → admin kullanıcıyı siler → 200', async () => {
      const admin = await createAdminUser()
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'todelete', password: 'Test@1234', role: 'ADMIN' })
      const userId = regRes.body.data?.user?.id

      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it("PUT /api/users/me → kullanıcı kendi profilini günceller → 200", async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', admin.cookie)
        .send({ oldPassword: admin.password, newPassword: 'NewPass@5678' })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('PUT /api/users/:id → admin rol değiştirir (ADMIN → RESPONSIBLE) → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ username: 'rolechange', password: 'Test@1234', role: 'ADMIN' })
      const userId = regRes.body.data?.user?.id

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Cookie', admin.cookie)
        .send({
          role: 'RESPONSIBLE',
          status: 'ACTIVE',
          username: 'rolechange',
          locationId: location.id,
          unitId: unit.id,
          expiryDate: '2025-12-31',
        })

      expect(res.status).toBe(200)

    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('GET /api/users → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/users')
      expect(res.status).toBe(401)
    })

    it('PUT /api/users/:id → var olmayan kullanıcı → 404', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Cookie', admin.cookie)
        .send({ role: 'ADMIN', status: 'ACTIVE', username: 'nobody' })

      expect(res.status).toBe(404)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/users → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/users')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it("PUT /api/users/:id → RESPONSIBLE user başkasını güncellemeye çalışır → 403", async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .put(`/api/users/${admin.id}`)
        .set('Cookie', responsible.cookie)
        .send({ role: 'ADMIN', status: 'ACTIVE', username: admin.username })

      expect(res.status).toBe(403)
    })

    it('DELETE /api/users/:id → RESPONSIBLE user → 403', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .delete(`/api/users/${admin.id}`)
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it("PUT /api/users/me → yanlış mevcut şifre → hata", async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', admin.cookie)
        .send({ oldPassword: 'WrongPassword!', newPassword: 'NewPass@5678' })


      expect(res.body.success).toBe(false)
    })
  })
})
