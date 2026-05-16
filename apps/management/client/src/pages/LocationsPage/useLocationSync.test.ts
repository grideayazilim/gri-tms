import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useLocationSync } from './useLocationSync';
import * as locationService from '../../api/locationAndUnitService';

/*
  useLocationSync Testleri
  - Veri yükleme (fetchData)
  - Lokasyon ekleme/güncelleme/silme/geri alma
  - Birim ekleme/güncelleme/silme/geri alma
  - hasUnsavedChanges hesaplama
  - handleSave (kaydetme) başarılı/hatalı
  - isLocationDirty / isUnitDirty
*/

vi.mock('../../api/locationAndUnitService');
vi.mock('../../components/ToastBar/useToast', () => ({
  useToast: () => vi.fn(),
}));

const mockGetLocations = vi.mocked(locationService.getLocations);
const mockGetUnits = vi.mocked(locationService.getUnits);
const mockDeleteLocation = vi.mocked(locationService.deleteLocation);
const mockSyncLocationWithUnits = vi.mocked(locationService.syncLocationWithUnits);
const mockCreateLocation = vi.mocked(locationService.createLocation);

const baseLocations = [
  { id: 1, name: 'Merkez Yerleşke', programNo: '101' },
  { id: 2, name: 'Ek Yerleşke', programNo: '202' },
];

const baseUnits = [
  { id: 10, name: 'Yazılım', locationId: 1 },
  { id: 11, name: 'İK', locationId: 1 },
  { id: 20, name: 'Muhasebe', locationId: 2 },
];

function setupMocks() {
  mockGetLocations.mockResolvedValue({ success: true, data: { locations: baseLocations } } as any);
  mockGetUnits.mockResolvedValue({ success: true, data: { units: baseUnits } } as any);
}

