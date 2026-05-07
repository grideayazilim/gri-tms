/* ========================================================================
   IMPORT SERVICE (İÇE AKTARIM SERVİSİ)
   Excel'den puantaj ve çalışan verisi aktarma işlemleri.
   ======================================================================== */
import type { ApiResponse, ImportResult, BulkImportResult, ImportEmployeeType, ImportFinalizeType, BulkImportEmployeesType } from '@timesheet/shared';

import httpClient from './httpClient';

// Local query params (client-specific additions if any)
export type BulkEmployeeInput = BulkImportEmployeesType['employees'][number];

// ─── Servis ───────────────────────────────────────────────────────────────────

// Tekil çalışan ve puantaj verisi aktar (Excel satırı bazlı)
export const importEmployee = (data: ImportEmployeeType) =>
  httpClient.post<unknown, ApiResponse<ImportResult>>('/import/employee', data);

// İçe aktarım işlemini özet verilerle tamamla (Audit log oluşturur)
export const finalizeImport = (data: ImportFinalizeType) =>
  httpClient.post<unknown, ApiResponse<Record<string, never>>>('/import/finalize', data);

// Çoklu çalışan listesini toplu olarak aktar
export const bulkImportEmployees = (data: BulkImportEmployeesType) =>
  httpClient.post<unknown, ApiResponse<BulkImportResult>>('/import/bulk-employees', data);
