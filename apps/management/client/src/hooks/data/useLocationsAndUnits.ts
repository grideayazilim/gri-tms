/* ========================================================================
   USE LOCATIONS AND UNITS
   Yerleşke ve birim verileri için hook.
   ======================================================================== */
import { useState, useCallback } from 'react';

import type { LocationItem, UnitItem } from '@timesheet/shared';

import { locationAndUnitService } from '../../api';
import { useAsync } from '../useAsync';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface UseLocationsAndUnitsReturn {
  locations: LocationItem[];
  units: UnitItem[];
  isLoading: boolean;
  error: string | null;
  fetchLocations: () => Promise<unknown>;
  fetchUnitsByLocation: (locationId: string) => Promise<unknown>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useLocationsAndUnits = (): UseLocationsAndUnitsReturn => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const { isLoading, error, run } = useAsync();

  const fetchLocations = useCallback(() => run(async () => {
    const response = await locationAndUnitService.getLocations();
    if (!response.success) {
      setLocations([]);
      return [];
    }
    const list = response.data.locations ?? [];
    setLocations(list);
    return list;
  }), [run]);

  const fetchUnitsByLocation = useCallback((locationId: string) => run(
    async () => {
      const response = await locationAndUnitService.getUnitsByLocation(locationId);
      if (!response.success) {
        setUnits([]);
        return [];
      }
      const list = response.data.units ?? [];
      setUnits(list);
      return list;
    },
    { onError: () => setUnits([]) },
  ), [run]);

  return { locations, units, isLoading, error, fetchLocations, fetchUnitsByLocation };
};
