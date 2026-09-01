/* ========================================================================
   AUTH INTEGRATION TESTS
   POST /api/auth/register, /login, /logout, /refresh, GET /api/auth/me
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { eq } from 'drizzle-orm'

import { cleanDb, createAdminUser } from '../helpers/testDb.js'
import { db } from '../../src/config/database.js'
import { users } from '../../database/schema.js'

describe('Auth API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    /* Kayıt yanıtı kullanıcı nesnesi döndürmez: id/username/status kimliksiz
       bir çağırana bilgi verirdi ve yanıt çakışma durumundan ayırt edilemez
       olmalı. */
    it('POST /api/auth/register → kaydı alır ve 201 + pending döner', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'Test@1234567', role: 'ADMIN' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toEqual({ pending: true })
      expect(res.body.data).not.toHaveProperty('user')
    })

    it('POST /api/auth/register → kullanıcı gerçekten PENDING olarak yazılır', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'pendingcheck', password: 'Test@1234567', role: 'ADMIN' })

      const rows = await db.select().from(users).where(eq(users.username, 'pendingcheck'))
      expect(rows).toHaveLength(1)
      expect(rows[0]?.status).toBe('PENDING')
    })

    it('POST /api/auth/login → geçerli credentials ile 200 + cookie döner', async () => {
      // Giriş yapabilmek için statüsü ACTIVE olan kullanıcı oluştur
      await createAdminUser({ username: 'logintest', password: 'Test@1234567' })

      // Giriş yap
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'logintest', password: 'Test@1234567' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      // Cookie'de accessToken ve refreshToken olmalı
      const cookies = res.headers['set-cookie'] as string[] | undefined
      expect(cookies).toBeDefined()
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : ''
      expect(cookieStr).toContain('accessToken')
      expect(cookieStr).toContain('refreshToken')
    })

    it('GET /api/auth/me → geçerli token ile 200 ve kullanıcı bilgisi döner', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.username).toBe(admin.username)
      expect(res.body.data.user.role).toBe('ADMIN')
    })

    it('POST /api/auth/logout → 200 ve cookie temizlenir', async () => {
      const admin = await createAdminUser()

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', admin.cookie)

      expect(res.status).toBe(200)
      // Cookie sıfırlanmalı (maxAge=0 veya boş)
      const cookies = res.headers['set-cookie'] as string[] | undefined
      if (cookies) {
        const cookieStr = Array.isArray(cookies) ? cookies.join(';') : ''
        expect(cookieStr).toMatch(/accessToken=;|accessToken=\s*;/)
      }
    })

    it('POST /api/auth/refresh → refresh token ile yeni access token alınır', async () => {
      // Login yapabilmek için onaylı (ACTIVE) kullanıcı oluştur
      await createAdminUser({ username: 'refreshtest', password: 'Test@1234567' })

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'refreshtest', password: 'Test@1234567' })

      const cookies = loginRes.headers['set-cookie'] as string[]
      expect(cookies).toBeDefined()

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookies.join(';'))

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  // ─── Hata Senaryoları (Validation) ────────────────────────────────────
  describe('Hata senaryoları (validation)', () => {
    /* Kullanıcı adı sızdırma: 409 "zaten kullanımda" doğrudan bir kullanıcı adı
       doğrulayıcısı olurdu, bu yüzden çakışma da başarılı kayıtla aynı yanıtı
       verir. */
    it('POST /api/auth/register → aynı username ile tekrar kayıt kullanıcı adı sızdırmaz', async () => {
      const first = await request(app)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'Test@1234567', role: 'ADMIN' })

      const second = await request(app)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'Test@5678901', role: 'ADMIN' })

      expect(second.status).toBe(first.status)
      expect(second.body).toEqual(first.body)

      // İkinci kayıt gerçekten yazılmamalı
      const rows = await db.select().from(users).where(eq(users.username, 'duplicate'))
      expect(rows).toHaveLength(1)
    })

    it('POST /api/auth/login → yanlış şifre → 401', async () => {
      // Aktif kullanıcı yarat ki PENDING'e (403) takılmadan şifre kontrolüne (401) düşsün
      await createAdminUser({ username: 'wrongpass', password: 'Test@1234567' })

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrongpass', password: 'WrongPassword!' })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('POST /api/auth/login → var olmayan kullanıcı → 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'Test@1234567' })

      expect(res.status).toBe(401)
    })

    it('POST /api/auth/register → eksik alan → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'nopassword' }) // password eksik

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })
  })

  // ─── Yetkilendirme ─────────────────────────────────────────────────────
  describe('Yetkilendirme', () => {
    it('GET /api/auth/me → token olmadan → 401', async () => {
      const res = await request(app).get('/api/auth/me')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('GET /api/auth/me → geçersiz/bozuk token → 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'accessToken=invalid.token.here')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  // ─── Edge Case'ler ─────────────────────────────────────────────────────
  describe("Edge case'ler", () => {
    it('POST /api/auth/register → boş username → 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: '', password: 'Test@1234567', role: 'ADMIN' })

      expect(res.status).toBe(400)
    })

    it('POST /api/auth/login → boş body → 400', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({})

      expect(res.status).toBe(400)
    })
  })
})
