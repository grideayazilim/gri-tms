import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { usePublicHolidays } from './usePublicHolidays';

describe('usePublicHolidays hook', () => {
  it('başlangıçta veya period null iken boş dönmeli', () => {
    const { result } = renderHook(() => usePublicHolidays(null));

    expect(result.current.holidayDays.size).toBe(0);
    expect(result.current.holidayNames.size).toBe(0);
    expect(result.current.isPublicHoliday('2026-01-01')).toBe(false);
    expect(result.current.getHolidayName('2026-01-01')).toBeNull();
  });

  it('verilen döneme (period) ait yılı çözüp tatilleri API den çekmeli ve fonksiyonları doğru çalıştırmalı', async () => {
    server.use(
      http.get('*/api/holidays', ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('year') === '2026') {
          return HttpResponse.json({
            success: true,
            data: {
              holidays: [
                { date: '2026-01-01', localName: 'Yılbaşı', name: 'New Year' },
                { date: '2026-04-23', localName: 'Ulusal Egemenlik ve Çocuk Bayramı', name: 'Childrens Day' }
              ]
            }
          });
        }
        return HttpResponse.json({ success: true, data: { holidays: [] } });
      })
    );

    const { result } = renderHook(() => usePublicHolidays('2026-05'));

    // useEffect içinde API çağrısı yapıldığı için sonucun gelmesini bekliyoruz
    await waitFor(() => {
      expect(result.current.holidayDays.size).toBe(2);
    });

    // Set ve Map yapıları doğru dolmalı
    expect(result.current.holidayDays.has('2026-01-01')).toBe(true);
    expect(result.current.holidayNames.get('2026-04-23')).toBe('Ulusal Egemenlik ve Çocuk Bayramı');

    // Yardımcı fonksiyonlar doğru çalışmalı
    expect(result.current.isPublicHoliday('2026-01-01')).toBe(true);
    expect(result.current.isPublicHoliday('2026-05-16')).toBe(false);
    
    expect(result.current.getHolidayName('2026-04-23')).toBe('Ulusal Egemenlik ve Çocuk Bayramı');
    expect(result.current.getHolidayName('2026-05-16')).toBeNull();
  });

  it('API den hata gelirse veya ağ hatası olursa program çökmemeli ve listeyi boş bırakmalı', async () => {
    // console.error çağrısını test sırasında gizlemek için (çıktı kirlenmesin)
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    server.use(
      http.get('*/api/holidays', () => HttpResponse.json({ message: 'Sunucu koptu' }, { status: 500 }))
    );

    const { result } = renderHook(() => usePublicHolidays('2026-05'));

    // API'nin hata atıp bitmesini bekleyelim (asenkron işlem süresi kadar)
    await waitFor(() => {
      expect(spy).toHaveBeenCalled(); // Hata mesajının loglandığını doğruladık
    });

    // Hook hata verse bile programı çökertmemeli ve boş liste dönmeli
    expect(result.current.holidayDays.size).toBe(0);
    expect(result.current.isPublicHoliday('2026-01-01')).toBe(false);

    spy.mockRestore(); // console.error'ı eski haline geri döndür
  });
});
