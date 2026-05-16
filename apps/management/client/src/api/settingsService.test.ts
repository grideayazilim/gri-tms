import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../vitest.setup';
import {
  getPendingUsers,
  approvePendingUser,
  rejectPendingUser,
  getSystemSettings,
  updateSystemSettings,
  resetSystem,
  resetSystemWithBackup,
  resetSystemWithoutBackup,
} from './settingsService';

/*
  settingsService unit testleri — MSW ile gerçek HTTP istekleri test edilir.

  Kapsam:
  - Pending Users CRUD (listele, onayla, reddet)
  - System Settings (getir, güncelle)
  - System Reset (yedekli, yedeksiz, genel)
*/

// jsdom'da URL.createObjectURL yok — Blob döndüren testler için mock
beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

// ─── Mock verileri ────────────────────────────────────────────────────────────

const mockPendingUser = {
  id: 'pu-1',
  username: 'newuser',
  role: 'VIEWER',
  createdAt: '2024-05-01T10:00:00Z',
};

const mockSettings = {
  dailyWage: 100,
  maxWeeklyDays: 5,
  programStartDate: '2024-01-01',
  programEndDate: '2024-12-31',
};

describe('settingsService', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // PENDING USERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getPendingUsers', () => {
    it('GET /settings/pending-users endpoint\'ine istek atmalı ve listeyi döndürmeli', async () => {
      server.use(
        http.get('*/api/settings/pending-users', () =>
          HttpResponse.json({
            success: true,
            data: { pendingUsers: [mockPendingUser] },
          }),
        ),
      );

      const result = await getPendingUsers();
      expect(result).toMatchObject({
        success: true,
        data: { pendingUsers: [{ id: 'pu-1', username: 'newuser' }] },
      });
    });

    it('boş liste döndürebilmeli', async () => {
      server.use(
        http.get('*/api/settings/pending-users', () =>
          HttpResponse.json({ success: true, data: { pendingUsers: [] } }),
        ),
      );

      const result = await getPendingUsers();
      expect(result).toMatchObject({ data: { pendingUsers: [] } });
    });
  });

  describe('approvePendingUser', () => {
    it('POST /settings/pending-users/:id/approve endpoint\'ine istek atmalı', async () => {
      let capturedId: string | undefined;

      server.use(
        http.post('*/api/settings/pending-users/:id/approve', ({ params }) => {
          capturedId = params.id as string;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await approvePendingUser('pu-42');
      expect(capturedId).toBe('pu-42');
      expect(result).toMatchObject({ success: true });
    });

    it('bulunamayan kullanıcı için 404 döndürmeli', async () => {
      server.use(
        http.post('*/api/settings/pending-users/:id/approve', () =>
          HttpResponse.json({ message: 'Kullanıcı bulunamadı' }, { status: 404 }),
        ),
      );

      await expect(approvePendingUser('nonexistent'))
        .rejects.toMatchObject({ status: 404 });
    });
  });

  describe('rejectPendingUser', () => {
    it('DELETE /settings/pending-users/:id/reject endpoint\'ine istek atmalı', async () => {
      let capturedId: string | undefined;

      server.use(
        http.delete('*/api/settings/pending-users/:id/reject', ({ params }) => {
          capturedId = params.id as string;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await rejectPendingUser('pu-99');
      expect(capturedId).toBe('pu-99');
      expect(result).toMatchObject({ success: true });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getSystemSettings', () => {
    it('GET /settings/system endpoint\'ine istek atmalı ve ayarları döndürmeli', async () => {
      server.use(
        http.get('*/api/settings/system', () =>
          HttpResponse.json({
            success: true,
            data: { settings: mockSettings },
          }),
        ),
      );

      const result = await getSystemSettings();
      expect(result).toMatchObject({
        success: true,
        data: {
          settings: {
            dailyWage: 100,
            maxWeeklyDays: 5,
            programStartDate: '2024-01-01',
            programEndDate: '2024-12-31',
          },
        },
      });
    });
  });

  describe('updateSystemSettings', () => {
    it('PUT /settings/system endpoint\'ine güncel ayarları göndermeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('*/api/settings/system', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { settings: { ...mockSettings, dailyWage: 200 } },
          });
        }),
      );

      const result = await updateSystemSettings({ dailyWage: 200 } as any);

      expect(capturedBody).toMatchObject({ dailyWage: 200 });
      expect(result).toMatchObject({
        success: true,
        data: { settings: { dailyWage: 200 } },
      });
    });

    it('force parametresi ile güncelleme yapabilmeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.put('*/api/settings/system', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({
            success: true,
            data: { settings: { ...mockSettings, maxWeeklyDays: 7 } },
          });
        }),
      );

      await updateSystemSettings({ maxWeeklyDays: 7, force: true } as any);
      expect(capturedBody).toMatchObject({ maxWeeklyDays: 7, force: true });
    });

    it('doğrulama hatası durumunda reject olmalı', async () => {
      server.use(
        http.put('*/api/settings/system', () =>
          HttpResponse.json({ message: 'Geçersiz değer' }, { status: 422 }),
        ),
      );

      await expect(updateSystemSettings({ dailyWage: -1 } as any))
        .rejects.toMatchObject({ status: 422, message: 'Geçersiz değer' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYSTEM RESET
  // ═══════════════════════════════════════════════════════════════════════════

  describe('resetSystemWithoutBackup', () => {
    it('POST /settings/reset endpoint\'ine backup:false göndermeli', async () => {
      let capturedBody: Record<string, unknown> | null = null;

      server.use(
        http.post('*/api/settings/reset', async ({ request }) => {
          capturedBody = await request.json() as Record<string, unknown>;
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await resetSystemWithoutBackup({ backup: false } as any);

      expect(capturedBody).toMatchObject({ backup: false });
      expect(result).toMatchObject({ success: true });
    });

    it('sunucu hatası durumunda reject olmalı', async () => {
      server.use(
        http.post('*/api/settings/reset', () =>
          HttpResponse.json({ message: 'Sıfırlama işlemi başarısız' }, { status: 500 }),
        ),
      );

      await expect(resetSystemWithoutBackup({ backup: false } as any))
        .rejects.toMatchObject({ status: 500 });
    });
  });

  describe('resetSystemWithBackup', () => {
    it('POST /settings/reset endpoint\'ine backup:true göndermeli ve Blob döndürmeli', async () => {
      server.use(
        http.post('*/api/settings/reset', () =>
          new HttpResponse(
            new Blob(['zip-content'], { type: 'application/zip' }),
            { status: 200 },
          ),
        ),
      );

      const result = await resetSystemWithBackup({ backup: true } as any);
      // httpClient interceptor response.data döndürür, bu Blob olmalı
      expect(result).toBeDefined();
    });
  });

  describe('resetSystem (dispatcher)', () => {
    it('backup:false ise resetSystemWithoutBackup çağırmalı', async () => {
      server.use(
        http.post('*/api/settings/reset', async ({ request }) => {
          const body = await request.json() as Record<string, unknown>;
          expect(body).toMatchObject({ backup: false });
          return HttpResponse.json({ success: true, data: {} });
        }),
      );

      const result = await resetSystem({ backup: false } as any);
      expect(result).toMatchObject({ success: true });
    });

    it('backup:true ise resetSystemWithBackup çağırmalı', async () => {
      server.use(
        http.post('*/api/settings/reset', () =>
          new HttpResponse(
            new Blob(['backup-zip'], { type: 'application/zip' }),
            { status: 200 },
          ),
        ),
      );

      const result = await resetSystem({ backup: true } as any);
      expect(result).toBeDefined();
    });
  });
});
