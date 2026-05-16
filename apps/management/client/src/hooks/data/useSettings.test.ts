// Hook'ları test etmek için gerekli kütüphaneler
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// MSW (Sahte Sunucu)
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useSettings } from './useSettings';

/*
  useSettings hook'u:
  - Onay bekleyen kullanıcıları yönetir (fetchPendingUsers, approveUser, rejectUser)
  - Sistem ayarlarını yönetir (fetchSystemSettings, updateSystemSettings)
  Her bir fonksiyonun başarı/hata senaryoları ayrı ayrı test edilir.
*/
describe('useSettings hook', () => {
  it('başlangıç değerleri doğru olmalı', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.pendingUsers).toEqual([]);
    expect(result.current.systemSettings).toBeNull();
    expect(result.current.isPendingUsersLoading).toBe(false);
    expect(result.current.isSystemSettingsLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- fetchPendingUsers ---
  describe('fetchPendingUsers', () => {
    it('başarıyla onay bekleyen kullanıcıları çekmeli', async () => {
      server.use(
        http.get('*/api/settings/pending-users', () => HttpResponse.json({
          success: true,
          data: {
            pendingUsers: [{ id: 'pu-1', username: 'yeni_kullanici', email: 'yk@test.com' }]
          }
        }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.fetchPendingUsers();
      });

      expect(response?.success).toBe(true);
      expect(result.current.pendingUsers).toHaveLength(1);
      expect(result.current.pendingUsers[0]?.username).toBe('yeni_kullanici');
      expect(result.current.isPendingUsersLoading).toBe(false);
    });

    it('API hata döndürdüğünde error state güncellenmeli', async () => {
      server.use(
        http.get('*/api/settings/pending-users', () => HttpResponse.json({ message: 'Sunucu hatası' }, { status: 500 }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.fetchPendingUsers();
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Sunucu hatası');
      expect(result.current.error).toBe('Sunucu hatası');
    });
  });

  // --- fetchSystemSettings ---
  describe('fetchSystemSettings', () => {
    it('başarıyla sistem ayarlarını çekmeli ve state e kaydetmeli', async () => {
      server.use(
        http.get('*/api/settings/system', () => HttpResponse.json({
          success: true,
          data: {
            settings: { workHoursPerDay: 8, allowedAbsenceDays: 15 }
          }
        }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.fetchSystemSettings();
      });

      expect(response?.success).toBe(true);
      expect((result.current.systemSettings as any)?.workHoursPerDay).toBe(8);
      expect(result.current.isSystemSettingsLoading).toBe(false);
    });

    it('ayarları çekerken hata oluşursa error state güncellenmeli', async () => {
      server.use(
        http.get('*/api/settings/system', () => HttpResponse.json({ message: 'Yetkisiz' }, { status: 400 }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.fetchSystemSettings();
      });

      expect(response?.success).toBe(false);
      expect(result.current.error).toBe('Yetkisiz');
    });
  });

  // --- approveUser ---
  describe('approveUser', () => {
    it('başarıyla onaylandığında kullanıcı bekleyen listesinden kaldırılmalı (optimistic UI)', async () => {
      // Önce listeyi dolduralım
      server.use(
        http.get('*/api/settings/pending-users', () => HttpResponse.json({
          success: true,
          data: { pendingUsers: [{ id: 'pu-1', username: 'bekleyen' }] }
        })),
        // approvePendingUser → POST /settings/pending-users/:id/approve
        http.post('*/api/settings/pending-users/pu-1/approve', () => HttpResponse.json({ success: true }))
      );

      const { result } = renderHook(() => useSettings());

      // Önce listeyi çek
      await act(async () => {
        await result.current.fetchPendingUsers();
      });
      expect(result.current.pendingUsers).toHaveLength(1);

      // Şimdi onayla
      let response: any;
      await act(async () => {
        response = await result.current.approveUser('pu-1');
      });

      expect(response?.success).toBe(true);
      // Optimistik UI: onay sonrası liste anında boşaltılmalı
      expect(result.current.pendingUsers).toHaveLength(0);
    });

    it('onay sırasında hata oluşursa false dönmeli', async () => {
      server.use(
        // approvePendingUser → POST /settings/pending-users/:id/approve
        http.post('*/api/settings/pending-users/pu-x/approve', () => HttpResponse.json({ message: 'Onay verilemedi' }, { status: 400 }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.approveUser('pu-x');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Onay verilemedi');
    });
  });

  // --- rejectUser ---
  describe('rejectUser', () => {
    it('başarıyla reddedildiğinde kullanıcı listeden silinmeli', async () => {
      server.use(
        http.get('*/api/settings/pending-users', () => HttpResponse.json({
          success: true,
          data: { pendingUsers: [{ id: 'pu-2', username: 'reddedilecek' }] }
        })),
        // rejectPendingUser → DELETE /settings/pending-users/:id/reject
        http.delete('*/api/settings/pending-users/pu-2/reject', () => HttpResponse.json({ success: true }))
      );

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.fetchPendingUsers();
      });

      let response: any;
      await act(async () => {
        response = await result.current.rejectUser('pu-2');
      });

      expect(response?.success).toBe(true);
      expect(result.current.pendingUsers).toHaveLength(0);
    });

    it('red işleminde hata olursa error dönmeli', async () => {
      server.use(
        // rejectPendingUser → DELETE /settings/pending-users/:id/reject
        http.delete('*/api/settings/pending-users/pu-y/reject', () => HttpResponse.json({ message: 'Red yapılamadı' }, { status: 400 }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.rejectUser('pu-y');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Red yapılamadı');
    });
  });

  // --- updateSystemSettings ---
  describe('updateSystemSettings', () => {
    it('başarıyla güncellendiğinde systemSettings state i güncellenmeli', async () => {
      server.use(
        // updateSystemSettings → PUT /settings/system
        http.put('*/api/settings/system', () => HttpResponse.json({
          success: true,
          data: {
            settings: { workHoursPerDay: 9, allowedAbsenceDays: 20 }
          }
        }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.updateSystemSettings({ workHoursPerDay: 9, allowedAbsenceDays: 20 } as any);
      });

      expect(response?.success).toBe(true);
      expect((result.current.systemSettings as any)?.workHoursPerDay).toBe(9);
    });

    it('güncelleme sırasında hata olursa false dönmeli', async () => {
      server.use(
        // updateSystemSettings → PUT /settings/system
        http.put('*/api/settings/system', () => HttpResponse.json({ message: 'Geçersiz ayar değeri' }, { status: 400 }))
      );

      const { result } = renderHook(() => useSettings());

      let response: any;
      await act(async () => {
        response = await result.current.updateSystemSettings({} as any);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Geçersiz ayar değeri');
    });

    it('HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
      server.use(
        http.put('*/api/settings/system', () => HttpResponse.json({ success: false, message: 'Ayar güncellenemedi' }))
      );
      const { result } = renderHook(() => useSettings());
      let response: any;
      await act(async () => { response = await result.current.updateSystemSettings({} as any); });
      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Ayar güncellenemedi');
    });

    it('success:true ancak data.settings yok ise yeniden çekme yapmalı', async () => {
      server.use(
        http.put('*/api/settings/system', () => HttpResponse.json({ success: true, data: {} })),
        http.get('*/api/settings/system', () => HttpResponse.json({
          success: true,
          data: { settings: { workHoursPerDay: 8 } }
        }))
      );
      const { result } = renderHook(() => useSettings());
      let response: any;
      await act(async () => { response = await result.current.updateSystemSettings({} as any); });
      expect(response?.success).toBe(true);
    });
  });

  // ─── success:false (HTTP 200) branches ──────────────────────────────────────

  it('approveUser — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.post('*/api/settings/pending-users/pu-1/approve', () => HttpResponse.json({ success: false, message: 'Onay reddedildi' }))
    );
    const { result } = renderHook(() => useSettings());
    let response: any;
    await act(async () => { response = await result.current.approveUser('pu-1'); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Onay reddedildi');
  });

  it('rejectUser — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.delete('*/api/settings/pending-users/pu-1/reject', () => HttpResponse.json({ success: false, message: 'Red reddedildi' }))
    );
    const { result } = renderHook(() => useSettings());
    let response: any;
    await act(async () => { response = await result.current.rejectUser('pu-1'); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Red reddedildi');
  });

  it('fetchPendingUsers — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.get('*/api/settings/pending-users', () => HttpResponse.json({ success: false, message: 'Listeleme başarısız' }))
    );
    const { result } = renderHook(() => useSettings());
    let response: any;
    await act(async () => { response = await result.current.fetchPendingUsers(); });
    expect(response?.success).toBe(false);
  });

  it('fetchSystemSettings — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.get('*/api/settings/system', () => HttpResponse.json({ success: false, message: 'Ayarlar alınamadı' }))
    );
    const { result } = renderHook(() => useSettings());
    let response: any;
    await act(async () => { response = await result.current.fetchSystemSettings(); });
    expect(response?.success).toBe(false);
  });
});
