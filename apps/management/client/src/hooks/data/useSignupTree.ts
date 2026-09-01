/* ========================================================================
   USE SIGNUP TREE
   Kayıt ekranı için yerleşke + birim ağacı.

   Kayıt ekranı giriş yapmamış kullanıcıya yerleşke/birim seçtirdiği için public
   bir uca ihtiyaç duyar. Bu hook yalnızca id + ad döndüren tek public ucu
   kullanır (programNo ve employeeCount taşımaz) ve birimler için ikinci bir
   istek atmaz.
   ======================================================================== */
import { useState, useCallback, useMemo } from 'react';

import type { SignupTreeLocation, SignupTreeUnit } from '../../api/locationAndUnitService';
import { locationAndUnitService } from '../../api';
import { useAsync } from '../useAsync';

interface UseSignupTreeReturn {
  locations: SignupTreeLocation[];
  unitsFor: (locationId: string | null | undefined) => SignupTreeUnit[];
  isLoading: boolean;
  error: string | null;
  fetchTree: () => Promise<unknown>;
}

export const useSignupTree = (): UseSignupTreeReturn => {
  const [locations, setLocations] = useState<SignupTreeLocation[]>([]);
  const { isLoading, error, run } = useAsync();

  const fetchTree = useCallback(() => run(async () => {
    const response = await locationAndUnitService.getSignupTree();
    if (!response.success) {
      setLocations([]);
      return [];
    }
    const list = response.data.locations ?? [];
    setLocations(list);
    return list;
  }, { onError: () => setLocations([]) }), [run]);

  const unitIndex = useMemo(() => {
    const map = new Map<string, SignupTreeUnit[]>();
    for (const loc of locations) map.set(loc.id, loc.units ?? []);
    return map;
  }, [locations]);

  const unitsFor = useCallback(
    (locationId: string | null | undefined): SignupTreeUnit[] =>
      (locationId ? unitIndex.get(locationId) : undefined) ?? [],
    [unitIndex],
  );

  return { locations, unitsFor, isLoading, error, fetchTree };
};
