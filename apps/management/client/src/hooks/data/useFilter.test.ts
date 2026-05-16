import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFilter, type FilterField } from './useFilter';

const mockConfig: ReadonlyArray<FilterField> = [
  { key: 'role', apiParam: 'roleId', label: 'Rol', type: 'select', options: [{ value: '1', label: 'Admin' }] },
  { key: 'search', apiParam: 'q', label: 'Arama', type: 'text' },
  { key: 'startDate', apiParam: 'date_gte', label: 'Tarih', type: 'date' },
  { key: 'status', apiParam: 'statusId', label: 'Durum', type: 'select', options: [], apiFormat: (v) => Number(v) }
] as const;

describe('useFilter hook', () => {
  beforeEach(() => {
    // Debounce (zamanlayıcı) testi için sahte zamanlayıcıları açıyoruz
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Her testten sonra gerçek zamana geri dön
    vi.useRealTimers();
  });

  it('başlangıç değerleri (initialFilters) doğru atanmalı', () => {
    const { result } = renderHook(() => useFilter(mockConfig, { role: '1' }));

    // Filtreler doğru başlamalı
    expect(result.current.filters).toEqual({ role: '1' });
    // apiParams, select türü olduğu için beklemeden (debounce olmadan) oluşmalı
    expect(result.current.apiParams).toEqual({ roleId: '1' });
  });

  it('Select ve Date alanları değiştirildiğinde apiParams anında güncellenmeli', () => {
    const { result } = renderHook(() => useFilter(mockConfig, {}));

    // Boş başlıyor
    expect(result.current.apiParams).toEqual({});

    act(() => {
      result.current.handleFilterChange('role', '2');
    });

    // Select olduğu için debounce beklenmez, anında yansır
    expect(result.current.filters).toEqual({ role: '2' });
    expect(result.current.apiParams).toEqual({ roleId: '2' });

    act(() => {
      result.current.handleFilterChange('startDate', '2026-05-16');
    });

    // Date olduğu için anında yansır
    expect(result.current.filters).toEqual({ role: '2', startDate: '2026-05-16' });
    expect(result.current.apiParams).toEqual({ roleId: '2', date_gte: '2026-05-16' });
  });

  it('Text alanları değiştirildiğinde apiParams debounce (400ms) sonrası güncellenmeli', () => {
    const { result } = renderHook(() => useFilter(mockConfig, {}));

    act(() => {
      result.current.handleFilterChange('search', 'mustafa');
    });

    // UI'daki filtre anında güncellenir
    expect(result.current.filters).toEqual({ search: 'mustafa' });
    // Ama api'ye gidecek parametre (debounce bitmediği için) henüz güncellenmez
    expect(result.current.apiParams).toEqual({});

    act(() => {
      // 399ms ileri sar (henüz 400 olmadı)
      vi.advanceTimersByTime(399);
    });
    expect(result.current.apiParams).toEqual({});

    act(() => {
      // 1ms daha ileri sar (toplam 400ms oldu)
      vi.advanceTimersByTime(1);
    });
    // Şimdi güncellenmeli
    expect(result.current.apiParams).toEqual({ q: 'mustafa' });
  });

  it('apiFormat fonksiyonu varsa apiParams formatlanmalı', () => {
    const { result } = renderHook(() => useFilter(mockConfig, {}));

    act(() => {
      // Status string olarak gelir (örneğin event.target.value her zaman string'dir)
      result.current.handleFilterChange('status', '5');
    });

    // Filtre text olarak durur
    expect(result.current.filters).toEqual({ status: '5' });
    // Ama apiParams'a apiFormat sayesinde sayı (Number) olarak dönüştürülüp konur
    expect(result.current.apiParams).toEqual({ statusId: 5 });
  });

  it('Filtre temizlendiğinde (boş string) apiParams dan o anahtar silinmeli', () => {
    const { result } = renderHook(() => useFilter(mockConfig, { role: '1' }));

    act(() => {
      result.current.handleFilterChange('role', '');
    });

    expect(result.current.filters).toEqual({ role: '' });
    // Değer boş olduğu için apiParams içine roleId eklenmez
    expect(result.current.apiParams).toEqual({});
  });
});
