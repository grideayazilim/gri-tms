/* ========================================================================
   LOCATION & UNIT SERVICE (YERLEŞKE VE BİRİM SERVİSİ)
   Yerleşke/Birim listeleme ve senkronizasyon işlemleri.
   ======================================================================== */
import type { ApiResponse, LocationItem, UnitItem, LocationType, SyncLocationType } from '@timesheet/shared';

import { api } from './httpClient';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface LocationListData {
  locations: LocationItem[];
}

interface UnitListData {
  units: UnitItem[];
}

// ─── Servis ───────────────────────────────────────────────────────────────────

// Tüm yerleşkeleri getir
export const getLocations = () =>
  api.get<ApiResponse<LocationListData>>('/locationAndUnits/locations');

// Tüm birimleri getir
export const getUnits = () =>
  api.get<ApiResponse<UnitListData>>('/locationAndUnits/units');

// Bir yerleşkeye ait birimleri getir
export const getUnitsByLocation = (locationId: string) =>
  api.get<ApiResponse<UnitListData>>(`/locationAndUnits/locations/${locationId}/units`);

// Yerleşke oluştur
export const createLocation = (data: LocationType) =>
  api.post<ApiResponse<{ location: LocationItem }>>('/locationAndUnits/locations', data);

// Yerleşke güncelle
export const updateLocation = (locationId: string, data: LocationType) =>
  api.put<ApiResponse<{ location: LocationItem }>>(`/locationAndUnits/locations/${locationId}`, data);

// Yerleşke ve bağlı birimlerini tek seferde senkronize et (Ekle/Sil/Güncelle)
export const syncLocationWithUnits = (locationId: string, data: SyncLocationType) =>
  api.put<ApiResponse<{ location: LocationItem }>>(`/locationAndUnits/locations/${locationId}/sync`, data);

// Yerleşke sil
export const deleteLocation = (locationId: string) =>
  api.delete<ApiResponse<Record<string, never>>>(`/locationAndUnits/locations/${locationId}`);

// Birim oluştur
export const createUnit = (data: { locationId: string; name: string }) =>
  api.post<ApiResponse<{ unit: UnitItem }>>('/locationAndUnits/units', data);

// Birim güncelle
export const updateUnit = (unitId: string, data: { name: string }) =>
  api.put<ApiResponse<{ unit: UnitItem }>>(`/locationAndUnits/units/${unitId}`, data);

// Birim sil
export const deleteUnit = (unitId: string) =>
  api.delete<ApiResponse<Record<string, never>>>(`/locationAndUnits/units/${unitId}`);
