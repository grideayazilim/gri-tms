import { useState, useEffect, useCallback } from 'react';
import * as locationService from '../../api/locationAndUnitService';
import { useToast } from '../../components/ToastBar/useToast';

export interface UnitData {
  id: number | string;
  isNew?: boolean;
  name: string;
}

export interface LocationData {
  id: number | string;
  isNew?: boolean;
  name: string;
  programNo: string;
  units: UnitData[];
}

export function useLocationSync() {
  const toast = useToast();

  const [locations, setLocations] = useState<LocationData[]>([]);
  const [initialLocations, setInitialLocations] = useState<LocationData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletedLocationIds, setDeletedLocationIds] = useState<(number | string)[]>([]);
  const [deletedUnitIds, setDeletedUnitIds] = useState<(number | string)[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<(number | string)[]>([]);
  const [focusElementId, setFocusElementId] = useState<string | null>(null);
  const [validationTriggered, setValidationTriggered] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setValidationTriggered(false);
      const [locRes, unitRes] = await Promise.all([
        locationService.getLocations(),
        locationService.getUnits(),
      ]);

      const locs = locRes.success ? locRes.data.locations : [];
      const allUnits = unitRes.success ? unitRes.data.units : [];

      const enrichedLocations: LocationData[] = locs.map((loc) => ({
        ...loc,
        units: allUnits.filter((u) => u.locationId === loc.id),
      }));

      setLocations(enrichedLocations);
      setInitialLocations(JSON.parse(JSON.stringify(enrichedLocations)) as LocationData[]);
    } catch {
      toast({ type: 'error', message: 'Veriler yüklenirken bir hata oluştu' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const timer = setTimeout(() => { void fetchData(); }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    if (focusElementId) {
      const el = document.getElementById(focusElementId);
      if (el) {
        el.focus();
        setTimeout(() => setFocusElementId(null), 0);
      }
    }
  }, [locations, expandedLocations, focusElementId]);

  const toggleLocationCollapse = (id: number | string) => {
    setExpandedLocations((prev) =>
      prev.includes(id) ? prev.filter((locId) => locId !== id) : [...prev, id],
    );
  };

  const handleLocationChange = (id: number | string, field: keyof LocationData, value: string) => {
    // Yerleşke adı her zaman büyük harfli kaydedilir (resmi belge gereği)
    const normalizedValue = field === 'name' ? value.toLocaleUpperCase('tr-TR') : value;
    setLocations((prev) =>
      prev.map((loc) => (loc.id === id ? { ...loc, [field]: normalizedValue } : loc)),
    );
  };

  const addLocation = () => {
    const newId = Date.now();
    setLocations((prev) => [...prev, { id: newId, isNew: true, name: '', programNo: '', units: [] }]);
    setExpandedLocations((prev) => [...prev, newId]);
    setFocusElementId(`loc-name-${newId}`);
  };

  const removeLocation = (loc: LocationData) => {
    if (loc.isNew) {
      setLocations((prev) => prev.filter((l) => l.id !== loc.id));
      setExpandedLocations((prev) => prev.filter((id) => id !== loc.id));
    } else {
      setDeletedLocationIds((prev) => [...prev, loc.id]);
    }
  };

  const undoLocation = (id: number | string) => {
    setDeletedLocationIds((prev) => prev.filter((delId) => delId !== id));
  };

  const handleUnitChange = (locId: number | string, unitId: number | string, value: string) => {
    // Birim adı her zaman büyük harfli kaydedilir (resmi belge gereği)
    const upperValue = value.toLocaleUpperCase('tr-TR');
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return {
          ...loc,
          units: loc.units.map((unit) =>
            unit.id === unitId ? { ...unit, name: upperValue } : unit,
          ),
        };
      }),
    );
  };

  const addUnit = (locId: number | string) => {
    const newId = Date.now();
    setLocations((prev) =>
      prev.map((loc) => {
        if (loc.id !== locId) return loc;
        return { ...loc, units: [...loc.units, { id: newId, isNew: true, name: '' }] };
      }),
    );
    setFocusElementId(`unit-name-${newId}`);
  };

  const removeUnit = (locId: number | string, unit: UnitData) => {
    if (unit.isNew) {
      setLocations((prev) =>
        prev.map((loc) => {
          if (loc.id !== locId) return loc;
          return { ...loc, units: loc.units.filter((u) => u.id !== unit.id) };
        }),
      );
    } else {
      setDeletedUnitIds((prev) => [...prev, unit.id]);
    }
  };

  const undoUnit = (unitId: number | string) => {
    setDeletedUnitIds((prev) => prev.filter((delId) => delId !== unitId));
  };

  const isLocationDirty = (loc: LocationData) => {
    if (loc.isNew) return true;
    const initLoc = initialLocations.find((l) => l.id === loc.id);
    if (!initLoc) return true;
    return loc.name !== initLoc.name || loc.programNo !== initLoc.programNo;
  };

  const isUnitDirty = (locId: number | string, unit: UnitData) => {
    if (unit.isNew) return true;
    const initLoc = initialLocations.find((l) => l.id === locId);
    if (!initLoc) return true;
    const initUnit = initLoc.units.find((u) => u.id === unit.id);
    if (!initUnit) return true;
    return unit.name !== initUnit.name;
  };

  const locationHasChanges = (loc: LocationData) => {
    if (loc.isNew) return false;
    const initLoc = initialLocations.find((l) => l.id === loc.id);
    if (!initLoc) return true;
    if (loc.name !== initLoc.name || loc.programNo !== initLoc.programNo) return true;
    if (initLoc.units.some((u) => deletedUnitIds.includes(u.id))) return true;
    const activeUnits = loc.units.filter((u) => !deletedUnitIds.includes(u.id));
    if (activeUnits.some((u) => u.isNew || isUnitDirty(loc.id, u))) return true;
    return false;
  };

  const handleSave = async () => {
    // Client-side validation
    for (const loc of locations) {
      if (deletedLocationIds.includes(loc.id)) continue;
      if (!loc.name.trim()) {
        setValidationTriggered(true);
        toast({ type: 'error', message: 'Yerleşke adı boş bırakılamaz.' });
        return;
      }
      if (!loc.programNo.trim()) {
        setValidationTriggered(true);
        toast({ type: 'error', message: 'Program numarası boş bırakılamaz.' });
        return;
      }
      const activeUnits = loc.units.filter((u) => !deletedUnitIds.includes(u.id));
      for (const unit of activeUnits) {
        if (!unit.name.trim()) {
          setValidationTriggered(true);
          toast({ type: 'error', message: 'Birim adı boş bırakılamaz.' });
          return;
        }
      }
    }

    setValidationTriggered(false);
    setIsSaving(true);
    try {
      const locationsToSync = locations.filter(
        (loc) => !deletedLocationIds.includes(loc.id) && (loc.isNew || locationHasChanges(loc)),
      );

      await Promise.all([
        ...deletedLocationIds.map((id) => locationService.deleteLocation(String(id))),
        ...locationsToSync.map(async (loc) => {
          if (loc.isNew) {
            const createRes = await locationService.createLocation({ name: loc.name, programNo: loc.programNo });
            if (!createRes.success) throw new Error(createRes.message);
            const newLocId = createRes.data.location.id;
            if (loc.units?.length > 0) {
              await locationService.syncLocationWithUnits(String(newLocId), {
                name: loc.name,
                programNo: loc.programNo,
                units: loc.units.map((u) => ({ name: u.name })),
              });
            }
          } else {
            await locationService.syncLocationWithUnits(String(loc.id), {
              name: loc.name,
              programNo: loc.programNo,
              units: loc.units
                .filter((u) => !deletedUnitIds.includes(u.id))
                .map((u) => ({ id: u.isNew ? undefined : String(u.id), name: u.name })),
            });
          }
        }),
      ]);

      toast({ type: 'success', message: 'Değişiklikler başarıyla kaydedildi' });
      setDeletedLocationIds([]);
      setDeletedUnitIds([]);
      void fetchData();
    } catch (error: any) {
      const msg = error?.message || 'Kaydedilirken bir hata oluştu';
      toast({ type: 'error', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges =
    deletedLocationIds.length > 0 ||
    deletedUnitIds.length > 0 ||
    JSON.stringify(locations) !== JSON.stringify(initialLocations);

  return {
    locations,
    isLoading,
    isSaving,
    deletedLocationIds,
    deletedUnitIds,
    expandedLocations,
    hasUnsavedChanges,
    toggleLocationCollapse,
    handleLocationChange,
    addLocation,
    removeLocation,
    undoLocation,
    handleUnitChange,
    addUnit,
    removeUnit,
    undoUnit,
    handleSave,
    isLocationDirty,
    isUnitDirty,
    validationTriggered,
  };
}
