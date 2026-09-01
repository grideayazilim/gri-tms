/* ========================================================================
   EŞZAMANLILIK VE SAKLAMA SÜRESİ TESTLERİ

   - Puantaj kaydetmede satır kilitleri deterministik sırada alınır; eşzamanlı
     kaydetmeler deadlock (40P01) üretmemeli.
   - Başarısız girişler her denemede değil, eşik aşıldığında bir kez audit_logs'a
     yazılır.
   - Denetim kayıtları 18 aydan sonra otomatik silinir.
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { eq, sql } from 'drizzle-orm'

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
import { auditLogs, timesheetDays, users } from '../../database/schema.js'
import { auditLogRepo } from '../../src/repositories/auditLogRepo.js'
import { __resetFailedLoginCounters } from '../../src/controllers/authController.js'
import { runNightlyMaintenance } from '../../src/utils/cronJobs.js'

describe('Eşzamanlı puantaj kaydetme', () => {
  beforeEach(async () => {
    await cleanDb()
    await createSettings()
  })

  it('aynı çalışanlara ters sırada eşzamanlı kaydetme deadlock üretmez', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const period = await createPeriod(2026, 3)

    const emps = await Promise.all(
      Array.from({ length: 8 }, () => createEmployee(unit.id)),
    )

    const rowsFor = (list: typeof emps, day: string) =>
      list.map((e) => ({
        employeeId: e.id,
        days: [{ day, markerCode: 'X' as const }],
      }))

    // İki istek AYNI çalışanlara TERS sırada dokunuyor — sıralama olmasaydı
    // klasik deadlock kurgusu (A: 1→2, B: 2→1)
    const forward = request(app)
      .post('/api/timesheets')
      .set('Cookie', admin.cookie)
      .send({ periodId: period.id, timesheets: rowsFor(emps, '2026-03-02') })

    const backward = request(app)
      .post('/api/timesheets')
      .set('Cookie', admin.cookie)
      .send({ periodId: period.id, timesheets: rowsFor([...emps].reverse(), '2026-03-03') })

    const [a, b] = await Promise.all([forward, backward])

    expect([a.status, b.status]).toEqual([200, 200])

    // Her iki günün de yazıldığını doğrula (biri rollback olmamalı)
    const days = await db.select().from(timesheetDays)
    expect(days.length).toBe(emps.length * 2)
  })

  /* Aynı çalışanın İLK puantajını iki kullanıcı aynı anda kaydettiğinde
     benzersizlik kısıtı 23505 veriyor ve kaybeden kullanıcının tüm girişi
     rollback oluyordu ("Bu kayıt zaten mevcut" hatası). */
  it('aynı çalışanın ilk puantajı eşzamanlı kaydedilse de ikisi de başarılı olur', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const period = await createPeriod(2026, 3)
    const emp = await createEmployee(unit.id)

    const save = (day: string) =>
      request(app)
        .post('/api/timesheets')
        .set('Cookie', admin.cookie)
        .send({ periodId: period.id, timesheets: [{ employeeId: emp.id, days: [{ day, markerCode: 'X' }] }] })

    const [a, b] = await Promise.all([save('2026-03-10'), save('2026-03-11')])

    expect(a.status).toBe(200)
    expect(b.status).toBe(200)

    const days = await db.select().from(timesheetDays)
    expect(days.map((d) => d.day).sort()).toEqual(['2026-03-10', '2026-03-11'])
  })

  it('tek kaydetmede tüm günler doğru yazılır (sıralama veriyi bozmuyor)', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const period = await createPeriod(2026, 3)
    const e1 = await createEmployee(unit.id)
    const e2 = await createEmployee(unit.id)

    const res = await request(app)
      .post('/api/timesheets')
      .set('Cookie', admin.cookie)
      .send({
        periodId: period.id,
        timesheets: [
          { employeeId: e2.id, days: [{ day: '2026-03-05', markerCode: 'X' }] },
          { employeeId: e1.id, days: [{ day: '2026-03-06', markerCode: 'X' }] },
        ],
      })

    expect(res.status).toBe(200)

    const days = await db.select().from(timesheetDays)
    expect(days.map((d) => d.day).sort()).toEqual(['2026-03-05', '2026-03-06'])
  })
})

