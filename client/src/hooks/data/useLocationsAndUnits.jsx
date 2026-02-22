import { useState } from 'react';
import * as locationAndUnitService from '../../api/locationAndUnitService';

export const useLocationsAndUnits = () => {
  const [locations, setLocations] = useState([]);
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tüm yerleşkeleri getir
  const fetchLocations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await locationAndUnitService.getLocations();
      setLocations(response.data || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  // Bir yerleşkeye ait birimleri getir
  const fetchUnitsByLocation = async (locationId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await locationAndUnitService.getUnitsByLocation(locationId);
      setUnits(response.data || []);
      return { success: true, data: response.data };
    } catch (err) {
      setError(err.message);
      setUnits([]);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    locations,
    units,
    isLoading,
    error,
    fetchLocations,
    fetchUnitsByLocation,
  };
};