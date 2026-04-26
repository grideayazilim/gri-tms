/* ========================================================================
   LOCATION & UNIT SERVICE (YERLEŞKE VE BİRİM SERVİSİ)
   Yerleşke/Birim listeleme ve senkronizasyon işlemleri.
   ======================================================================== */
import { api } from './httpClient';


// Tüm yerleşkeleri getir
export const getLocations = async () => {
  return await api.get('/locationAndUnits/locations');
};

// Tüm birimleri getir
export const getUnits = async () => {
  return await api.get('/locationAndUnits/units');
};

// Bir yerleşkeye ait birimleri getir
export const getUnitsByLocation = async (locationId) => {
  return await api.get(`/locationAndUnits/locations/${locationId}/units`);
};

// Yerleşke oluştur
export const createLocation = async (data) => {
  return await api.post('/locationAndUnits/locations', data);
};

// Yerleşke güncelle
export const updateLocation = async (locationId, data) => {
  return await api.put(`/locationAndUnits/locations/${locationId}`, data);
};

// Yerleşke ve birimleri senkronize et (Toplu güncelleme/ekleme/silme)
// Yerleşke ve bağlı birimlerini tek seferde senkronize et (Ekle/Sil/Güncelle)
export const syncLocationWithUnits = async (locationId, data) => {
  return api.put(`/locations/${locationId}/sync`, data);
};

// Yerleşke sil
export const deleteLocation = async (locationId) => {
  return await api.delete(`/locationAndUnits/locations/${locationId}`);
};

// Birim oluştur
export const createUnit = async (data) => {
  return await api.post('/locationAndUnits/units', data);
};

// Birim güncelle
export const updateUnit = async (unitId, data) => {
  return await api.put(`/locationAndUnits/units/${unitId}`, data);
};

// Birim sil
export const deleteUnit = async (unitId) => {
  return await api.delete(`/locationAndUnits/units/${unitId}`);
};