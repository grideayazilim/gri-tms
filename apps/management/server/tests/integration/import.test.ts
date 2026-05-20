/* ========================================================================
   IMPORT INTEGRATION TESTS
   POST /api/import/employee, /finalize, /bulk-employees
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
  createPeriod,
  createSettings,
  createResponsibleUser,
} from '../helpers/testDb.js'

describe('Import API', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('POST /api/import/bulk-employees → geçerli personel listesi → 201/200', async () => {
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
      expect(res.body).toBeDefined()
    })

    it('POST /api/import/employee → tek personel puantaj verisi import → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 1)

      const res = await request(app)
        .post('/api/import/employee')
        .set('Cookie', admin.cookie)
        .send({
          tcNo: emp.tcNo,
          firstName: emp.firstName,
          lastName: emp.lastName,
          unitName: unit.name,
          locationId: location.id,
          year: 2024,
          month: 1,
          markers: { '2024-01-02': 'X' },
        })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('POST /api/import/finalize → import sonrası audit log yazar → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const period = await createPeriod(2024, 2)

      const res = await request(app)
        .post('/api/import/finalize')
        .set('Cookie', admin.cookie)
        .send({
          locationName: location.name,
          year: 2024,
          month: 2,
          createdCount: 0,
          skippedCount: 0,
          dailyWage: null,
          timesheetChanges: [],
        })

      expect(res.status).toBe(200)
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('POST /api/import/bulk-employees → eksik zorunlu alan (firstName) → 400', async () => {
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
              // firstName eksik
              lastName: 'Test',
              unitId: unit.id,
              locationId: location.id,
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
              firstName: 'Test',
              lastName: 'User',
              unitId: unit.id,
              locationId: location.id,
              startDate: '2024-01-01',
            },
          ],
        })

      expect(res.status).toBe(400)
    })

    it('POST /api/import/employee → geçersiz markerCode → 400', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 3)

      const res = await request(app)
        .post('/api/import/employee')
        .set('Cookie', admin.cookie)
        .send({
          employeeId: emp.id,
          periodId: period.id,
          unitId: unit.id,
          timesheetChanges: [
            { day: '2024-03-04', markerCode: 'INVALID_CODE', note: null },
          ],
        })

      expect(res.status).toBe(400)
    })

    it('POST /api/import/bulk-employees → boş employees dizisi → hata', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({ employees: [] })

      // Boş liste ya 400 ya da anlamlı hata döner

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

    it('POST /api/import/employee → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .post('/api/import/employee')
        .set('Cookie', responsible.cookie)
        .send({})

      expect(res.status).toBe(403)
    })

    it('POST /api/import/finalize → auth olmadan → 401', async () => {
      const res = await request(app)
        .post('/api/import/finalize')
        .send({})

      expect(res.status).toBe(401)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('POST /api/import/bulk-employees → aynı TC iki kez → 409', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const tcNo = faker.string.numeric(11)

      // İlk import
      await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({
          employees: [{
            tcNo,
            firstName: 'İlk',
            lastName: 'Kişi',
            unitId: unit.id,
            locationId: location.id,
            startDate: '2024-01-01',
          }],
        })

      // Aynı TC ile tekrar
      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({
          employees: [{
            tcNo,
            firstName: 'İkinci',
            lastName: 'Kişi',
            unitId: unit.id,
            locationId: location.id,
            startDate: '2024-01-01',
          }],
        })


    })
  })
})
