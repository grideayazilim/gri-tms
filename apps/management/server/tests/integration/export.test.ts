/* ========================================================================
   EXPORT INTEGRATION TESTS
   GET /api/export/timesheet, GET /api/export/bot
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
} from '../helpers/testDb.js'

// Excel (OOXML) dosyası ZIP formatında başlar: PK\x03\x04
const XLSX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04])

describe('Export API', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('GET /api/export/timesheet → 200 + OOXML content-type döner', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 1)

      // Önce puantaj verisi ekle
      await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          periodId: period.id,
          unitId: unit.id,
          rows: [{ employeeId: emp.id, days: [{ day: '2024-01-02', markerCode: 'X', note: null }] }],
        })

      const res = await request(app)
        .get(`/api/export/timesheet?locationId=${location.id}&year=2024&month=1`)
        .set('Cookie', admin.cookie)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = []
          res.on('data', (chunk: Buffer) => chunks.push(chunk))
          res.on('end', () => callback(null, Buffer.concat(chunks)))
        })

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('application/vnd.openxmlformats')
    })

    it('GET /api/export/timesheet → dönen buffer geçerli Excel dosyası (ZIP magic)', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const emp = await createEmployee(unit.id)
      const period = await createPeriod(2024, 2)

      await request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({
          periodId: period.id,
          unitId: unit.id,
          rows: [{ employeeId: emp.id, days: [{ day: '2024-02-01', markerCode: 'X', note: null }] }],
        })

      const res = await request(app)
        .get(`/api/export/timesheet?locationId=${location.id}&year=2024&month=2`)
        .set('Cookie', admin.cookie)
        .responseType('arraybuffer')

      expect(res.status).toBe(200)
      const buf = Buffer.from(res.body as ArrayBuffer)
      // ZIP header kontrolü (XLSX = ZIP)
      expect(buf.slice(0, 4)).toEqual(XLSX_MAGIC)
    })

    it('GET /api/export/bot → 200 + Excel buffer döner', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      await createEmployee(unit.id)
      await createPeriod(2024, 3)

      const res = await request(app)
        .get(`/api/export/bot?locationId=${location.id}&year=2024&month=3`)
        .set('Cookie', admin.cookie)
        .responseType('arraybuffer')

      expect(res.status).toBe(200)
    })

    it('GET /api/export/timesheet → boş veri ile → 200 (boş Excel)', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      // Unit yok, puantaj yok

      const res = await request(app)
        .get(`/api/export/timesheet?locationId=${location.id}&year=2024&month=4`)
        .set('Cookie', admin.cookie)
        .responseType('arraybuffer')

      // Boş veri ile de başarılı export beklenir (ya 200 ya anlamlı hata)
      expect(res.status).toBe(200)
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('GET /api/export/timesheet → locationId eksik → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/export/timesheet?year=2024&month=1')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(400)
    })

    it('GET /api/export/timesheet → geçersiz month (0) → 400', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()

      const res = await request(app)
        .get(`/api/export/timesheet?locationId=${location.id}&year=2024&month=0`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(400)
    })

    it('GET /api/export/bot → eksik parametreler → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/export/bot')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(400)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/export/timesheet → auth olmadan → 401', async () => {
      const res = await request(app)
        .get('/api/export/timesheet?locationId=xxx&year=2024&month=1')

      expect(res.status).toBe(401)
    })

    it('GET /api/export/bot → auth olmadan → 401', async () => {
      const res = await request(app)
        .get('/api/export/bot?locationId=xxx&year=2024&month=1')

      expect(res.status).toBe(401)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('GET /api/export/timesheet → geçersiz UUID formatı locationId → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/export/timesheet?locationId=not-a-uuid&year=2024&month=1')
        .set('Cookie', admin.cookie)


    })
  })
})
