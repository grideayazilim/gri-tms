/* ========================================================================
   IMPORT SERVICE (İÇE AKTARIM SERVİSİ)
   Excel'den puantaj ve çalışan verisi aktarma işlemleri.
   ======================================================================== */
import type { ApiResponse, ImportResult, BulkImportResult, ImportEmployeeType, ImportFinalizeType } from '@timesheet/shared';

import httpClient from './httpClient';

// Tekli import'tan farklı: fullName + locationName ile çalışır, server lookup yapar.
export interface BulkEmployeeInput {
  tcNo: string;
  fullName: string;
  locationName: string;
  unitName: string | null;
  ibanNo: string | null;
  startDate: string | null;
  endDate: string | null;
}

// ─── Servis ───────────────────────────────────────────────────────────────────

// Tekil çalışan ve puantaj verisi aktar (Excel satırı bazlı)
export const importEmployee = (data: ImportEmployeeType) =>
  httpClient.post<unknown, ApiResponse<ImportResult>>('/import/employee', data);

// İçe aktarım işlemini özet verilerle tamamla (Audit log oluşturur)
export const finalizeImport = (data: ImportFinalizeType) =>
  httpClient.post<unknown, ApiResponse<Record<string, never>>>('/import/finalize', data);

// Çoklu çalışan listesini toplu olarak aktar
export const bulkImportEmployees = (data: { employees: BulkEmployeeInput[] }) =>
  httpClient.post<unknown, ApiResponse<BulkImportResult>>('/import/bulk-employees', data);
