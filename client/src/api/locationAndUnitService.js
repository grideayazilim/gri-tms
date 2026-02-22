import { api } from './httpClient';

// Tüm yerleşkeleri getir
export const getLocations = async () => {
  const response = await api.get('/locationAndUnits/locations');
  return response;
};

// Bir yerleşkeye ait birimleri getir
export const getUnitsByLocation = async (locationId) => {
  const response = await api.get(`/locationAndUnits/locations/${locationId}/units`);
  return response;
};