describe('useLocationSync hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  // ─── Veri Yükleme ─────────────────────────────────────────────────────────

  it('mount olunca lokasyon ve birimler yüklenmeli', async () => {
    const { result } = renderHook(() => useLocationSync());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.locations).toHaveLength(2);
    expect(result.current.locations[0]!.name).toBe('Merkez Yerleşke');
    expect(result.current.locations[0]!.units).toHaveLength(2);
    expect(result.current.locations[1]!.units).toHaveLength(1);
  });

  it('getLocations başarısız ise boş liste dönmeli', async () => {
    mockGetLocations.mockResolvedValue({ success: false } as any);
    mockGetUnits.mockResolvedValue({ success: true, data: { units: [] } } as any);

    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.locations).toHaveLength(0);
  });

  // ─── Lokasyon Ekleme ──────────────────────────────────────────────────────

  it('addLocation çağrılınca yeni lokasyon listeye eklenmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addLocation();
    });

    expect(result.current.locations).toHaveLength(3);
    const newLoc = result.current.locations[2]!;
    expect(newLoc.isNew).toBe(true);
    expect(newLoc.name).toBe('');
    expect(newLoc.units).toHaveLength(0);
  });

  it('addLocation ile eklenen lokasyon expandedLocations\'a eklenmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.addLocation();
    });

    const newId = result.current.locations[2]!.id;
    expect(result.current.expandedLocations).toContain(newId);
  });

  // ─── Lokasyon Güncelleme ──────────────────────────────────────────────────

  it('handleLocationChange lokasyon adını güncellemeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleLocationChange(1, 'name', 'Yeni İsim');
    });

    expect(result.current.locations[0]!.name).toBe('Yeni İsim');
  });

  it('handleLocationChange programNo\'yu güncellemeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.handleLocationChange(1, 'programNo', '999');
    });

    expect(result.current.locations[0]!.programNo).toBe('999');
  });

  // ─── Lokasyon Silme / Geri Alma ───────────────────────────────────────────

  it('removeLocation (mevcut) silindi olarak işaretlenmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.removeLocation(result.current.locations[0]!);
    });

    expect(result.current.deletedLocationIds).toContain(1);
    expect(result.current.locations).toHaveLength(2); // listeden kaldırılmamalı
  });

  it('removeLocation (yeni) listeden kaldırılmalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.addLocation(); });
    const newLoc = result.current.locations[2]!;

    act(() => {
      result.current.removeLocation(newLoc);
    });

    expect(result.current.locations).toHaveLength(2);
    expect(result.current.deletedLocationIds).not.toContain(newLoc.id);
  });

  it('undoLocation silinmiş işaretini geri almalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.removeLocation(result.current.locations[0]!); });
    expect(result.current.deletedLocationIds).toContain(1);

    act(() => { result.current.undoLocation(1); });
    expect(result.current.deletedLocationIds).not.toContain(1);
  });

  // ─── Birim Ekleme / Güncelleme / Silme ───────────────────────────────────

  it('addUnit lokasyona yeni birim eklemeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.addUnit(1); });

    expect(result.current.locations[0]!.units).toHaveLength(3);
    const newUnit = result.current.locations[0]!.units[2]!;
    expect(newUnit.isNew).toBe(true);
  });

  it('handleUnitChange birim adını güncellemeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.handleUnitChange(1, 10, 'Yeni Birim Adı'); });

    expect(result.current.locations[0]!.units[0]!.name).toBe('Yeni Birim Adı');
  });

  it('removeUnit (mevcut) silinmiş olarak işaretlenmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.removeUnit(1, result.current.locations[0]!.units[0]!); });

    expect(result.current.deletedUnitIds).toContain(10);
  });

  it('removeUnit (yeni) listeden kaldırılmalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.addUnit(1); });
    const newUnit = result.current.locations[0]!.units[2]!;

    act(() => { result.current.removeUnit(1, newUnit); });

    expect(result.current.locations[0]!.units).toHaveLength(2);
  });

  it('undoUnit birim silme işlemini geri almalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.removeUnit(1, result.current.locations[0]!.units[0]!); });
    expect(result.current.deletedUnitIds).toContain(10);

    act(() => { result.current.undoUnit(10); });
    expect(result.current.deletedUnitIds).not.toContain(10);
  });

  // ─── toggleLocationCollapse ────────────────────────────────────────────────

  it('toggleLocationCollapse lokasyonu genişletip daraltmalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.toggleLocationCollapse(1); });
    expect(result.current.expandedLocations).toContain(1);

    act(() => { result.current.toggleLocationCollapse(1); });
    expect(result.current.expandedLocations).not.toContain(1);
  });

  // ─── hasUnsavedChanges ────────────────────────────────────────────────────

  it('değişiklik olmadan hasUnsavedChanges false olmalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('lokasyon adı değişince hasUnsavedChanges true olmalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.handleLocationChange(1, 'name', 'Farklı İsim'); });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('silme işareti koyunca hasUnsavedChanges true olmalı', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.removeLocation(result.current.locations[0]!); });

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  // ─── isLocationDirty / isUnitDirty ────────────────────────────────────────

  it('isLocationDirty değişmemiş lokasyon için false dönmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLocationDirty(result.current.locations[0]!)).toBe(false);
  });

  it('isLocationDirty değişmiş lokasyon için true dönmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.handleLocationChange(1, 'name', 'Değişen İsim'); });

    expect(result.current.isLocationDirty(result.current.locations[0]!)).toBe(true);
  });

  it('isLocationDirty yeni lokasyon için true dönmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.addLocation(); });

    const newLoc = result.current.locations[2]!;
    expect(result.current.isLocationDirty(newLoc)).toBe(true);
  });

  it('isUnitDirty değişmemiş birim için false dönmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const unit = result.current.locations[0]!.units[0]!;
    expect(result.current.isUnitDirty(1, unit)).toBe(false);
  });

  it('isUnitDirty değişmiş birim için true dönmeli', async () => {
    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.handleUnitChange(1, 10, 'Değişen Birim'); });

    const unit = result.current.locations[0]!.units[0]!;
    expect(result.current.isUnitDirty(1, unit)).toBe(true);
  });

  // ─── handleSave ───────────────────────────────────────────────────────────

  it('handleSave silinen lokasyonları API\'ye göndermeli', async () => {
    mockDeleteLocation.mockResolvedValue({ success: true } as any);
    mockSyncLocationWithUnits.mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.removeLocation(result.current.locations[0]!); });

    await act(async () => { await result.current.handleSave(); });

    expect(mockDeleteLocation).toHaveBeenCalledWith('1');
  });

  it('handleSave değişen lokasyonları sync etmeli', async () => {
    mockSyncLocationWithUnits.mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.handleLocationChange(1, 'name', 'Güncel İsim'); });

    await act(async () => { await result.current.handleSave(); });

    expect(mockSyncLocationWithUnits).toHaveBeenCalled();
  });

  it('handleSave yeni lokasyonu createLocation ile oluşturmalı', async () => {
    mockCreateLocation.mockResolvedValue({
      success: true,
      data: { location: { id: 99, name: 'Yeni Loc', programNo: '' } },
    } as any);
    mockSyncLocationWithUnits.mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.addLocation(); });
    act(() => { result.current.handleLocationChange(result.current.locations[2]!.id, 'name', 'Yeni Lokasyon'); });

    await act(async () => { await result.current.handleSave(); });

    expect(mockCreateLocation).toHaveBeenCalled();
  });

  it('handleSave sonrası deletedLocationIds temizlenmeli', async () => {
    mockDeleteLocation.mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useLocationSync());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.removeLocation(result.current.locations[0]!); });
    await act(async () => { await result.current.handleSave(); });

    expect(result.current.deletedLocationIds).toHaveLength(0);
  });
});
