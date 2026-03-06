import { useState, useCallback } from 'react';
import * as locationAndUnitService from '../../api/locationAndUnitService';

export const useLocationsAndUnits = () => {
  const [locations, setLocations] = useState([]);
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tüm yerleşkeleri getir
  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await locationAndUnitService.getLocations();
      setLocations(response.data?.locations || []);
      return { success: true, data: response.data?.locations };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Bir yerleşkeye ait birimleri getir
  const fetchUnitsByLocation = useCallback(async (locationId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await locationAndUnitService.getUnitsByLocation(locationId);
      setUnits(response.data?.units || []);
      return { success: true, data: response.data?.units };
    } catch (err) {
      setError(err.message);
      setUnits([]);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    locations,
    units,
    isLoading,
    error,
    fetchLocations,
    fetchUnitsByLocation,
  };
};