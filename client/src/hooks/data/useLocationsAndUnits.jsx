import { useState, useCallback } from 'react';
import { locationAndUnitService } from '../../api';
import { useAsync } from '../useAsync';

export const useLocationsAndUnits = () => {
  const [locations, setLocations] = useState([]);
  const [units, setUnits] = useState([]);
  const { isLoading, error, run } = useAsync();

  const fetchLocations = useCallback(() => run(async () => {
    const response = await locationAndUnitService.getLocations();
    setLocations(response.data?.locations || []);
    return { success: true, data: response.data?.locations };
  }), [run]);

  const fetchUnitsByLocation = useCallback((locationId) => run(
    async () => {
      const response = await locationAndUnitService.getUnitsByLocation(locationId);
      setUnits(response.data?.units || []);
      return { success: true, data: response.data?.units };
    },
    { onError: () => setUnits([]) },
  ), [run]);

  return { locations, units, isLoading, error, fetchLocations, fetchUnitsByLocation };
};
