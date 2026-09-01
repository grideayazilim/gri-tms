/* ========================================================================
   ZORUNLU ŞİFRE DEĞİŞİMİ INTEGRATION TESTLERİ

   Seed admin'i `must_change_password = true` ile oluşturuluyor. Bu bayrak
   açıkken kullanıcı giriş yapabilir ama şifresini değiştirene kadar başka
   hiçbir API'yi kullanamaz. Kapı sunucu tarafında — arayüzdeki modal tek
   başına curl ile baypas edilebilirdi.
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'

import app from '../../src/app.js'
import { cleanDb, createAdminUser } from '../helpers/testDb.js'
import { db } from '../../src/config/database.js'
import { users } from '../../database/schema.js'

/** must_change_password = true olan, varsayılan zayıf şifreli bir admin. */
async function createGatedAdmin(password = '1234') {
  const passwordHash = await bcrypt.hash(password, 10)
  const [user] = await db.insert(users).values({
    username: `seedadmin_${Date.now()}`,
    passwordHash,
    role: 'ADMIN',
    status: 'ACTIVE',
    mustChangePassword: true,
  }).returning()
  if (!user) throw new Error('Test kullanıcısı oluşturulamadı')
  return { id: user.id, username: user.username, password }
}

async function loginAs(username: string, password: string): Promise<string[]> {
  const res = await request(app).post('/api/auth/login').send({ username, password })
  expect(res.status).toBe(200)
  return res.headers['set-cookie'] as unknown as string[]
}

describe('Zorunlu şifre değişimi', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('login başarılı olur ve mustChangePassword bayrağını döndürür', async () => {
    const admin = await createGatedAdmin()

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: admin.username, password: admin.password })

    expect(res.status).toBe(200)
    expect(res.body.data.user.mustChangePassword).toBe(true)
  })

  it('bayrak açıkken korumalı uçlara erişilemez → 403', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    for (const path of ['/api/employees', '/api/users', '/api/audit-logs', '/api/settings/system']) {
      const res = await request(app).get(path).set('Cookie', cookies)
      expect(res.status).toBe(403)
      expect(res.body.code).toBe('PASSWORD_CHANGE_REQUIRED')
    }
  })

  it('bayrak açıkken export ucundan veri sızmaz → 403', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    const res = await request(app)
      .get('/api/export/timesheet')
      .query({ locationId: '3f2504e0-4f89-11d3-9a0c-0305e82c3301', year: 2026, month: 3 })
      .set('Cookie', cookies)

    expect(res.status).toBe(403)
  })

  it('/api/auth/me bayrak açıkken de çalışır (modal bilgisi için)', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    const res = await request(app).get('/api/auth/me').set('Cookie', cookies)

    expect(res.status).toBe(200)
    expect(res.body.data.user.mustChangePassword).toBe(true)
  })

  it('şifre değiştirilince bayrak temizlenir ve API açılır', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    const change = await request(app)
      .post('/api/auth/change-initial-password')
      .set('Cookie', cookies)
      .send({ newPassword: 'Guclu-Sifre-2026', newPasswordConfirm: 'Guclu-Sifre-2026' })

    expect(change.status).toBe(200)
    expect(change.body.data.user.mustChangePassword).toBe(false)

    // Yeni cookie'ler ile artık korumalı uçlar açılmalı
    const newCookies = change.headers['set-cookie'] as unknown as string[]
    const users2 = await request(app).get('/api/users').set('Cookie', newCookies)
    expect(users2.status).toBe(200)
  })

  it('değişim sonrası eski şifreyle giriş yapılamaz', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    await request(app)
      .post('/api/auth/change-initial-password')
      .set('Cookie', cookies)
      .send({ newPassword: 'Guclu-Sifre-2026', newPasswordConfirm: 'Guclu-Sifre-2026' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: admin.username, password: '1234' })

    expect(res.status).toBe(401)
  })

  it('aynı şifre tekrar konulamaz → 400', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    const res = await request(app)
      .post('/api/auth/change-initial-password')
      .set('Cookie', cookies)
      .send({ newPassword: '1234', newPasswordConfirm: '1234' })

    // Şifre politikası zaten '1234'ü reddeder (10 karakter kuralı)
    expect(res.status).toBe(400)
  })

  it('politikaya uyan ama mevcut şifreyle aynı olan şifre reddedilir → 400', async () => {
    const admin = await createGatedAdmin('Mevcut-Sifre-2026')
    const cookies = await loginAs(admin.username, admin.password)

    const res = await request(app)
      .post('/api/auth/change-initial-password')
      .set('Cookie', cookies)
      .send({ newPassword: 'Mevcut-Sifre-2026', newPasswordConfirm: 'Mevcut-Sifre-2026' })

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('aynı olamaz')
  })

  it('şifreler eşleşmiyorsa reddedilir → 400', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    const res = await request(app)
      .post('/api/auth/change-initial-password')
      .set('Cookie', cookies)
      .send({ newPassword: 'Guclu-Sifre-2026', newPasswordConfirm: 'Baska-Sifre-2026' })

    expect(res.status).toBe(400)
  })

  it('bayrağı olmayan kullanıcı bu ucu kullanamaz → 400', async () => {
    const admin = await createAdminUser()
    const cookies = await loginAs(admin.username, admin.password)

    const res = await request(app)
      .post('/api/auth/change-initial-password')
      .set('Cookie', cookies)
      .send({ newPassword: 'Guclu-Sifre-2026', newPasswordConfirm: 'Guclu-Sifre-2026' })

    expect(res.status).toBe(400)
  })

  it('token olmadan şifre değiştirilemez → 401', async () => {
    const res = await request(app)
      .post('/api/auth/change-initial-password')
      .send({ newPassword: 'Guclu-Sifre-2026', newPasswordConfirm: 'Guclu-Sifre-2026' })

    expect(res.status).toBe(401)
  })

  it('şifre değişimi token_version artırır (eski oturumlar düşer)', async () => {
    const admin = await createGatedAdmin()
    const cookies = await loginAs(admin.username, admin.password)

    const before = await db.select().from(users).where(eq(users.id, admin.id))

    await request(app)
      .post('/api/auth/change-initial-password')
      .set('Cookie', cookies)
      .send({ newPassword: 'Guclu-Sifre-2026', newPasswordConfirm: 'Guclu-Sifre-2026' })

    const after = await db.select().from(users).where(eq(users.id, admin.id))
    expect(after[0]!.tokenVersion).toBe(before[0]!.tokenVersion + 1)

    // Eski refresh cookie artık geçersiz olmalı
    const refresh = await request(app).post('/api/auth/refresh').set('Cookie', cookies)
    expect(refresh.status).toBe(401)
  })
})
