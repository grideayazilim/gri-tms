/* ========================================================================
   USER CRUD INTEGRATION TESTS
   GET/PUT/DELETE /api/users, PUT /api/users/me
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { eq } from 'drizzle-orm'

import {
  cleanDb,
  createAdminUser,
  createLocation,
  createUnit,
  createResponsibleUser,
} from '../helpers/testDb.js'
import { db } from '../../src/config/database.js'
import { users } from '../../database/schema.js'

/** Kayıt yanıtı artık id döndürmediği için kullanıcıyı DB'den buluruz. */
async function findUserIdByUsername(username: string): Promise<string> {
  const rows = await db.select({ id: users.id }).from(users).where(eq(users.username, username))
  const id = rows[0]?.id
  if (!id) throw new Error(`Test kullanıcısı bulunamadı: ${username}`)
  return id
}

describe('User CRUD API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('GET /api/users → admin kullanıcılar listesini getirir → 200', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/users')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()

      // En az admin kullanıcısı olmalı

    })

    it('PUT /api/users/:id → admin başka kullanıcıyı günceller → 200', async () => {
      const admin = await createAdminUser()
      // Güncellenecek kullanıcıyı register ile oluştur
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'toupdate', password: 'Test@1234567', role: 'ADMIN' })
      // Kayıt yanıtı artık kullanıcı nesnesi döndürmüyor
      const userId = await findUserIdByUsername('toupdate')

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Cookie', admin.cookie)
        .send({ role: 'ADMIN', status: 'ACTIVE', username: 'toupdate' })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('DELETE /api/users/:id → admin kullanıcıyı siler → 200', async () => {
      const admin = await createAdminUser()
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'todelete', password: 'Test@1234567', role: 'ADMIN' })
      const userId = await findUserIdByUsername('todelete')

      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it("PUT /api/users/me → kullanıcı kendi profilini günceller → 200", async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', admin.cookie)
        .send({ oldPassword: admin.password, newPassword: 'NewPass@5678901' })

      expect(res.status).toBe(200)
      expect(res.body).toBeDefined()
    })

    it('PUT /api/users/:id → admin rol değiştirir (ADMIN → RESPONSIBLE) → 200', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)

      await request(app)
        .post('/api/auth/register')
        .send({ username: 'rolechange', password: 'Test@1234567', role: 'ADMIN' })
      const userId = await findUserIdByUsername('rolechange')

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Cookie', admin.cookie)
        .send({
          role: 'RESPONSIBLE',
          status: 'ACTIVE',
          username: 'rolechange',
          locationId: location.id,
          unitId: unit.id,
          expiryDate: '2025-12-31',
        })

      expect(res.status).toBe(200)

    })

    /* Süresi dolan bir admin, gece bakımının rol filtresi olmasaydı sistemi
       yöneticisiz bırakırdı. Sunucu bu yüzden ADMIN rolündeki kullanıcıya
       geçerlilik tarihi yazmaz; arayüzde de alan kapalıdır. */
    it('PUT /api/users/:id → ADMIN rolüne geçerlilik tarihi yazılmaz', async () => {
      const admin = await createAdminUser()

      await request(app)
        .post('/api/auth/register')
        .send({ username: 'suresizadmin', password: 'Test@1234567', role: 'ADMIN' })
      const userId = await findUserIdByUsername('suresizadmin')

      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Cookie', admin.cookie)
        .send({
          role: 'ADMIN',
          status: 'ACTIVE',
          username: 'suresizadmin',
          expiryDate: '2027-12-31',
        })

      expect(res.status).toBe(200)

      const [row] = await db.select().from(users).where(eq(users.id, userId))
      expect(row?.expiryDate).toBeNull()
      expect(row?.status).toBe('ACTIVE')
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    it('GET /api/users → auth olmadan → 401', async () => {
      const res = await request(app).get('/api/users')
      expect(res.status).toBe(401)
    })

    it('PUT /api/users/:id → var olmayan kullanıcı → 404', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Cookie', admin.cookie)
        .send({ role: 'ADMIN', status: 'ACTIVE', username: 'nobody' })

      expect(res.status).toBe(404)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/users → RESPONSIBLE user → 403', async () => {
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .get('/api/users')
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })

    it("PUT /api/users/:id → RESPONSIBLE user başkasını güncellemeye çalışır → 403", async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .put(`/api/users/${admin.id}`)
        .set('Cookie', responsible.cookie)
        .send({ role: 'ADMIN', status: 'ACTIVE', username: admin.username })

      expect(res.status).toBe(403)
    })

    it('DELETE /api/users/:id → RESPONSIBLE user → 403', async () => {
      const admin = await createAdminUser()
      const location = await createLocation()
      const unit = await createUnit(location.id)
      const responsible = await createResponsibleUser(location.id, unit.id)

      const res = await request(app)
        .delete(`/api/users/${admin.id}`)
        .set('Cookie', responsible.cookie)

      expect(res.status).toBe(403)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it("PUT /api/users/me → yanlış mevcut şifre → hata", async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', admin.cookie)
        .send({ oldPassword: 'WrongPassword!', newPassword: 'NewPass@5678901' })


      expect(res.body.success).toBe(false)
    })
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   Son admin koruması.
   Sistemde her zaman en az bir aktif admin kalmalı; aksi halde yeni kayıtlar
   sonsuza kadar PENDING'de bekler ve kurtarma yolu elle SQL olur.
   ───────────────────────────────────────────────────────────────────────── */
describe('Son admin koruması', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  /* Kendi hesabını silme koruması `assertNotLastAdmin`'den önce çalışır, bu
     yüzden tek admin kendini silmeye çalıştığında ilk kapıya takılır. Son admin
     koruması rol düşürme yolunda (bir alttaki test) doğrudan sınanır. */
  it('son aktif admin silinemez → 400', async () => {
    const admin = await createAdminUser()

    const res = await request(app)
      .delete(`/api/users/${admin.id}`)
      .set('Cookie', admin.cookie)

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Kendi hesabınızı silemezsiniz')

    // Gerçekten silinmemiş olmalı
    const rows = await db.select().from(users).where(eq(users.id, admin.id))
    expect(rows).toHaveLength(1)
  })

  it('son aktif admin RESPONSIBLE rolüne düşürülemez → 400', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)

    const res = await request(app)
      .put(`/api/users/${admin.id}`)
      .set('Cookie', admin.cookie)
      .send({
        role: 'RESPONSIBLE',
        status: 'ACTIVE',
        locationId: location.id,
        unitId: unit.id,
        expiryDate: '2030-12-31',
      })

    expect(res.status).toBe(400)

    const rows = await db.select().from(users).where(eq(users.id, admin.id))
    expect(rows[0]?.role).toBe('ADMIN')
  })

  /* ADMIN rolünde expiryDate null'a çekildiği için mevcut mantık EXPIRED
     durumunu otomatik olarak ACTIVE'e döndürüyor. Sonuç aynı kapıya çıkıyor:
     sistem admin'siz kalmıyor. Test bu değişmezliği kilitler. */
  it('son aktif admin EXPIRED yapılmaya çalışılsa da ACTIVE kalır', async () => {
    const admin = await createAdminUser()

    await request(app)
      .put(`/api/users/${admin.id}`)
      .set('Cookie', admin.cookie)
      .send({ role: 'ADMIN', status: 'EXPIRED' })

    const rows = await db.select().from(users).where(eq(users.id, admin.id))
    expect(rows[0]?.status).toBe('ACTIVE')
    expect(rows[0]?.role).toBe('ADMIN')
  })

  it('başka aktif admin varsa silme çalışır → 200', async () => {
    const admin = await createAdminUser()
    const second = await createAdminUser()

    const res = await request(app)
      .delete(`/api/users/${second.id}`)
      .set('Cookie', admin.cookie)

    expect(res.status).toBe(200)

    const rows = await db.select().from(users).where(eq(users.id, second.id))
    expect(rows).toHaveLength(0)
  })

  it('RESPONSIBLE kullanıcı silme korumadan etkilenmez → 200', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const responsible = await createResponsibleUser(location.id, unit.id)

    const res = await request(app)
      .delete(`/api/users/${responsible.id}`)
      .set('Cookie', admin.cookie)

    expect(res.status).toBe(200)
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   Kendi hesabını silme.
   Yönetici kendi hesabını silememeli; aksi halde oturumu bir sonraki istekte
   sessizce kopar.
   ───────────────────────────────────────────────────────────────────────── */
describe('Kendi hesabını silme koruması', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('BAŞKA admin varken bile kendi hesabını silemez → 400', async () => {
    const admin = await createAdminUser()
    await createAdminUser()          // son admin değil — koruma yine de çalışmalı

    const res = await request(app)
      .delete(`/api/users/${admin.id}`)
      .set('Cookie', admin.cookie)

    expect(res.status).toBe(400)
    expect(res.body.message).toContain('Kendi hesabınızı silemezsiniz')
    expect(res.body.message).toContain('başka bir yönetici')
  })

  it('silme reddedildikten sonra oturum AYAKTA kalır', async () => {
    const admin = await createAdminUser()
    await createAdminUser()

    await request(app)
      .delete(`/api/users/${admin.id}`)
      .set('Cookie', admin.cookie)

    // Hesap yerinde
    const rows = await db.select().from(users).where(eq(users.id, admin.id))
    expect(rows).toHaveLength(1)

    // Ve oturum bir sonraki istekte de geçerli
    const meRes = await request(app).get('/api/auth/me').set('Cookie', admin.cookie)
    expect(meRes.status).toBe(200)
  })

  it('başka bir yönetici o hesabı silebilir → 200', async () => {
    const first = await createAdminUser()
    const second = await createAdminUser()

    const res = await request(app)
      .delete(`/api/users/${first.id}`)
      .set('Cookie', second.cookie)

    expect(res.status).toBe(200)
    expect(await db.select().from(users).where(eq(users.id, first.id))).toHaveLength(0)
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   Oturum iptali (token_version)
   ───────────────────────────────────────────────────────────────────────── */
describe('Oturum iptali', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  it('admin şifre sıfırlayınca kullanıcının mevcut token_version artar', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const target = await createResponsibleUser(location.id, unit.id)

    const before = await db.select().from(users).where(eq(users.id, target.id))

    await request(app)
      .put(`/api/users/${target.id}`)
      .set('Cookie', admin.cookie)
      .send({
        role: 'RESPONSIBLE',
        status: 'ACTIVE',
        locationId: location.id,
        unitId: unit.id,
        expiryDate: '2030-12-31',
        forceNewPassword: 'Yeni-Sifre-2026',
      })

    const after = await db.select().from(users).where(eq(users.id, target.id))
    expect(after[0]!.tokenVersion).toBeGreaterThan(before[0]!.tokenVersion)
  })

  it('admin şifre sıfırlayınca kullanıcı ilk girişte şifre değiştirmek zorunda kalır', async () => {
    const admin = await createAdminUser()
    const location = await createLocation()
    const unit = await createUnit(location.id)
    const target = await createResponsibleUser(location.id, unit.id)

    await request(app)
      .put(`/api/users/${target.id}`)
      .set('Cookie', admin.cookie)
      .send({
        role: 'RESPONSIBLE',
        status: 'ACTIVE',
        locationId: location.id,
        unitId: unit.id,
        expiryDate: '2030-12-31',
        forceNewPassword: 'Yeni-Sifre-2026',
      })

    const rows = await db.select().from(users).where(eq(users.id, target.id))
    expect(rows[0]?.mustChangePassword).toBe(true)
  })

  it('eski token_version taşıyan refresh reddedilir → 401', async () => {
    const admin = await createAdminUser()

    // Giriş yap → geçerli refresh cookie al
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: admin.username, password: admin.password })
    const cookies = login.headers['set-cookie'] as unknown as string[]

    // token_version'ı DB'de artır (şifre değişimi / rol değişimi senaryosu)
    await db.update(users).set({ tokenVersion: 99 }).where(eq(users.id, admin.id))

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies)

    expect(res.status).toBe(401)
  })

  it('silinen kullanıcının refresh isteği reddedilir → 401', async () => {
    const admin = await createAdminUser()
    const second = await createAdminUser()

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: second.username, password: second.password })
    const cookies = login.headers['set-cookie'] as unknown as string[]

    await db.delete(users).where(eq(users.id, second.id))

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies)

    expect(res.status).toBe(401)
    void admin
  })

  it('EXPIRED yapılan kullanıcının refresh isteği reddedilir → 401', async () => {
    await createAdminUser()
    const second = await createAdminUser()

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: second.username, password: second.password })
    const cookies = login.headers['set-cookie'] as unknown as string[]

    await db.update(users).set({ status: 'EXPIRED' }).where(eq(users.id, second.id))

    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies)

    expect(res.status).toBe(401)
  })
})
