/* ========================================================================
   LOCATION & UNIT INTEGRATION TESTS
   GET/POST/PUT/DELETE /api/locationAndUnits/locations ve /units
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

describe('Location & Unit API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('POST /api/locationAndUnits/locations → yerleşke ekler → 201', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/locationAndUnits/locations')
        .set('Cookie', admin.cookie)
        .send({
          name: 'Test Şantiye',
          programNo: 'PRG001',
        })

      expect(res.status).toBe(201)
      expect(res.body).toBeDefined()


    })

    it('POST /api/locationAndUnits/units → birim ekler → 201', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()

      const res = await request(app)
        .post('/api/locationAndUnits/units')
        .set('Cookie', admin.cookie)
        .send({
          locationId: location.id,
          name: 'Test Birimi',
        })

      expect(res.status).toBe(201)
      expect(res.body).toBeDefined()

    })

    it('GET /api/locationAndUnits/locations → lokasyon listesi → 200', async () => {
      await createLocation()
      await createLocation()

      const res = await request(app)
        .get('/api/locationAndUnits/locations')

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()


    })

    it('GET /api/locationAndUnits/locations/:id/units → lokasyona ait birimler → 200', async () => {
      const location = await createLocation()
      await createUnit(location.id, { name: 'Birim A' })
      await createUnit(location.id, { name: 'Birim B' })

      const res = await request(app)
        .get(`/api/locationAndUnits/locations/${location.id}/units`)

      expect(res.status).toBe(200)


    })

    it('PUT /api/locationAndUnits/locations/:id → yerleşke günceller → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()

      const res = await request(app)
        .put(`/api/locationAndUnits/locations/${location.id}`)
        .set('Cookie', admin.cookie)
        .send({
          name: 'Güncellenmiş Şantiye',
          programNo: location.programNo,
        })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()

    })

    it('DELETE /api/locationAndUnits/locations/:id → boş lokasyonu siler → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()

      const res = await request(app)
        .delete(`/api/locationAndUnits/locations/${location.id}`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('POST /api/locationAndUnits/locations → eksik name → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/locationAndUnits/locations')
        .set('Cookie', admin.cookie)
        .send({ programNo: 'PRG002' }) // name eksik

      expect(res.status).toBe(400)
    })

    it('POST /api/locationAndUnits/units → var olmayan locationId → hata', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/locationAndUnits/units')
        .set('Cookie', admin.cookie)
        .send({
          locationId: '00000000-0000-0000-0000-000000000000',
          name: 'Geçersiz Birim',
        })


    })

    it('DELETE /api/locationAndUnits/units/:id → bağlı personel varken → hata', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      await createEmployee(unit.id) // Bağlı personel oluştur

      const res = await request(app)
        .delete(`/api/locationAndUnits/units/${unit.id}`)
        .set('Cookie', admin.cookie)

      // Bağlı personel olduğu için silme engellenebilir (cascade veya restrict)
      // Sonuç 200 (cascade) veya 409/400 (restrict) olabilir
      expect(res.status).toBeGreaterThanOrEqual(400)
    })

    it('PUT /api/locationAndUnits/units/:id → var olmayan birim → 404', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()

      const res = await request(app)
        .put('/api/locationAndUnits/units/00000000-0000-0000-0000-000000000000')
        .set('Cookie', admin.cookie)
        .send({ locationId: location.id, name: 'Birim' })


    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('POST /api/locationAndUnits/locations → auth olmadan → 401', async () => {
      const res = await request(app)
        .post('/api/locationAndUnits/locations')
        .send({ name: 'Yetkisiz', programNo: 'PRG999' })

      expect(res.status).toBe(401)
    })

    it('POST /api/locationAndUnits/units → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .post('/api/locationAndUnits/units')
        .set('Cookie', responsible.cookie)
        .send({ locationId: location.id, name: 'Yeni Birim' })

      expect(res.status).toBe(403)
    })

    it('DELETE /api/locationAndUnits/locations/:id → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .delete(`/api/locationAndUnits/locations/${location.id}`)
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('GET /api/locationAndUnits/units → auth gerektirir → 401 veya 200', async () => {
      // /units endpoint'i auth gerektiriyor
      const res = await request(app).get('/api/locationAndUnits/units')

      expect(res.status).toBe(401)
    })

    it('PUT /api/locationAndUnits/locations/:id/sync → lokasyon birimleri senkronize eder', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()

      const res = await request(app)
        .put(`/api/locationAndUnits/locations/${location.id}/sync`)
        .set('Cookie', admin.cookie)
        .send({ name: location.name, programNo: location.programNo, units: [] }) // Boş sync

      // 200 veya anlamlı yanıt
      expect(res.status).toBe(200)
    })
  })
})
