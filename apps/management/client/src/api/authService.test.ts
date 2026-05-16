import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import { register, login, getMe, logout, refreshToken, changePassword } from './authService';

/*
  authService unit testleri — MSW ile gerçek HTTP istekleri test edilir.

  Her fonksiyon için:
  - Doğru endpoint'e doğru HTTP metodu ile istek attığı
  - Gönderilen body/payload doğruluğu
  - Dönen response yapısının kontrol edildiği
  - Hata durumlarının (401, 409, vb.) doğru ele alındığı
  test edilir.
*/

describe('authService', () => {

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('POST /auth/register endpoint\'ine doğru payload ile istek atmalı', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.post('*/api/auth/register', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { user: { id: 1, username: 'newuser', role: 'VIEWER' } },
          });
        }),
      );

      const payload = { username: 'newuser', password: 'pass1234', role: 'VIEWER' as const };
      const result = await register(payload as any);

      expect(capturedBody).toMatchObject({
        username: 'newuser',
        password: 'pass1234',
        role: 'VIEWER',
      });
      expect(result).toMatchObject({
        success: true,
        data: { user: { username: 'newuser' } },
      });
    });

    it('kayıt başarısız olursa hata döndürmeli', async () => {
      server.use(
        http.post('*/api/auth/register', () =>
          HttpResponse.json({ message: 'Bu kullanıcı adı zaten mevcut' }, { status: 409 }),
        ),
      );

      await expect(register({ username: 'existing', password: 'pass', role: 'ADMIN' } as any))
        .rejects.toMatchObject({ message: 'Bu kullanıcı adı zaten mevcut', status: 409 });
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('POST /auth/login endpoint\'ine username ve password göndermeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.post('*/api/auth/login', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { user: { id: 1, username: 'testuser', role: 'ADMIN' } },
          });
        }),
      );

      const result = await login('testuser', 'pass1234');

      expect(capturedBody).toEqual({ username: 'testuser', password: 'pass1234' });
      expect(result).toMatchObject({
        success: true,
        data: { user: { username: 'testuser', role: 'ADMIN' } },
      });
    });

    it('yanlış şifre ile giriş denemesinde 401 hatası döndürmeli', async () => {
      server.use(
        http.post('*/api/auth/login', () =>
          HttpResponse.json({ message: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 }),
        ),
      );

      await expect(login('testuser', 'wrongpass'))
        .rejects.toMatchObject({ message: 'Kullanıcı adı veya şifre hatalı', status: 401 });
    });
  });

  // ─── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('GET /auth/me endpoint\'ine istek atmalı ve kullanıcı bilgisi döndürmeli', async () => {
      server.use(
        http.get('*/api/auth/me', () =>
          HttpResponse.json({
            success: true,
            data: { user: { id: 1, username: 'testadmin', role: 'ADMIN' } },
          }),
        ),
      );

      const result = await getMe();
      expect(result).toMatchObject({
        success: true,
        data: { user: { id: 1, username: 'testadmin', role: 'ADMIN' } },
      });
    });

    it('oturum yoksa 401 hatası döndürmeli', async () => {
      server.use(
        http.get('*/api/auth/me', () =>
          HttpResponse.json({ message: 'Not authenticated' }, { status: 401 }),
        ),
      );

      await expect(getMe()).rejects.toMatchObject({ status: 401 });
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('POST /auth/logout endpoint\'ine istek atmalı ve başarı dönmeli', async () => {
      let requestReceived = false;

      server.use(
        http.post('*/api/auth/logout', () => {
          requestReceived = true;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await logout();
      expect(requestReceived).toBe(true);
      expect(result).toMatchObject({ success: true });
    });
  });

  // ─── refreshToken ──────────────────────────────────────────────────────────

  describe('refreshToken', () => {
    it('POST /auth/refresh endpoint\'ine istek atmalı', async () => {
      let requestReceived = false;

      server.use(
        http.post('*/api/auth/refresh', () => {
          requestReceived = true;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await refreshToken();
      expect(requestReceived).toBe(true);
      expect(result).toMatchObject({ success: true });
    });

    it('token geçersiz ise hata döndürmeli', async () => {
      server.use(
        http.post('*/api/auth/refresh', () =>
          HttpResponse.json({ message: 'Token expired' }, { status: 401 }),
        ),
      );

      await expect(refreshToken()).rejects.toMatchObject({ status: 401 });
    });
  });

  // ─── changePassword ────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('PUT /users/me endpoint\'ine oldPassword ve newPassword göndermeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('*/api/users/me', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await changePassword('eski123', 'yeni1234');

      expect(capturedBody).toEqual({ oldPassword: 'eski123', newPassword: 'yeni1234' });
      expect(result).toMatchObject({ success: true });
    });

    it('eski şifre yanlışsa hata döndürmeli', async () => {
      server.use(
        http.put('*/api/users/me', () =>
          HttpResponse.json({ message: 'Eski şifre hatalı' }, { status: 400 }),
        ),
      );

      await expect(changePassword('yanliseski', 'yeni1234'))
        .rejects.toMatchObject({ message: 'Eski şifre hatalı', status: 400 });
    });
  });
});
