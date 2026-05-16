import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../vitest.setup';
import { useLocationsAndUnits } from './useLocationsAndUnits';

describe('useLocationsAndUnits hook', () => {
  it('başlangıç değerleri doğru olmalı', () => {
    const { result } = renderHook(() => useLocationsAndUnits());

    expect(result.current.locations).toEqual([]);
    expect(result.current.units).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // --- fetchLocations ---
  describe('fetchLocations', () => {
    it('başarıyla yerleşkeleri çektiğinde locations state ini güncellemeli', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations', () => HttpResponse.json({
          success: true,
          data: {
            locations: [{ id: 'loc-1', name: 'Merkez Kampüs' }]
          }
        }))
      );

      const { result } = renderHook(() => useLocationsAndUnits());

      let response: any;
      await act(async () => {
        response = await result.current.fetchLocations();
      });

      expect(response?.success).toBe(true);
      expect((response as any)?.data).toHaveLength(1);
      expect(result.current.locations[0]?.name).toBe('Merkez Kampüs');
      expect(result.current.isLoading).toBe(false);
    });

    it('yerleşkeleri çekerken hata olursa listeyi boşaltmalı ve hata dönmeli', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations', () => HttpResponse.json({ message: 'Sunucu Hatası' }, { status: 500 }))
      );

      const { result } = renderHook(() => useLocationsAndUnits());

      let response: any;
      await act(async () => {
        response = await result.current.fetchLocations();
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Sunucu Hatası');
      expect(result.current.error).toBe('Sunucu Hatası');
      expect(result.current.locations).toEqual([]);
    });
  });

  // --- fetchUnitsByLocation ---
  describe('fetchUnitsByLocation', () => {
    it('seçilen yerleşkeye göre birimleri başarıyla çekmeli', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations/loc-1/units', () => HttpResponse.json({
          success: true,
          data: {
            units: [{ id: 'u-1', locationId: 'loc-1', name: 'Bilgi İşlem' }]
          }
        }))
      );

      const { result } = renderHook(() => useLocationsAndUnits());

      let response: any;
      await act(async () => {
        response = await result.current.fetchUnitsByLocation('loc-1');
      });

      expect(response?.success).toBe(true);
      expect(result.current.units[0]?.name).toBe('Bilgi İşlem');
    });

    it('birimleri çekerken API success: false dönerse listeyi boşaltmalı', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations/loc-1/units', () => HttpResponse.json({
          success: false,
          message: 'Birim bulunamadı'
        }))
      );

      const { result } = renderHook(() => useLocationsAndUnits());

      let response: any;
      await act(async () => {
        response = await result.current.fetchUnitsByLocation('loc-1');
      });

      // API success:false döndüğü için useAsync try bloğunda bunu döndürür ve data maplenir.
      // Hook içinde !response.success ise boş array dönüyor:
      expect(response?.success).toBe(true); // useAsync try'ı başarılı tamamladı
      expect((response as any)?.data).toEqual([]); // İçerik boş döndürüldü
      expect(result.current.units).toEqual([]);
    });

    it('birimleri çekerken network (500) hatası olursa catch bloğuna düşüp hatayı fırlatmalı', async () => {
      server.use(
        http.get('*/api/locationAndUnits/locations/loc-1/units', () => HttpResponse.json({ message: 'Ağ hatası' }, { status: 500 }))
      );

      const { result } = renderHook(() => useLocationsAndUnits());

      let response: any;
      await act(async () => {
        response = await result.current.fetchUnitsByLocation('loc-1');
      });

      expect(response?.success).toBe(false);
      expect(response?.error).toBe('Ağ hatası');
      expect(result.current.error).toBe('Ağ hatası');
      expect(result.current.units).toEqual([]); // onError sayesinde units temizlenir
    });
  });

  it('fetchLocations — HTTP 200 success:false döndüğünde boş liste dönmeli', async () => {
    server.use(
      http.get('*/api/locationAndUnits/locations', () => HttpResponse.json({ success: false }))
    );
    const { result } = renderHook(() => useLocationsAndUnits());
    await act(async () => { await result.current.fetchLocations(); });
    expect(result.current.locations).toEqual([]);
  });
});
