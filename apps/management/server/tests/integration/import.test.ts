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
import { db } from '../../src/config/database.js'
import { employees } from '../../database/schema.js'

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

  /* ─── Hata Senaryoları (Validation) ────────────────────────────────────
     Doğrulama satır bazlıdır: istek 200 döner, hatalı satır rapora yazılır ve
     geçerli satırlar eklenir. */
  describe('Hata senaryoları (satır bazlı doğrulama)', () => {
    it('eksik zorunlu alan (fullName) → 200 + satır rapora yazılır', async () => {
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

      expect(res.status).toBe(200)
      expect(res.body.data.successCount).toBe(0)
      expect(res.body.data.failures).toHaveLength(1)
      expect(res.body.data.failures[0].row).toBe(2)
      expect(res.body.data.failures[0].error).toBeTruthy()
    })

    it('geçersiz TC (10 hane) → 200 + gerçek hata mesajı rapora yazılır', async () => {
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

      expect(res.status).toBe(200)
      expect(res.body.data.failures).toHaveLength(1)
      // Kullanıcı hangi satırın neden hatalı olduğunu görmeli
      expect(res.body.data.failures[0].error).toBe('TC No 11 haneli rakam olmalıdır')
      expect(res.body.data.failures[0].name).toBe('Test User')
    })

    // Dizi sınırı ihlali hâlâ 400 — bu bir istemci hatasıdır, veri hatası değil
    it('boş employees dizisi → 400', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({ employees: [] })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('500 satırdan fazlası → 400', async () => {
      const admin = await createAdminUser()
      const employeesPayload = Array.from({ length: 501 }, () => ({}))

      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({ employees: employeesPayload })

      expect(res.status).toBe(400)
    })
  })

  /* 11 satırlık dosyanın yalnızca 1 satırında geçersiz TC varsa, geçerli 10
     satır eklenmeli ve hatalı satır rapora yazılmalı. */
  describe('Kısmi başarı — 1 hatalı + 10 geçerli satır', () => {
    it('10 kayıt eklenir, hatalı satır numarası ve gerçek mesajla rapora yazılır', async () => {
      const admin = await createAdminUser()
      const location = await createLocation({ name: 'MERKEZ' })
      await createUnit(location.id, { name: 'BIRIM A' })

      const row = (tcNo: string, fullName: string) => ({
        tcNo,
        fullName,
        locationName: 'MERKEZ',
        unitName: 'BIRIM A',
        ibanNo: 'TR' + '1'.repeat(24),
        startDate: '2026-02-01',
      })

      const payload = [
        ...Array.from({ length: 5 }, (_, i) => row(`1000000000${i}`, `GECERLI ${i + 1}`)),
        row('GECERSIZ', 'AHMET YILMAZ'),           // 7. satır (index 5 → row 7)
        ...Array.from({ length: 5 }, (_, i) => row(`2000000000${i}`, `GECERLI ${i + 6}`)),
      ]
      expect(payload).toHaveLength(11)

      const res = await request(app)
        .post('/api/import/bulk-employees')
        .set('Cookie', admin.cookie)
        .send({ employees: payload })

      expect(res.status).toBe(200)
      expect(res.body.data.successCount).toBe(10)
      expect(res.body.data.failures).toHaveLength(1)
      expect(res.body.data.failures[0].row).toBe(7)
      expect(res.body.data.failures[0].name).toBe('AHMET YILMAZ')
      expect(res.body.data.failures[0].error).toBe('TC No 11 haneli rakam olmalıdır')

      // Geçerli satırlar gerçekten yazılmış olmalı
      expect(await db.select().from(employees)).toHaveLength(10)
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

/* ─────────────────────────────────────────────────────────────────────────
   Toplu import: tek bozuk satır tüm partiyi çöpe atmamalı.
   PostgreSQL'de bir statement hata verirse tüm transaction ABORTED olur;
   SAVEPOINT her satırı izole eder.
   ───────────────────────────────────────────────────────────────────────── */
describe('Toplu import satır izolasyonu', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('çakışan TC olan satır atlanır, diğerleri yazılır', async () => {
    const admin = await createAdminUser()
    const location = await createLocation({ name: 'MERKEZ' })
    const unit = await createUnit(location.id, { name: 'BIRIM A' })
    void unit

    const duplicateTc = '11111111111'
    const payload = (tc: string, name: string) => ({
      tcNo: tc,
      fullName: name,
      locationName: 'MERKEZ',
      unitName: 'BIRIM A',
      ibanNo: 'TR' + '1'.repeat(24),
      startDate: '2026-02-01',
    })

    // İlk parti — hepsi başarılı
    const first = await request(app)
      .post('/api/import/bulk-employees')
      .set('Cookie', admin.cookie)
      .send({ employees: [payload(duplicateTc, 'AHMET YILMAZ')] })
    expect(first.status).toBe(200)
    expect(first.body.data.successCount).toBe(1)

    // İkinci parti — 2. satır çakışıyor; 1. ve 3. satır yine de yazılmalı
    const second = await request(app)
      .post('/api/import/bulk-employees')
      .set('Cookie', admin.cookie)
      .send({
        employees: [
          payload('22222222222', 'MEHMET DEMIR'),
          payload(duplicateTc, 'AHMET YILMAZ'),
          payload('33333333333', 'AYSE KAYA'),
        ],
      })

    expect(second.status).toBe(200)
    expect(second.body.data.successCount).toBe(2)
    expect(second.body.data.failures).toHaveLength(1)
    expect(second.body.data.failures[0].row).toBe(3)

    // DB'de gerçekten 3 kayıt olmalı (1 + 2)
    const rows = await db.select().from(employees)
    expect(rows).toHaveLength(3)
  })

  it('hata mesajı ham Postgres detayı sızdırmaz', async () => {
    const admin = await createAdminUser()
    const location = await createLocation({ name: 'MERKEZ' })
    await createUnit(location.id, { name: 'BIRIM A' })

    const res = await request(app)
      .post('/api/import/bulk-employees')
      .set('Cookie', admin.cookie)
      .send({
        employees: [{
          tcNo: '44444444444',
          fullName: 'AHMET YILMAZ',
          locationName: 'OLMAYAN YERLESKE',
          unitName: 'BIRIM A',
          ibanNo: 'TR' + '1'.repeat(24),
          startDate: '2026-02-01',
        }],
      })

    expect(res.status).toBe(200)
    const raw = JSON.stringify(res.body)
    expect(raw).not.toContain('constraint')
    expect(raw).not.toContain('violates')
    expect(raw).not.toContain('app.employees')
  })

  /* Bozuk tarih hâlâ Zod tarafından yakalanıyor (Postgres'e ulaşıp
     22007 ile transaction'ı ABORT etmiyor), ama artık TÜM isteği 400 yapmıyor —
     yalnızca o satır rapora yazılıyor. */
  it('bozuk tarih formatı Zod tarafından yakalanır → satır hatası', async () => {
    const admin = await createAdminUser()

    const res = await request(app)
      .post('/api/import/bulk-employees')
      .set('Cookie', admin.cookie)
      .send({
        employees: [{
          tcNo: '55555555555',
          fullName: 'AHMET YILMAZ',
          locationName: 'MERKEZ',
          startDate: '01.02.2026',
        }],
      })

    expect(res.status).toBe(200)
    expect(res.body.data.successCount).toBe(0)
    expect(res.body.data.failures).toHaveLength(1)
    expect(res.body.data.failures[0].error).toContain('YYYY-MM-DD')
  })

  it('500 kayıt üst sınırı aşılırsa reddedilir → 400', async () => {
    const admin = await createAdminUser()

    const employeesPayload = Array.from({ length: 501 }, (_, i) => ({
      tcNo: String(10000000000 + i),
      fullName: 'AHMET YILMAZ',
      locationName: 'MERKEZ',
    }))

    const res = await request(app)
      .post('/api/import/bulk-employees')
      .set('Cookie', admin.cookie)
      .send({ employees: employeesPayload })

    expect(res.status).toBe(400)
  })
})
