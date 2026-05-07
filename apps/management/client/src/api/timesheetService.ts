/* ========================================================================
   TIMESHEET SERVICE (PUANTAJ SERVİSİ)
   Çalışanların puantaj girişleri ve dönem kilitleri.
   ======================================================================== */
import type { ApiResponse, PaginationMeta, TimesheetListItem, PeriodItem, TimesheetSaveType } from '@timesheet/shared';

import { api } from './httpClient';

// ─── Tipler ───────────────────────────────────────────────────────────────────

// Client-side params: month sent as "YYYY-MM" string (not server-side year+month numbers)
export type TimesheetListParams = Record<string, string | number | undefined>;

interface TimesheetListData {
  timesheets: TimesheetListItem[];
  pagination: PaginationMeta;
}

// ─── Servis ───────────────────────────────────────────────────────────────────

// Puantaj listesini getir (Ay/Yıl, Birim, Yerleşke filtreleri ile)
export const getTimesheets = (params: TimesheetListParams = {}) =>
  api.get<ApiResponse<TimesheetListData>>('/timesheets', { params });

// Puantajları toplu olarak kaydet veya güncelle
export const saveTimesheets = (periodId: string, timesheets: TimesheetSaveType['timesheets']) =>
  api.post<ApiResponse<Record<string, never>>>('/timesheets', { periodId, timesheets });

// Bir dönemi kilitle veya kilidini aç
export const toggleLockPeriod = (periodId: string) =>
  api.patch<ApiResponse<{ period: PeriodItem }>>(`/timesheets/${periodId}/lock`);

export const getPeriods = () =>
  api.get<ApiResponse<{ periods: PeriodItem[] }>>('/timesheets/periods');