describe('Başarısız giriş audit eşiği', () => {
  beforeEach(async () => {
    await cleanDb()
    __resetFailedLoginCounters()
  })

  async function failLogin(username: string) {
    return request(app)
      .post('/api/auth/login')
      .set('x-test-rate-limit', 'false')
      .send({ username, password: 'kesinlikle-yanlis-sifre' })
  }

  it('ilk 4 başarısız denemede audit kaydı YAZILMAZ', async () => {
    const admin = await createAdminUser()

    for (let i = 0; i < 4; i++) await failLogin(admin.username)
    await new Promise((r) => setTimeout(r, 100))   // fire-and-forget yazımı bekle

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, 'USER_LOGIN_FAILED'))
    expect(logs).toHaveLength(0)
  })

  it('5. denemede TEK kayıt yazılır, sonraki denemeler tekrar yazmaz', async () => {
    const admin = await createAdminUser()

    for (let i = 0; i < 9; i++) await failLogin(admin.username)
    await new Promise((r) => setTimeout(r, 200))

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, 'USER_LOGIN_FAILED'))
    expect(logs).toHaveLength(1)
    expect(logs[0]?.summary).toContain(admin.username)
  })

  it('var olmayan kullanıcı için de aynı eşik uygulanır (kullanıcı adı sızdırmaz)', async () => {
    for (let i = 0; i < 5; i++) await failLogin('hic-olmayan-kullanici')
    await new Promise((r) => setTimeout(r, 200))

    const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, 'USER_LOGIN_FAILED'))
    expect(logs).toHaveLength(1)
  })

  it('başarılı giriş yanıtı başarısızlardan ayırt edilemez (401, tek mesaj)', async () => {
    const admin = await createAdminUser()

    const wrongUser = await failLogin('hic-olmayan-kullanici')
    const wrongPass = await failLogin(admin.username)

    expect(wrongUser.status).toBe(401)
    expect(wrongPass.status).toBe(401)
    expect(wrongUser.body.message).toBe(wrongPass.body.message)
  })
})

describe('Denetim kaydı saklama süresi', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('18 aydan eski kayıtları siler, yenileri korur', async () => {
    await db.insert(auditLogs).values([
      {
        action: 'USER_LOGIN', actorUsername: 'eski', summary: 'eski kayıt',
        createdAt: sql`now() - INTERVAL '20 months'`,
      },
      {
        action: 'USER_LOGIN', actorUsername: 'sinirda', summary: 'sınırda kayıt',
        createdAt: sql`now() - INTERVAL '17 months'`,
      },
      {
        action: 'USER_LOGIN', actorUsername: 'yeni', summary: 'yeni kayıt',
      },
    ])

    const deleted = await auditLogRepo.deleteOlderThan(db, 18)

    expect(deleted).toBe(1)

    const remaining = await db.select().from(auditLogs)
    expect(remaining.map((r) => r.actorUsername).sort()).toEqual(['sinirda', 'yeni'])
  })

  it('silinecek kayıt yoksa 0 döner', async () => {
    await db.insert(auditLogs).values({
      action: 'USER_LOGIN', actorUsername: 'yeni', summary: 'yeni kayıt',
    })

    expect(await auditLogRepo.deleteOlderThan(db, 18)).toBe(0)
  })

  it('filtresiz listeleme tahmini sayım kullanır ama kayıtları doğru döner', async () => {
    const admin = await createAdminUser()
    await db.insert(auditLogs).values(
      Array.from({ length: 5 }, (_, i) => ({
        action: 'USER_LOGIN' as const, actorUsername: `user${i}`, summary: `kayıt ${i}`,
      })),
    )

    const res = await request(app)
      .get('/api/audit-logs')
      .set('Cookie', admin.cookie)

    expect(res.status).toBe(200)
    expect(res.body.data.auditLogs.length).toBeGreaterThanOrEqual(5)
    expect(res.body.data.pagination).toBeDefined()
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   Süre dolması sistemi yöneticisiz bırakmamalı.

   Silme ve rol düşürme yollarını `assertNotLastAdmin` koruyor, ama gece
   bakımı kimseye sormadan çalışır: rol filtresi olmasaydı süresi geçmiş tek
   admin sessizce EXPIRED olur, kimse giriş yapamaz ve tek kurtarma yolu elle
   SQL olurdu.
   ───────────────────────────────────────────────────────────────────────── */
describe('Gece bakımı — admin koruması', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('süresi geçmiş ADMIN hesabını EXPIRED yapmaz', async () => {
    const admin = await createAdminUser()
    await db.update(users)
      .set({ expiryDate: sql`current_date - INTERVAL '1 day'` })
      .where(eq(users.id, admin.id))

    await runNightlyMaintenance()

    const [row] = await db.select().from(users).where(eq(users.id, admin.id))
    expect(row?.status).toBe('ACTIVE')
  })

  it('süresi geçmiş SORUMLU hesabını EXPIRED yapmaya devam eder', async () => {
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const responsible = await createResponsibleUser(location.id, unit.id)
    await db.update(users)
      .set({ expiryDate: sql`current_date - INTERVAL '1 day'` })
      .where(eq(users.id, responsible.id))

    await runNightlyMaintenance()

    const [row] = await db.select().from(users).where(eq(users.id, responsible.id))
    expect(row?.status).toBe('EXPIRED')
  })
})
