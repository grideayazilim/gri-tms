/* ========================================================================
   IMPORT INTEGRATION TESTS
   POST /api/import/bulk-employees
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
  createSettings,
} from '../helpers/testDb.js'

describe('Import API', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('POST /api/import/bulk-employees → geçerli personel listesi → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({
          employees: [
            {
              tcNo: faker.string.numeric(11),
              fullName: 'İmport Testi',
              ibanNo: 'TR' + faker.string.numeric(24),
              unitName: unit.name,
              locationName: location.name,
              startDate: '2024-01-01',
            },
          ],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.successCount).toBe(1)
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('POST /api/import/bulk-employees → eksik zorunlu alan (fullName) → 400', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({
          employees: [
            {
              tcNo: faker.string.numeric(11),
              // fullName eksik
              unitName: unit.name,
              locationName: location.name,
              startDate: '2024-01-01',
            },
          ],
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('POST /api/import/bulk-employees → geçersiz TC (10 hane) → 400', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({
          employees: [
            {
              tcNo: '1234567890', // 10 hane (geçersiz)
              fullName: 'Test User',
              unitName: unit.name,
              locationName: location.name,
              startDate: '2024-01-01',
              ibanNo: 'TR' + faker.string.numeric(24),
            },
          ],
        })

      expect(res.status).toBe(400)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('POST /api/import/bulk-employees → auth olmadan → 401', async () => {
      const res = await request(app)
        .post('/api/import/bulk-employees')
        .send({ employees: [] })

      expect(res.status).toBe(401)
    })
  })
})
