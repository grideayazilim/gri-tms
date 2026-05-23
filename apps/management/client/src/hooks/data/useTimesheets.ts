import { useState, useCallback } from 'react';

import type { MarkerCode, PaginationMeta, PeriodItem, Result, TimesheetListItem } from '@timesheet/shared';

import { timesheetService } from '../../api';
import { TURKISH_MONTHS_UPPER } from '../../utils/dateUtils';
import { getErrorMessage } from '../../utils/getErrorMessage';

// ─────────────────────────────────────────────────────────────────
// TİPLER (TYPES)
// ─────────────────────────────────────────────────────────────────

export type { MarkerCode };

export interface UIPeriod {
  value: string;
  label: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
  id: string;
}

export interface TimesheetUIRow {
  id: string;
  timesheetId: string | null;
  employeeId: string;
  tc: string | null;
  name: string;
  unit: string | null;
  unitId: string | null;
  location: string | null;
  locationId: string | null;
  periodId: string;
  isLocked: boolean;
  timesheet_days: Record<string, MarkerCode>;
  workDaysCount?: number;
}

export interface UseTimesheetsReturn {
  timesheets: TimesheetUIRow[];
  setTimesheets: React.Dispatch<React.SetStateAction<TimesheetUIRow[]>>;
  pagination: PaginationMeta | null;
  periods: UIPeriod[];
  isLoading: boolean;
  isSaving: boolean;
  isLocking: boolean;
  error: string | null;
  fetchTimesheets: (apiParams?: Record<string, string | number | undefined>) => Promise<Result<{ rows: TimesheetUIRow[] }>>;
  fetchPeriods: () => Promise<void>;
  saveTimesheets: (periodId: string, changedUIRows: TimesheetUIRow[]) => Promise<Result<Record<string, never>>>;
  toggleLockPeriod: (periodId: string) => Promise<Result<{ period: PeriodItem }>>;
}

// ─────────────────────────────────────────────────────────────────
// DATA MAPPING — API ↔ UI dönüşümleri
// ─────────────────────────────────────────────────────────────────

// Dönem bilgisini Dropdown (Select) bileşeninin beklediği formatına sokar
const mapPeriod = (p: PeriodItem): UIPeriod => ({
  id: p.id,
  value: `${p.year}-${String(p.month).padStart(2, '0')}`,
  label: `${p.year} ${TURKISH_MONTHS_UPPER[p.month - 1] ?? ''}`,
  startDate: p.startDate,
  endDate: p.endDate,
  isLocked: p.isLocked,
});

// API'den gelen iç içe geçmiş (nested) puantaj verisini UI tablosunun hızlıca
// okuyabileceği düz (flat) bir objeye dönüştürür.
const mapTimesheetToUI = (ts: TimesheetListItem): TimesheetUIRow => {
  const timesheet_days: Record<string, MarkerCode> = {};
  
  // Günleri 'YYYY-MM-DD': 'X' şeklinde bir Map objesine çeviriyoruz (O(1) erişim için)
  (ts.timesheet.days ?? []).forEach(({ day, markerCode }) => {
    if (day && markerCode) {
      timesheet_days[day] = markerCode;
    }
  });

  return {
    id: ts.timesheet.id ?? `new-${ts.employee.id}`,
    timesheetId: ts.timesheet.id,
    employeeId: ts.employee.id,
    tc: ts.employee.tcNo,
    name: `${ts.employee.firstName} ${ts.employee.lastName}`,
    unit: ts.unit?.name ?? null,
    unitId: ts.unit?.id ?? null,
    location: ts.location?.name ?? null,
    locationId: ts.location?.id ?? null,
    periodId: ts.timesheet.periodId,
    // API tarafındaki Period join'e bağlı isLocked alanının güvenli erişimi
    isLocked: ts.period?.isLocked ?? false,
    timesheet_days,
    // totalWorkDays varsa ekle
    ...(ts.totalWorkDays !== undefined ? { workDaysCount: ts.totalWorkDays } : {}),
  };
};

// Tablodaki düz veriyi tekrar API'nin beklediği { employeeId, days: [] } formatına sokar
const mapUIToSavePayload = (uiRows: TimesheetUIRow[]) =>
  uiRows.map((row) => ({
    employeeId: row.employeeId,
    days: Object.entries(row.timesheet_days ?? {}).map(([day, markerCode]) => ({
      day,
      markerCode,
    })),
  }));

// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

export const useTimesheets = (): UseTimesheetsReturn => {
  const [timesheets, setTimesheets] = useState<TimesheetUIRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [periods, setPeriods] = useState<UIPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTimesheets = useCallback(async (apiParams: Record<string, string | number | undefined> = {}): Promise<Result<{ rows: TimesheetUIRow[] }>> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await timesheetService.getTimesheets(apiParams);

      if (response.success) {
        const mapped = response.data.timesheets.map(mapTimesheetToUI);
        setTimesheets(mapped);
        setPagination(response.data.pagination);
        return { success: true, data: { rows: mapped } };
      } else {
        setTimesheets([]);
        setPagination(null);
        return { success: true, data: { rows: [] } };
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Puantaj verileri alınırken hata oluştu');
      setError(message);
      setTimesheets([]);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPeriods = useCallback(async () => {
    try {
      const response = await timesheetService.getPeriods();
      if (response.success && response.data?.periods) {
        setPeriods(response.data.periods.map(mapPeriod));
      }
    } catch {
      // Dönemler alınamadı — filtre dropdown'ı boş kalır
    }
  }, []);

  const saveTimesheets = useCallback(async (periodId: string, changedUIRows: TimesheetUIRow[]): Promise<Result<Record<string, never>>> => {
    if (!periodId || !changedUIRows?.length) {
      return { success: false, error: 'Kaydedilecek değişiklik bulunamadı' };
    }

    setIsSaving(true);
    try {
      const payload = mapUIToSavePayload(changedUIRows);
      const response = await timesheetService.saveTimesheets(periodId, payload);
      
      if (response.success) {
        return { success: true, data: {} };
      } else {
         return { success: false, error: response.message };
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Puantaj kaydedilemedi');
      return { success: false, error: message };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const toggleLockPeriod = useCallback(async (periodId: string): Promise<Result<{ period: PeriodItem }>> => {
    setIsLocking(true);
    try {
      const response = await timesheetService.toggleLockPeriod(periodId);
      if (response.success) {
         return { success: true, data: response.data };
      } else {
         return { success: false, error: response.message };
      }
    } catch (err: unknown) {
      const message = getErrorMessage(err, 'Kilit durumu değiştirilemedi');
      return { success: false, error: message };
    } finally {
      setIsLocking(false);
    }
  }, []);

  return {
    timesheets,
    setTimesheets,
    pagination,
    periods,
    isLoading,
    isSaving,
    isLocking,
    error,
    fetchTimesheets,
    fetchPeriods,
    saveTimesheets,
    toggleLockPeriod,
  };
};
