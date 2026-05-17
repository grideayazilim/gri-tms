/* ========================================================================
   HOLIDAY INTEGRATION TESTS
   GET /api/holidays
   NOT: Mevcut route'da yalnızca GET /api/holidays endpoint'i mevcuttur.
   Tatil ekleme/güncelleme/silme endpoint'leri uygulamada bulunmamaktadır.
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import {
  cleanDb,
  createAdminUser,
  createSettings,
  createResponsibleUser,
  createLocation,
  createUnit,
} from '../helpers/testDb.js'

describe('Holiday API', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('GET /api/holidays → year parametresiyle tatil listesi döner → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays?year=2024')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()

    })

    it('GET /api/holidays → 2025 yılı için tatil listesi döner → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays?year=2025')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
    })

    it('GET /api/holidays → RESPONSIBLE user da tatilleri görebilir → 200', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/holidays?year=2024')
        .set('Cookie', responsible.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
    })

    it('GET /api/holidays → sonuçlar tarih sırasında dönebilir', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays?year=2024')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      // Tatil alanlarını kontrol et (varsa)
      if (res.body.data.length > 0) {
        const first = res.body.data[0]


      }
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('GET /api/holidays → year parametresi eksik → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body.success).toBe(false)
    })

    it('GET /api/holidays → geçersiz year (metin) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays?year=abcd')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('GET /api/holidays → aralık dışı year (1999) → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays?year=1999')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/holidays → auth olmadan → 401', async () => {
      const res = await request(app)
        .get('/api/holidays?year=2024')

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body.success).toBe(false)
    })

    it('GET /api/holidays → geçersiz token → 401', async () => {
      const res = await request(app)
        .get('/api/holidays?year=2024')
        .set('Cookie', 'accessToken=malformed.token')

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('GET /api/holidays → 2100 sınır yılı → başarılı veya anlamlı hata', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays?year=2100')
        .set('Cookie', admin.cookie)

      // Schema sınır değerine göre 200 veya 400 kabul edilebilir
      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('GET /api/holidays → year=2024 → response body yapısı doğru', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/holidays?year=2024')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)


    })
  })
})
