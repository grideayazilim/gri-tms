import { useEffect, useMemo } from 'react';
import { useLocationsAndUnits } from './useLocationsAndUnits';

/**
 * Yerleşke/birim filtresi için tekrar kullanılabilir hook.
 * Yerleşke değiştiğinde birimleri otomatik yükler,
 * yerleşke temizlendiğinde birim filtresini sıfırlar.
 *
 * @param {string} locationIdFilter - Seçili yerleşke ID'si (filtre state'inden)
 * @param {Function} handleFilterChange - useFilter'dan gelen filtre güncelleme fonksiyonu
 */
export function useLocationUnitFilter(locationIdFilter, handleFilterChange) {
  const {
    locations: apiLocations,
    units: apiUnits,
    fetchLocations,
    fetchUnitsByLocation,
  } = useLocationsAndUnits();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  useEffect(() => {
    if (locationIdFilter) {
      fetchUnitsByLocation(locationIdFilter);
    } else {
      handleFilterChange('unitId', '');
    }
  }, [locationIdFilter, fetchUnitsByLocation, handleFilterChange]);

  const locationOptions = useMemo(
    () => apiLocations.map((l) => ({ label: l.name, value: String(l.id) })),
    [apiLocations],
  );

  const unitOptions = useMemo(
    () => apiUnits.map((u) => ({ label: u.name, value: String(u.id) })),
    [apiUnits],
  );

  return { locationOptions, unitOptions };
}
