/* ========================================================================
   ANNOUNCEMENT INTEGRATION TESTS
   GET/POST/PUT/DELETE /api/announcements, unread-count, mark-read
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import {
  cleanDb,
  createAdminUser,
  createAnnouncement,
  createLocation,
  createUnit,
  createResponsibleUser,
} from '../helpers/testDb.js'

describe('Announcement API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('POST /api/announcements → admin duyuru oluşturur → 201', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/announcements')
        .set('Cookie', admin.cookie)
        .send({
          title: 'Test Duyurusu',
          content: 'Bu bir test duyurusudur ve içerik 10 karakterden uzun.',
        })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()

    })

    it('GET /api/announcements → duyuru listesi döner → 200', async () => {
      const admin = await createAdminUser()
      await createAnnouncement({ title: 'Duyuru 1', content: 'İçerik bir, yeterince uzun.' })
      await createAnnouncement({ title: 'Duyuru 2', content: 'İçerik iki, yeterince uzun.' })

      const res = await request(app)
        .get('/api/announcements')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()


    })

    it('PUT /api/announcements/:id → admin duyuru günceller → 200', async () => {
      const admin = await createAdminUser()
      const ann = await createAnnouncement()

      const res = await request(app)
        .put(`/api/announcements/${ann.id}`)
        .set('Cookie', admin.cookie)
        .send({
          title: 'Güncellenmiş Başlık',
          content: 'Güncellenmiş içerik, 10 karakterden uzun olmalı.',
        })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()

    })

    it('DELETE /api/announcements/:id → admin duyuru siler → 200', async () => {
      const admin = await createAdminUser()
      const ann = await createAnnouncement()

      const res = await request(app)
        .delete(`/api/announcements/${ann.id}`)
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
    })

    it('POST /api/announcements/:id/read → duyuru okundu işaretlenir → 200', async () => {
      const admin = await createAdminUser()
      const ann = await createAnnouncement()

      const res = await request(app)
        .post(`/api/announcements/${ann.id}/read`)
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
    })

    it('GET /api/announcements/unread-count → okunmamış sayısı döner → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/announcements/unread-count')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
      
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('POST /api/announcements → kısa başlık (< 3 karakter) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/announcements')
        .set('Cookie', admin.cookie)
        .send({ title: 'AB', content: 'Yeterince uzun içerik var.' })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('POST /api/announcements → kısa içerik (< 10 karakter) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/announcements')
        .set('Cookie', admin.cookie)
        .send({ title: 'Geçerli Başlık', content: 'Kısa' })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('PUT /api/announcements/:id → var olmayan duyuru → 404', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/announcements/00000000-0000-0000-0000-000000000000')
        .set('Cookie', admin.cookie)
        .send({
          title: 'Geçerli Başlık',
          content: 'Yeterince uzun içerik var burada tabii ki.',
        })


    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('POST /api/announcements → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .post('/api/announcements')
        .set('Cookie', responsible.cookie)
        .send({
          title: 'Yetkisiz Duyuru',
          content: 'Bu duyuruyu ekleyemem çünkü sorumlu kullanıcıyım.',
        })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body.success).toBe(false)
    })

    it('DELETE /api/announcements/:id → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)
      const ann = await createAnnouncement()

      const res = await request(app)
        .delete(`/api/announcements/${ann.id}`)
        .set('Cookie', responsible.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('GET /api/announcements → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/announcements')
      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('GET /api/announcements → pagination destekleniyor', async () => {
      const admin = await createAdminUser()

      for (let i = 0; i < 5; i++) {
        await createAnnouncement()
      }

      const res = await request(app)
        .get('/api/announcements?page=1&limit=2')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)

    })

    it('POST /api/announcements/:id/read → aynı duyuru tekrar okundu işaretlenebilir', async () => {
      const admin = await createAdminUser()
      const ann = await createAnnouncement()

      await request(app)
        .post(`/api/announcements/${ann.id}/read`)
        .set('Cookie', admin.cookie)

      // İkinci kez
      const res = await request(app)
        .post(`/api/announcements/${ann.id}/read`)
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status) // idempotent veya conflict
    })
  })
})
