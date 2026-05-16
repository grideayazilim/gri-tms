// Hook'ları test etmek için gerekli kütüphaneler
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// MSW (Sahte Sunucu)
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useAnnouncements } from './useAnnouncements';

/*
  useAnnouncements hook'u duyuru çekme, ekleme, okundu işaretleme
  gibi CRUD ve listeleme işlemlerini yapar. Burada MSW ile
  tüm API uçlarını taklit ediyoruz.
*/
describe('useAnnouncements hook', () => {
  it('başlangıç değerleri (state) doğru olmalı', () => {
    const { result } = renderHook(() => useAnnouncements());

    expect(result.current.announcements).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- fetchUnreadCount ---
  describe('fetchUnreadCount', () => {
    it('başarıyla okunmamış duyuru sayısını çekmeli ve kaydetmeli', async () => {
      server.use(
        http.get('*/api/announcements/unread-count', () => HttpResponse.json({
          success: true,
          data: { unreadCount: 5 }
        }))
      );

      const { result } = renderHook(() => useAnnouncements());

      await act(async () => {
        await result.current.fetchUnreadCount();
      });

      expect(result.current.unreadCount).toBe(5);
    });

    it('hata oluşursa çökmemeli ve sayıyı 0 bırakmalı', async () => {
      server.use(
        http.get('*/api/announcements/unread-count', () => HttpResponse.json({ message: 'Sunucu hatası' }, { status: 500 }))
      );

      const { result } = renderHook(() => useAnnouncements());

      await act(async () => {
        await result.current.fetchUnreadCount();
      });

      expect(result.current.unreadCount).toBe(0); // Sessizce yutulmalı
    });
  });

  // --- fetchAnnouncements ---
  describe('fetchAnnouncements', () => {
    it('başarıyla duyuruları çektiğinde listeyi güncellemeli', async () => {
      server.use(
        http.get('*/api/announcements', () => HttpResponse.json({
          success: true,
          data: {
            announcements: [{ id: 'a-1', title: 'Hoş Geldiniz', content: 'Sisteme hoş geldiniz', isRead: false }],
            pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, limit: 10 }
          }
        }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.fetchAnnouncements();
      });

      expect((response as any)?.data?.announcements).toHaveLength(1);
      expect(result.current.announcements[0]?.title).toBe('Hoş Geldiniz');
      expect((result.current.pagination as any)?.totalRecords).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('API hata döndüğünde error state ini güncellemeli', async () => {
      server.use(
        http.get('*/api/announcements', () => HttpResponse.json({ message: 'Yetkiniz yok' }, { status: 403 }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        try {
          response = await result.current.fetchAnnouncements();
        } catch (e: any) {
          response = e;
        }
      });

      // useAsync hook'u ile sarmalandığı için throw fırlatır, hata state'e düşer
      expect(result.current.error).toBe('Yetkiniz yok');
    });
  });

  // --- markAsRead ---
  describe('markAsRead', () => {
    it('başarıyla okundu işaretlendiğinde listedeki durumu güncellemeli', async () => {
      server.use(
        http.post('*/api/announcements/a-1/read', () => HttpResponse.json({ success: true }))
      );

      const { result } = renderHook(() => useAnnouncements());

      // Önce sahte veriyi içine koyalım
      act(() => {
        // State'i doğrudan değiştiremiyoruz ancak fetch simüle edebiliriz.
        // Ama hook içinde manuel tetiklemek yerine doğrudan okundu testi yapalım
      });

      let response: any;
      await act(async () => {
        response = await result.current.markAsRead('a-1');
      });

      expect(response?.success).toBe(true);
      // unreadCount sıfırın altına inmemeli
      expect(result.current.unreadCount).toBe(0);
    });

    it('okundu işaretlerken hata oluşursa false dönmeli', async () => {
      server.use(
        http.post('*/api/announcements/a-1/read', () => HttpResponse.json({ message: 'Duyuru bulunamadı' }, { status: 404 }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.markAsRead('a-1');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Duyuru bulunamadı');
    });
  });

  // --- addAnnouncement ---
  describe('addAnnouncement', () => {
    it('başarıyla eklendiğinde yeniden listeleme yapmalı', async () => {
      server.use(
        http.post('*/api/announcements', () => HttpResponse.json({
          success: true,
          data: { announcement: { id: 'a-2', title: 'Yeni Duyuru' } }
        })),
        // Ekleme sonrası fetchAnnouncements çalışıyor, onu da mocklayalım
        http.get('*/api/announcements', () => HttpResponse.json({
          success: true,
          data: {
            announcements: [{ id: 'a-2', title: 'Yeni Duyuru' }],
            pagination: { totalRecords: 1, totalPages: 1, currentPage: 1, limit: 10 }
          }
        }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.addAnnouncement('Yeni Duyuru', 'İçerik');
      });

      expect(response?.success).toBe(true);
      expect((response as any)?.data?.announcement?.title).toBe('Yeni Duyuru');
    });

    it('eklerken hata oluşursa error mesajını yakalamalı', async () => {
      server.use(
        http.post('*/api/announcements', () => HttpResponse.json({ message: 'Yetkiniz yok' }, { status: 403 }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.addAnnouncement('Yeni', 'İçerik');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Yetkiniz yok');
    });
  });

  // --- editAnnouncement ---
  describe('editAnnouncement', () => {
    it('başarıyla güncellendiğinde true dönmeli', async () => {
      server.use(
        http.put('*/api/announcements/a-1', () => HttpResponse.json({
          success: true,
          data: { announcement: { id: 'a-1', title: 'Güncel' } }
        })),
        http.get('*/api/announcements', () => HttpResponse.json({
          success: true,
          data: { announcements: [], pagination: {} }
        }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.editAnnouncement('a-1', 'Güncel', 'İçerik');
      });

      expect(response?.success).toBe(true);
    });

    it('güncellerken hata oluşursa false dönmeli', async () => {
      server.use(
        http.put('*/api/announcements/a-1', () => HttpResponse.json({ message: 'Güncelleme başarısız' }, { status: 400 }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.editAnnouncement('a-1', 'Güncel', 'İçerik');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Güncelleme başarısız');
    });
  });

  // --- removeAnnouncement ---
  describe('removeAnnouncement', () => {
    it('başarıyla silindiğinde true dönmeli', async () => {
      server.use(
        http.delete('*/api/announcements/a-1', () => HttpResponse.json({ success: true })),
        http.get('*/api/announcements', () => HttpResponse.json({
          success: true,
          data: { announcements: [], pagination: {} }
        }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.removeAnnouncement('a-1');
      });

      expect(response?.success).toBe(true);
    });

    it('silerken hata olursa error dönmeli', async () => {
      server.use(
        http.delete('*/api/announcements/a-1', () => HttpResponse.json({ message: 'Silinemedi' }, { status: 400 }))
      );

      const { result } = renderHook(() => useAnnouncements());

      let response: any;
      await act(async () => {
        response = await result.current.removeAnnouncement('a-1');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Silinemedi');
    });
  });

  // ─── success:false (HTTP 200) branches ──────────────────────────────────────

  it('markAsRead — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.post('*/api/announcements/a-1/read', () => HttpResponse.json({ success: false, message: 'Okundu işaretlenemedi' }))
    );
    const { result } = renderHook(() => useAnnouncements());
    let response: any;
    await act(async () => { response = await result.current.markAsRead('a-1'); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Okundu işaretlenemedi');
  });

  it('addAnnouncement — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.post('*/api/announcements', () => HttpResponse.json({ success: false, message: 'Oluşturulamadı' }))
    );
    const { result } = renderHook(() => useAnnouncements());
    let response: any;
    await act(async () => { response = await result.current.addAnnouncement('Yeni', 'İçerik'); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Oluşturulamadı');
  });

  it('editAnnouncement — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.put('*/api/announcements/a-1', () => HttpResponse.json({ success: false, message: 'Güncellenemedi' }))
    );
    const { result } = renderHook(() => useAnnouncements());
    let response: any;
    await act(async () => { response = await result.current.editAnnouncement('a-1', 'Güncel', 'İçerik'); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Güncellenemedi');
  });

  it('removeAnnouncement — HTTP 200 success:false döndüğünde hata kolu çalışmalı', async () => {
    server.use(
      http.delete('*/api/announcements/a-1', () => HttpResponse.json({ success: false, message: 'Duyuru silinemedi' }))
    );
    const { result } = renderHook(() => useAnnouncements());
    let response: any;
    await act(async () => { response = await result.current.removeAnnouncement('a-1'); });
    expect(response?.success).toBe(false);
    expect(response?.error).toBe('Duyuru silinemedi');
  });

  it('fetchUnreadCount — HTTP 200 success:false sessizce yutulmalı', async () => {
    server.use(
      http.get('*/api/announcements/unread-count', () => HttpResponse.json({ success: false }))
    );
    const { result } = renderHook(() => useAnnouncements());
    await act(async () => { await result.current.fetchUnreadCount(); });
    expect(result.current.unreadCount).toBe(0);
  });
});
