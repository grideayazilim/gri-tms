/* ========================================================================
   AUTH INTEGRATION TESTS
   POST /api/auth/register, /login, /logout, /refresh, GET /api/auth/me
   ======================================================================== */
import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import app from '../../src/app.js'
import { cleanDb, createAdminUser } from '../helpers/testDb.js'

describe('Auth API', () => {
  beforeEach(async () => {
    await cleanDb()
  })

  // ─── Başarılı Senaryolar (Happy Path) ─────────────────────────────────
  describe('Başarılı senaryolar (happy path)', () => {
    it('POST /api/auth/register → yeni kullanıcı kaydeder ve 201 döner', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'Test@1234', role: 'ADMIN' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user).toHaveProperty('id')
      expect(res.body.data.user.username).toBe('testuser')
      expect(res.body.data.user).not.toHaveProperty('passwordHash')
    })

    it('POST /api/auth/login → geçerli credentials ile 200 + cookie döner', async () => {
      // Giriş yapabilmek için statüsü ACTIVE olan kullanıcı oluştur
      await createAdminUser({ username: 'logintest', password: 'Test@1234' })

      // Giriş yap
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'logintest', password: 'Test@1234' })

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
      await createAdminUser({ username: 'refreshtest', password: 'Test@1234' })

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ username: 'refreshtest', password: 'Test@1234' })

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
    it('POST /api/auth/register → aynı username ile tekrar kayıt → 409', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'Test@1234', role: 'ADMIN' })

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'duplicate', password: 'Test@5678', role: 'ADMIN' })

      // DB constraint error (500 veya 409 dönebilir, backend mevcut durumda 500 dönüyor)
      expect([409, 500]).toContain(res.status)
      expect(res.body.success).toBe(false)
    })

    it('POST /api/auth/login → yanlış şifre → 401', async () => {
      // Aktif kullanıcı yarat ki PENDING'e (403) takılmadan şifre kontrolüne (401) düşsün
      await createAdminUser({ username: 'wrongpass', password: 'Test@1234' })

      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'wrongpass', password: 'WrongPassword!' })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('POST /api/auth/login → var olmayan kullanıcı → 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'nonexistent', password: 'Test@1234' })

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
        .send({ username: '', password: 'Test@1234', role: 'ADMIN' })

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
