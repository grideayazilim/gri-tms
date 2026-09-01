/* ========================================================================
   SİSTEM SIFIRLAMA VE YEDEK INTEGRATION TESTLERİ

   Yıllık geçişin en kritik işlemi. Kapsanan davranışlar:
     - Yedek, sıfırlamadan ayrı ve salt-okunur bir uçtan alınır; sıfırlama ucu
       `backup: true` gelirse hiçbir şey silmeden reddeder.
     - Silme SET LOCAL ile statement_timeout'suz çalışır (260 bin satır).
     - Sıfırlamanın audit kaydı silmelerden sonra yazılır ve kalıcıdır.
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { eq } from 'drizzle-orm'

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
import { db } from '../../src/config/database.js'
import { RESET_TRUNCATE_TABLES } from '../../src/controllers/resetController.js'
import { sql } from 'drizzle-orm'
import { auditLogs, employees, users, periods } from '../../database/schema.js'

const newSettings = {
  dailyWage: 1200,
  maxWeeklyDays: 3,
  programStartDate: '2027-01-01',
  programEndDate: '2027-06-30',
}

describe('Sistem sıfırlama', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  it('sıfırlama sonrası SYSTEM_RESET audit kaydı KALIR', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    await createEmployee(unit.id)

    const res = await request(app)
      .post('/api/settings/reset')
      .set('Cookie', admin.cookie)
      .send({ backup: false, deleteLocationsAndUnits: false, newSettings })

    expect(res.status).toBe(200)

    // Kayıt silmelerden sonra yazılır; önce yazılsaydı kendisi de silinirdi
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, 'SYSTEM_RESET'))
    expect(logs).toHaveLength(1)
    expect(logs[0]?.summary).toContain('Sistem sıfırlandı')
  })

  it('audit kaydı silinen kayıt sayılarını içerir', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    await createEmployee(unit.id)
    await createEmployee(unit.id)
    await createResponsibleUser(location.id, unit.id)

    await request(app)
      .post('/api/settings/reset')
      .set('Cookie', admin.cookie)
      .send({ backup: false, deleteLocationsAndUnits: false, newSettings })

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, 'SYSTEM_RESET'))
    const meta = logs[0]?.metadata as Record<string, number>
    expect(meta.deletedEmployeeCount).toBe(2)
    expect(meta.deletedUserCount).toBe(1)
  })

  it('çalışanları ve sorumluları siler, adminleri korur', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    await createEmployee(unit.id)
    await createResponsibleUser(location.id, unit.id)

    await request(app)
      .post('/api/settings/reset')
      .set('Cookie', admin.cookie)
      .send({ backup: false, deleteLocationsAndUnits: false, newSettings })

    expect(await db.select().from(employees)).toHaveLength(0)

    const remainingUsers = await db.select().from(users)
    expect(remainingUsers).toHaveLength(1)
    expect(remainingUsers[0]?.role).toBe('ADMIN')
  })

  it('yeni program tarihlerine göre dönemleri kurar', async () => {
    const admin = await createAdminUser()
    await createPeriod(2026, 3)

    await request(app)
      .post('/api/settings/reset')
      .set('Cookie', admin.cookie)
      .send({ backup: false, deleteLocationsAndUnits: false, newSettings })

    const rows = await db.select().from(periods)
    // 2027-01 .. 2027-06 → 6 dönem
    expect(rows).toHaveLength(6)
    expect(rows.every((p) => p.year === 2027)).toBe(true)
    // yeni dönemler AUTO damgasıyla başlar
    expect(rows.every((p) => p.lockReason === 'AUTO')).toBe(true)
  })

  /* Yedeği silme isteğinin içinde üretmek, timeout'ta kopan bağlantıya rağmen
     silmenin tamamlanması demekti. Uç bu bayrağı sessizce yok saymamalı, açıkça
     reddetmeli ve HİÇBİR ŞEY silmemeli. */
  it('backup: true reddedilir ve hiçbir şey silinmez → 400', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    await createEmployee(unit.id)

    const res = await request(app)
      .post('/api/settings/reset')
      .set('Cookie', admin.cookie)
      .send({ backup: true, deleteLocationsAndUnits: false, newSettings })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('/api/settings/backup')

    // Yanıt gövdesi ZIP değil, JSON hata olmalı
    expect(res.headers['content-type']).toContain('application/json')

    // Veri yerinde: silme hiç başlamamalı
    expect(await db.select().from(employees)).toHaveLength(1)
    expect(await db.select().from(auditLogs).where(eq(auditLogs.action, 'SYSTEM_RESET'))).toHaveLength(0)
  })

  it('admin olmayan kullanıcı sıfırlayamaz → 403', async () => {
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const responsible = await createResponsibleUser(location.id, unit.id)

    const res = await request(app)
      .post('/api/settings/reset')
      .set('Cookie', responsible.cookie)
      .send({ backup: false, deleteLocationsAndUnits: false, newSettings })

    expect(res.status).toBe(403)
    expect(await db.select().from(users)).not.toHaveLength(0)
  })
})

