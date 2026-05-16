import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import httpClient, { api } from './httpClient';

/*
  httpClient (Axios) interceptor testleri.

  Scope:
  - Başarılı response → response.data döndürmeli
  - 401 → /auth/refresh çağır → orijinal isteği tekrarla
  - 401 → refresh başarısız → reject etmeli
  - Auth endpoint'lerinde (login/me/register/refresh) 401 → döngüye girmemeli
  - 4xx/5xx hata → ApiError { message, status } ile reject etmeli
  - api wrapper metodları (get/post/put/patch/delete) doğru endpoint'e gitmeli

  NOT: window.location mock'laması MSW'nin URL çözümlemesini bozduğu için,
  redirect testleri ayrı bir dosyada (httpClient.redirect.test.ts) yapılır.
*/

beforeEach(() => {
  server.resetHandlers();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('httpClient interceptor', () => {

  // ─── Başarılı Response ────────────────────────────────────────────────────

  it('başarılı GET response data döndürmeli', async () => {
    server.use(
      http.get('*/api/health', () => HttpResponse.json({ status: 'ok' })),
    );

    const result = await httpClient.get('/health');
    expect(result).toEqual({ status: 'ok' });
  });

  it('başarılı POST isteği body ile response döndürmeli', async () => {
    server.use(
      http.post('*/api/test-create', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ success: true, data: { received: body } });
      }),
    );

    const result = await httpClient.post('/test-create', { name: 'Test' });
    expect(result).toMatchObject({
      success: true,
      data: { received: { name: 'Test' } },
    });
  });

  // ─── 401 Auto-Refresh ─────────────────────────────────────────────────────

  it('401 alınca /auth/refresh çağırmalı ve orijinal isteği tekrarlamalı', async () => {
    let callCount = 0;
    let refreshCalled = false;

    server.use(
      http.get('*/api/employees', () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        return HttpResponse.json({ success: true, data: { employees: [] } });
      }),
      http.post('*/api/auth/refresh', () => {
        refreshCalled = true;
        return HttpResponse.json({ success: true });
      }),
    );

    const result = await httpClient.get('/employees') as { success: boolean };
    expect(callCount).toBe(2);
    expect(refreshCalled).toBe(true);
    expect(result.success).toBe(true);
  });

  it('401 → refresh başarısız olursa reject etmeli', async () => {
    server.use(
      http.get('*/api/employees', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
      http.post('*/api/auth/refresh', () =>
        HttpResponse.json({ message: 'Refresh failed' }, { status: 401 }),
      ),
    );

    // Refresh başarısız olduğunda interceptor reject eder
    // (jsdom'da window.location.href atması "Not implemented" fırlatır ama test devam eder)
    await expect(httpClient.get('/employees')).rejects.toBeDefined();
  });

  it('_retry bayrağı: aynı istek iki kez 401 dönerse sadece bir refresh denemeli', async () => {
    let refreshCallCount = 0;

    server.use(
      http.get('*/api/employees', () =>
        HttpResponse.json({ message: 'Unauthorized' }, { status: 401 }),
      ),
      http.post('*/api/auth/refresh', () => {
        refreshCallCount += 1;
        return HttpResponse.json({ success: true });
      }),
    );

    // İlk istek 401 → refresh → retry → tekrar 401 → _retry true olduğu için ikinci refresh yapılmaz
    await expect(httpClient.get('/employees')).rejects.toBeDefined();
    expect(refreshCallCount).toBe(1);
  });

  // ─── Auth Endpoint İstisnaları ─────────────────────────────────────────────

  it('/auth/login 401 döndüğünde döngüye girmemeli, direkt hata vermeli', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ message: 'Kullanıcı adı veya şifre hatalı' }, { status: 401 }),
      ),
    );

    await expect(httpClient.post('/auth/login', {})).rejects.toMatchObject({
      message: 'Kullanıcı adı veya şifre hatalı',
      status: 401,
    });
  });

  it('/auth/me 401 döndüğünde döngüye girmemeli', async () => {
    server.use(
      http.get('*/api/auth/me', () =>
        HttpResponse.json({ message: 'Not authenticated' }, { status: 401 }),
      ),
    );

    await expect(httpClient.get('/auth/me')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('/auth/register 401 döndüğünde döngüye girmemeli', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json({ message: 'Forbidden' }, { status: 401 }),
      ),
    );

    await expect(httpClient.post('/auth/register', {})).rejects.toMatchObject({
      status: 401,
    });
  });

  it('/auth/refresh 401 döndüğünde döngüye girmemeli', async () => {
    server.use(
      http.post('*/api/auth/refresh', () =>
        HttpResponse.json({ message: 'Token expired' }, { status: 401 }),
      ),
    );

    await expect(httpClient.post('/auth/refresh')).rejects.toMatchObject({
      status: 401,
    });
  });

  // ─── Global Hata İşleme ────────────────────────────────────────────────────

  it('500 hatası mesajlı response → ApiError olarak dönmeli', async () => {
    server.use(
      http.get('*/api/users', () =>
        HttpResponse.json({ message: 'Sunucu hatası oluştu' }, { status: 500 }),
      ),
    );

    await expect(httpClient.get('/users')).rejects.toMatchObject({
      message: 'Sunucu hatası oluştu',
      status: 500,
    });
  });

  it('403 hatası mesajsız response → varsayılan hata mesajı dönmeli', async () => {
    server.use(
      http.get('*/api/users', () =>
        HttpResponse.json({}, { status: 403 }),
      ),
    );

    await expect(httpClient.get('/users')).rejects.toMatchObject({
      message: 'Bir hata oluştu',
      status: 403,
    });
  });

  it('422 hatası string mesajlı response → mesajı dönmeli', async () => {
    server.use(
      http.post('*/api/employees', () =>
        HttpResponse.json({ message: 'TC kimlik no geçersiz' }, { status: 422 }),
      ),
    );

    await expect(httpClient.post('/employees', {})).rejects.toMatchObject({
      message: 'TC kimlik no geçersiz',
      status: 422,
    });
  });

  it('409 Conflict → doğru mesajı ApiError olarak dönmeli', async () => {
    server.use(
      http.put('*/api/users/1', () =>
        HttpResponse.json({ message: 'Bu kullanıcı adı zaten kullanımda' }, { status: 409 }),
      ),
    );

    await expect(httpClient.put('/users/1', {})).rejects.toMatchObject({
      message: 'Bu kullanıcı adı zaten kullanımda',
      status: 409,
    });
  });

  it('400 Bad Request → mesajı ApiError olarak dönmeli', async () => {
    server.use(
      http.post('*/api/employees', () =>
        HttpResponse.json({ message: 'Geçersiz veri' }, { status: 400 }),
      ),
    );

    await expect(httpClient.post('/employees', {})).rejects.toMatchObject({
      message: 'Geçersiz veri',
      status: 400,
    });
  });

  // ─── api wrapper ──────────────────────────────────────────────────────────

  it('api.get doğru endpoint çağırmalı', async () => {
    server.use(
      http.get('*/api/health', () => HttpResponse.json({ ok: true })),
    );
    const result = await api.get<{ ok: boolean }>('/health');
    expect(result).toEqual({ ok: true });
  });

  it('api.post body ile doğru endpoint çağırmalı', async () => {
    server.use(
      http.post('*/api/announcements', async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({ received: body });
      }),
    );
    const result = await api.post<{ received: Record<string, unknown> }>('/announcements', { title: 'Test' });
    expect(result).toMatchObject({ received: { title: 'Test' } });
  });

  it('api.put doğru endpoint ile çağırmalı', async () => {
    server.use(
      http.put('*/api/settings', () => HttpResponse.json({ updated: true })),
    );
    const result = await api.put<{ updated: boolean }>('/settings', { dailyWage: 200 });
    expect(result).toMatchObject({ updated: true });
  });

  it('api.patch doğru endpoint ile çağırmalı', async () => {
    server.use(
      http.patch('*/api/timesheets/p1/lock', () => HttpResponse.json({ locked: true })),
    );
    const result = await api.patch<{ locked: boolean }>('/timesheets/p1/lock');
    expect(result).toMatchObject({ locked: true });
  });

  it('api.delete doğru endpoint ile çağırmalı', async () => {
    server.use(
      http.delete('*/api/employees/emp-1', () => HttpResponse.json({ deleted: true })),
    );
    const result = await api.delete<{ deleted: boolean }>('/employees/emp-1');
    expect(result).toMatchObject({ deleted: true });
  });
});
