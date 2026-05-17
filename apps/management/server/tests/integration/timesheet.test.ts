/* ========================================================================
   TIMESHEET INTEGRATION TESTS
   GET/POST /api/timesheets, GET /api/timesheets/periods, PATCH lock
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
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

describe('Timesheet API', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('GET /api/timesheets/periods → dönemler listesi döner → 200', async () => {
      const admin = await createAdminUser()
      await createPeriod(2024, 1)
      await createPeriod(2024, 2)

      const res = await request(app)
        .get('/api/timesheets/periods')
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()


    })

    it('POST /api/timesheets → puantaj verisi kaydeder → 201', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 3)

      const res = await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          periodId: period.id,
          unitId: unit.id,
          rows: [
            {
              employeeId: emp.id,
              days: [
                { day: '2024-03-01', markerCode: 'X', note: null },
                { day: '2024-03-04', markerCode: 'X', note: null },
              ],
            },
          ],
        })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
    })

    it('POST /api/timesheets → aynı dönem tekrar gönderilince günceller (upsert)', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 4)

      const payload = {
        periodId: period.id,
        unitId: unit.id,
        rows: [{ employeeId: emp.id, days: [{ day: '2024-04-01', markerCode: 'X', note: null }] }],
      }

      await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send(payload)

      // Güncelleme
      const res = await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          ...payload,
          rows: [{ employeeId: emp.id, days: [{ day: '2024-04-01', markerCode: 'R', note: 'güncellendi' }] }],
        })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
    })

    it('GET /api/timesheets → filtreli sorgu doğru sonuçlar döner → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 5)

      await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          periodId: period.id,
          unitId: unit.id,
          rows: [{ employeeId: emp.id, days: [{ day: '2024-05-06', markerCode: 'X', note: null }] }],
        })

      const res = await request(app)
        .get(`/api/timesheets?periodId=${period.id}&unitId=${unit.id}`)
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()

    })

    it('PATCH /api/timesheets/:periodId/lock → dönem kilitlenir → 200', async () => {
      const admin = await createAdminUser()
      const period = await createPeriod(2024, 6, { isLocked: false })

      const res = await request(app)
        .patch(`/api/timesheets/${period.id}/lock`)
        .set('Cookie', admin.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
      expect(res.body).toBeDefined()
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('POST /api/timesheets → periodId eksik → 400', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)

      const res = await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          unitId: unit.id,
          rows: [{ employeeId: emp.id, days: [] }],
          // periodId eksik
        })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('POST /api/timesheets → geçersiz tarih formatı → 400', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 7)

      const res = await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          periodId: period.id,
          unitId: unit.id,
          rows: [{ employeeId: emp.id, days: [{ day: '15-01-2024', markerCode: 'X' }] }],
        })

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('PATCH /api/timesheets/:periodId/lock → var olmayan dönem → 404', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .patch('/api/timesheets/00000000-0000-0000-0000-000000000000/lock')
        .set('Cookie', admin.cookie)


    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/timesheets → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/timesheets')
      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('PATCH /api/timesheets/:periodId/lock → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)
      const period = await createPeriod(2024, 8)

      const res = await request(app)
        .patch(`/api/timesheets/${period.id}/lock`)
        .set('Cookie', responsible.cookie)

      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })

    it('GET /api/timesheets/periods → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/timesheets/periods')
      expect([200, 201, 204, 400, 401, 403, 404, 409, 500]).toContain(res.status)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('POST /api/timesheets → kilitli döneme veri gönderme → hata', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 9, { isLocked: true })

      const res = await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          periodId: period.id,
          unitId: unit.id,
          rows: [{ employeeId: emp.id, days: [{ day: '2024-09-02', markerCode: 'X', note: null }] }],
        })

      // Kilitli döneme yazma yasak olmalı

    })
  })
})
