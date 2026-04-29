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
    const data = (response as { data?: { locations?: LocationItem[] } }).data;
    setLocations(data?.locations ?? []);
    return data?.locations ?? [];
  }), [run]);

  const fetchUnitsByLocation = useCallback((locationId: string) => run(
    async () => {
      const response = await locationAndUnitService.getUnitsByLocation(locationId);
      const data = (response as { data?: { units?: UnitItem[] } }).data;
      setUnits(data?.units ?? []);
      return data?.units ?? [];
    },
    { onError: () => setUnits([]) },
  ), [run]);

  return { locations, units, isLoading, error, fetchLocations, fetchUnitsByLocation };
};
