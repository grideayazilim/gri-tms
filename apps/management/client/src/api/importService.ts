/* ========================================================================
   IMPORT SERVICE (İÇE AKTARIM SERVİSİ)
   Excel'den puantaj ve çalışan verisi aktarma işlemleri.
   ======================================================================== */
import type { ApiResponse, BulkImportResult, BulkImportEmployeesType } from '@timesheet/shared';

import httpClient from './httpClient';

// Local query params (client-specific additions if any)
export type BulkEmployeeInput = BulkImportEmployeesType['employees'][number];

// ─── Servis ───────────────────────────────────────────────────────────────────

// Çoklu çalışan listesini toplu olarak aktar
export const bulkImportEmployees = (data: BulkImportEmployeesType) =>
  httpClient.post<unknown, ApiResponse<BulkImportResult>>('/import/bulk-employees', data);
