// Hook'u test ortamında çalıştırmak ve asenkron işlemleri bekletmek için gerekli araçlar
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
// Gerçek sunucuya gitmemek için sahte API cevapları üretmemizi sağlayan MSW araçları
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useTimesheets } from './useTimesheets';

/*
  useTimesheets hook'u arka planda API'ye istek attığı için (fetchTimesheets, vb.)
  bu dosyadaki testlerde MSW (server.use) kullanarak API'yi "kandırıyoruz".
  Yani kod, veritabanına bağlandığını sanıyor ama aslında bizim verdiğimiz sahte JSON verilerini okuyor.
*/
describe('useTimesheets hook', () => {
  it('başlangıç değerleri (state) doğru olmalı', () => {
    const { result } = renderHook(() => useTimesheets());

    expect(result.current.timesheets).toEqual([]);
    expect(result.current.periods).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isLocking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- fetchTimesheets (Puantajları Çekme) ---
  describe('fetchTimesheets', () => {
    it('başarılı cevabı (data) dönmeli ve state güncellenmeli', async () => {
      // 1. ADIM: API'nin başarılı olduğunda döneceği örnek veri yapısı
      const mockApiResponse = {
        success: true,
        data: {
          timesheets: [
            {
              timesheet: { id: 'ts-1', periodId: 'p-1', days: [{ day: '2026-05-16', markerCode: 'X' }] },
              employee: { id: 'emp-1', tcNo: '12345678901', firstName: 'Mustafa', lastName: 'Bulut' },
              unit: { id: 'u-1', name: 'IT' },
              location: { id: 'l-1', name: 'Merkez' },
              period: { isLocked: false }
            }
          ],
          pagination: { total: 1, page: 1, limit: 10 }
        }
      };

      // 2. ADIM: Gerçek API'ye gitme, benim "mockApiResponse" verimi kullan diyoruz
      server.use(
        http.get('*/api/timesheets', () => HttpResponse.json(mockApiResponse))
      );

      const { result } = renderHook(() => useTimesheets());

      // 3. ADIM: Hook'un içindeki veri çekme fonksiyonunu tetikliyoruz
      await act(async () => {
        const response = await result.current.fetchTimesheets();
        expect(response.success).toBe(true);
      });

      // 4. ADIM: Veriler geldikten sonra Hook'un içindeki state (durum) değişkenleri doğru güncellenmiş mi?
      expect(result.current.timesheets).toHaveLength(1);
      expect(result.current.timesheets[0]?.name).toBe('Mustafa Bulut');
      expect(result.current.timesheets[0]?.timesheet_days['2026-05-16']).toBe('X');
      
      // TypeScript uyarılarını susturmak için any ile type-cast yapıyoruz
      expect((result.current.pagination as any)?.total).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('API "success: false" dönerse listeyi boşaltmalı', async () => {
      server.use(
        http.get('*/api/timesheets', () => HttpResponse.json({ success: false, message: 'Veri yok' }))
      );

      const { result } = renderHook(() => useTimesheets());

      await act(async () => {
        const response = await result.current.fetchTimesheets();
        // API isteği teknik olarak başarılı (200 OK) ama içindeki veri success: false
        expect(response.success).toBe(true);
        expect((response as any).data?.rows).toEqual([]);
      });

      expect(result.current.timesheets).toEqual([]);
      expect(result.current.pagination).toBeNull();
    });

    it('API hata (500) döndüğünde hatayı yakalamalı ve state i sıfırlamalı', async () => {
      server.use(
        http.get('*/api/timesheets', () => HttpResponse.json({ message: 'Sunucu hatası' }, { status: 500 }))
      );

      const { result } = renderHook(() => useTimesheets());

      await act(async () => {
        const response = await result.current.fetchTimesheets();
        expect(response.success).toBe(false);
      });

      expect(result.current.error).toBe('Sunucu hatası');
      expect(result.current.timesheets).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });
  });

  // --- fetchPeriods (Dönemleri Çekme) ---
  describe('fetchPeriods', () => {
    it('başarılı dönem verisi geldiğinde periods dizisini doldurmalı', async () => {
      // Sistemden sadece dönem verileri (Yıl ve Ay) istendiğinde sahte dönem dönüyoruz
      server.use(
        http.get('*/api/timesheets/periods', () => HttpResponse.json({
          success: true,
          data: {
            periods: [{ id: 'p-1', year: 2026, month: 5, startDate: '2026-05-01', endDate: '2026-05-31', isLocked: false }]
          }
        }))
      );

      const { result } = renderHook(() => useTimesheets());

      await act(async () => {
        await result.current.fetchPeriods();
      });

      expect(result.current.periods).toHaveLength(1);
      expect(result.current.periods[0]?.label).toBe('2026 Mayıs');
    });

    it('dönem çekerken hata olursa çökmemeli (periods boş kalmalı)', async () => {
      server.use(
        http.get('*/api/timesheets/periods', () => HttpResponse.json({}, { status: 500 }))
      );

      const { result } = renderHook(() => useTimesheets());

      await act(async () => {
        await result.current.fetchPeriods();
      });

      expect(result.current.periods).toEqual([]);
    });
  });

  // --- saveTimesheets (Değişiklikleri Kaydetme) ---
  describe('saveTimesheets', () => {
    it('kaydedilecek veri yoksa erken (early return) hata dönmeli', async () => {
      // Eğer kullanıcı boş dizi gönderirse API'ye hiç gitmeden kendi içinde hata vermesini bekliyoruz
      const { result } = renderHook(() => useTimesheets());

      let response: any;
      await act(async () => {
        response = await result.current.saveTimesheets('p-1', []);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Kaydedilecek değişiklik bulunamadı');
      expect(result.current.isSaving).toBe(false);
    });

    it('başarıyla kaydettiğinde success: true dönmeli', async () => {
      // POST işlemi (kayıt işlemi) yapıldığında başarılı döndüğünü varsayıyoruz
      server.use(
        http.post('*/api/timesheets', () => HttpResponse.json({ success: true }))
      );

      const { result } = renderHook(() => useTimesheets());
      // Sahte UI satırı
      const mockRow = { employeeId: 'emp-1', timesheet_days: { '2026-05-16': 'X' } } as any;

      let response: any;
      await act(async () => {
        response = await result.current.saveTimesheets('p-1', [mockRow]);
      });

      expect(response?.success).toBe(true);
      expect(result.current.isSaving).toBe(false);
    });

    it('kaydetme sırasında API hata döndüğünde hatayı yakalamalı', async () => {
      server.use(
        http.post('*/api/timesheets', () => HttpResponse.json({ message: 'Yetkiniz yok' }, { status: 403 }))
      );

      const { result } = renderHook(() => useTimesheets());
      const mockRow = { employeeId: 'emp-1', timesheet_days: {} } as any;

      let response: any;
      await act(async () => {
        response = await result.current.saveTimesheets('p-1', [mockRow]);
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Yetkiniz yok');
      expect(result.current.isSaving).toBe(false);
    });
  });

  // --- toggleLockPeriod (Dönem Kilidini Açma/Kapatma) ---
  describe('toggleLockPeriod', () => {
    it('başarıyla kilit durumu değiştirdiğinde success: true dönmeli', async () => {
      // PATCH isteğiyle dönem kilidi değiştirilirse, güncel durumu döndürüyoruz
      server.use(
        http.patch('*/api/timesheets/p-1/lock', () => HttpResponse.json({
          success: true,
          data: { period: { id: 'p-1', isLocked: true } }
        }))
      );

      const { result } = renderHook(() => useTimesheets());

      let response: any;
      await act(async () => {
        response = await result.current.toggleLockPeriod('p-1');
      });

      expect(response?.success).toBe(true);
      expect((response as any)?.data?.period.isLocked).toBe(true);
      expect(result.current.isLocking).toBe(false);
    });

    it('kilitleme sırasında hata oluşursa hatayı dönmeli', async () => {
      server.use(
        http.patch('*/api/timesheets/p-1/lock', () => HttpResponse.json({ message: 'Kilitleme başarısız' }, { status: 500 }))
      );

      const { result } = renderHook(() => useTimesheets());

      let response: any;
      await act(async () => {
        response = await result.current.toggleLockPeriod('p-1');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Kilitleme başarısız');
      expect(result.current.isLocking).toBe(false);
    });
  });
});
