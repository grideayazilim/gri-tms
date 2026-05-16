import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocationUnitFilter } from './useLocationUnitFilter';

/*
  useLocationUnitFilter Testleri
  - Başlangıçta fetchLocations çağrılmalı
  - locationIdFilter değişince fetchUnitsByLocation çağrılmalı
  - locationIdFilter temizlenince unit filtresi sıfırlanmalı
  - locationOptions ve unitOptions doğru map'lenmeli
*/

const mockFetchLocations = vi.fn();
const mockFetchUnitsByLocation = vi.fn();

vi.mock('./useLocationsAndUnits', () => ({
  useLocationsAndUnits: () => ({
    locations: [
      { id: 1, name: 'Merkez Yerleşke' },
      { id: 2, name: 'Ek Yerleşke' },
    ],
    units: [
      { id: 10, name: 'Yazılım Birimi' },
      { id: 11, name: 'İnsan Kaynakları' },
    ],
    fetchLocations: mockFetchLocations,
    fetchUnitsByLocation: mockFetchUnitsByLocation,
  }),
}));

describe('useLocationUnitFilter hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mount olunca fetchLocations çağrılmalı', () => {
    const handleChange = vi.fn();
    renderHook(() => useLocationUnitFilter('', handleChange));

    expect(mockFetchLocations).toHaveBeenCalledTimes(1);
  });

  it('locationIdFilter verilince fetchUnitsByLocation çağrılmalı', () => {
    const handleChange = vi.fn();
    renderHook(() => useLocationUnitFilter('1', handleChange));

    expect(mockFetchUnitsByLocation).toHaveBeenCalledWith('1');
  });

  it('locationIdFilter boş iken handleFilterChange(unitId, \'\') çağrılmalı', () => {
    const handleChange = vi.fn();
    renderHook(() => useLocationUnitFilter('', handleChange));

    expect(handleChange).toHaveBeenCalledWith('unitId', '');
  });

  it('locationIdFilter değişince yeni birimler fetch edilmeli', () => {
    const handleChange = vi.fn();
    const { rerender } = renderHook(
      ({ locationId }) => useLocationUnitFilter(locationId, handleChange),
      { initialProps: { locationId: '1' } },
    );

    expect(mockFetchUnitsByLocation).toHaveBeenCalledWith('1');

    rerender({ locationId: '2' });

    expect(mockFetchUnitsByLocation).toHaveBeenCalledWith('2');
  });

  it('locationIdFilter temizlenince handleFilterChange(unitId, \'\') çağrılmalı', () => {
    const handleChange = vi.fn();
    const { rerender } = renderHook(
      ({ locationId }) => useLocationUnitFilter(locationId, handleChange),
      { initialProps: { locationId: '1' } },
    );

    rerender({ locationId: '' });

    expect(handleChange).toHaveBeenCalledWith('unitId', '');
  });

  it('locationOptions API verilerini doğru label/value ile map\'lemeli', () => {
    const handleChange = vi.fn();
    const { result } = renderHook(() => useLocationUnitFilter('', handleChange));

    expect(result.current.locationOptions).toEqual([
      { label: 'Merkez Yerleşke', value: '1' },
      { label: 'Ek Yerleşke', value: '2' },
    ]);
  });

  it('unitOptions API verilerini doğru label/value ile map\'lemeli', () => {
    const handleChange = vi.fn();
    const { result } = renderHook(() => useLocationUnitFilter('1', handleChange));

    expect(result.current.unitOptions).toEqual([
      { label: 'Yazılım Birimi', value: '10' },
      { label: 'İnsan Kaynakları', value: '11' },
    ]);
  });
});