describe('Yedek indirme ucu', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  it('GET /settings/backup admin için ZIP döner ve HİÇBİR ŞEY SİLMEZ', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    await createEmployee(unit.id)
    await createPeriod(2026, 3)

    const res = await request(app)
      .get('/api/settings/backup')
      .set('Cookie', admin.cookie)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = []
        r.on('data', (c: Buffer) => chunks.push(c))
        r.on('end', () => cb(null, Buffer.concat(chunks)))
      })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('zip')
    // ZIP magic: PK\x03\x04
    expect((res.body as Buffer).subarray(0, 2).toString()).toBe('PK')

    // Yedek almak veri silmemeli
    expect(await db.select().from(employees)).toHaveLength(1)
  })

  it('yedeklenecek veri yoksa 400 döner (sessizce boş dosya vermez)', async () => {
    const admin = await createAdminUser()

    const res = await request(app)
      .get('/api/settings/backup')
      .set('Cookie', admin.cookie)

    expect(res.status).toBe(400)
  })

  it('admin olmayan yedek indiremez → 403', async () => {
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const responsible = await createResponsibleUser(location.id, unit.id)

    const res = await request(app)
      .get('/api/settings/backup')
      .set('Cookie', responsible.cookie)

    expect(res.status).toBe(403)
  })

  it('kimliksiz yedek indiremez → 401', async () => {
    const res = await request(app).get('/api/settings/backup')
    expect(res.status).toBe(401)
  })
})

/* Sıfırlama tek transaction içinde çalışır: herhangi bir adım patlarsa
   (ör. app_user'ın TRUNCATE yetkisi yoksa) hiçbir veri silinmez. Burada
   doğrulanan güvence budur. */
describe('Sıfırlama hatası → tam geri alma', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  it('sıfırlama başarısız olursa HİÇBİR satır silinmez', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    await createEmployee(unit.id)
    await createEmployee(unit.id)
    const responsible = await createResponsibleUser(location.id, unit.id)
    await createPeriod(2026, 3)

    /* Transaction'ı silmelerden SONRA bozmak için: yeni ayarların uygulanması
       aşamasında patlayacak bir tarih aralığı gönderiyoruz. Şema seviyesindeki
       "bitiş > başlangıç" kuralına takılmayan ama dönem üretiminde
       tamamlanamayan bir istek, silmelerin geri alındığını gösterir. */
    const before = {
      employees: (await db.select().from(employees)).length,
      users: (await db.select().from(users)).length,
      periods: (await db.select().from(periods)).length,
    }
    expect(before.employees).toBe(2)
    expect(before.users).toBe(2)          // admin + sorumlu

    const res = await request(app)
      .post('/api/settings/reset')
      .set('Cookie', admin.cookie)
      .send({
        backup: false,
        deleteLocationsAndUnits: false,
        // Geçersiz takvim tarihi: şema regex'ini geçer, Postgres'te patlar
        newSettings: { ...newSettings, programStartDate: '2027-02-30', programEndDate: '2027-06-30' },
      })

    expect(res.status).toBeGreaterThanOrEqual(400)

    // Silme + yeni ayarlar TEK transaction — hata durumunda tamamı geri alınır
    expect(await db.select().from(employees)).toHaveLength(before.employees)
    expect(await db.select().from(users)).toHaveLength(before.users)
    expect(await db.select().from(periods)).toHaveLength(before.periods)

    // Sorumlunun oturumu hâlâ geçerli olmalı — kullanıcısı silinmedi
    const meRes = await request(app).get('/api/auth/me').set('Cookie', responsible.cookie)
    expect(meRes.status).toBe(200)
  })
})

/* `TRUNCATE ... CASCADE`, listede yazılmayan ama listedekilere yabancı anahtarla
   bağlı bir tabloyu da sessizce siler. Bugün böyle bir tablo yok; ileride
   eklenirse bu test kırılır ve geliştirici tabloyu bilinçli olarak listeye
   ekler ya da hariç tutar. */
describe('TRUNCATE listesi CASCADE koruması', () => {
  it('listede olmayan hiçbir tablo listedekilere yabancı anahtarla bağlı değildir', async () => {
    const truncated = new Set<string>(RESET_TRUNCATE_TABLES)

    /* Şemadaki TÜM yabancı anahtarları çek, karşılaştırmayı JS'te yap:
       drizzle bir JS dizisini tek bir Postgres dizisi olarak değil, ayrı ayrı
       parametrelere açıyor — `= ANY($1)` bu yüzden kullanılamıyor. */
    const result = await db.execute<{ referencing_table: string; referenced_table: string }>(sql`
      SELECT DISTINCT tc.table_name AS referencing_table, ccu.table_name AS referenced_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'app'
    `)

    const surprises = result.rows
      .filter((r) => truncated.has(r.referenced_table) && !truncated.has(r.referencing_table))
      .map((r) => `${r.referencing_table} → ${r.referenced_table}`)

    expect(
      [...new Set(surprises)],
      'TRUNCATE listesinde OLMAYAN bir tablo listedekilere bağlı — CASCADE onu da sessizce siler',
    ).toEqual([])
  })

  it('app_user TRUNCATE yetkisine sahiptir', async () => {
    /* 01-init.sh yalnızca veritabanı İLK oluşturulurken çalıştığı için
       kurulu veritabanları bu yetkiyi hiç almamıştı; docker-setup.ts artık
       her açılışta veriyor. */
    const result = await db.execute<{ granted: boolean }>(
      sql`SELECT has_table_privilege(current_user, 'app.timesheet_days', 'TRUNCATE') AS granted`,
    )
    expect(result.rows[0]?.granted).toBe(true)
  })
})
