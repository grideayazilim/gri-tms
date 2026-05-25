/* ========================================================================
   USE LOCATION UNIT FILTER
   Yerleşke/birim filtresi için tekrar kullanılabilir hook.
   Yerleşke değiştiğinde birimleri otomatik yükler,
   yerleşke temizlendiğinde birim filtresini sıfırlar.
   ======================================================================== */
import { useEffect, useMemo } from 'react';

import { useLocationsAndUnits } from './useLocationsAndUnits';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface FilterOption {
  label: string;
  value: string;
}

interface UseLocationUnitFilterReturn {
  locationOptions: FilterOption[];
  unitOptions: FilterOption[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocationUnitFilter(
  locationIdFilter: string,
  handleFilterChange: (key: string, value: string) => void,
): UseLocationUnitFilterReturn {
  const {
    locations: apiLocations,
    units: apiUnits,
    fetchLocations,
    fetchUnitsByLocation,
  } = useLocationsAndUnits();

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    handleFilterChange('unitId', '');
    if (locationIdFilter) {
      void fetchUnitsByLocation(locationIdFilter);
    }
  }, [locationIdFilter, fetchUnitsByLocation, handleFilterChange]);

  const locationOptions = useMemo<FilterOption[]>(
    () => apiLocations.map((l) => ({ label: l.name, value: String(l.id) })),
    [apiLocations],
  );

  const unitOptions = useMemo<FilterOption[]>(
    () => apiUnits.map((u) => ({ label: u.name, value: String(u.id) })),
    [apiUnits],
  );

  return { locationOptions, unitOptions };
}
