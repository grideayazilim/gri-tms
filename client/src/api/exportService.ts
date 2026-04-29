/* ========================================================================
   EXPORT SERVICE (DIŞA AKTARIM SERVİSİ)
   Puantaj verilerini Maaş, Liste veya Bot formatında Excel olarak indirir.
   ======================================================================== */
import type { ExportParams } from '@timesheet/shared';

import httpClient from './httpClient';
import { formatPeriodUpper } from '../utils/dateUtils';

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchBlob(url: string, params: Record<string, unknown>): Promise<Blob> {
  const blob = await httpClient.get<unknown, Blob>(url, { params, responseType: 'blob' });
  return blob;
}

// ─── Servis ───────────────────────────────────────────────────────────────────

export async function downloadTimesheetExcel({ locationId, year, month, locationName }: ExportParams): Promise<void> {
  const blob = await fetchBlob('/export/timesheet', { locationId, year, month });
  const period = formatPeriodUpper(year, month);
  const filename = `${locationName.toLocaleUpperCase('tr-TR')} - ${period} MAAŞLAR.xlsm`;
  downloadBlob(blob, filename);
}

export async function downloadSimpleExcel({ locationId, year, month, locationName }: ExportParams): Promise<void> {
  const blob = await fetchBlob('/export/simple', { locationId, year, month });
  const period = formatPeriodUpper(year, month);
  const filename = `${locationName.toLocaleUpperCase('tr-TR')} - ${period} LİSTE.xlsm`;
  downloadBlob(blob, filename);
}

export async function downloadBotExcel({ locationId, year, month, locationName }: ExportParams): Promise<void> {
  const blob = await fetchBlob('/export/bot', { locationId, year, month });
  const period = formatPeriodUpper(year, month);
  const filename = `${locationName.toLocaleUpperCase('tr-TR')} - ${period} BOT GİRDİSİ.xlsx`;
  downloadBlob(blob, filename);
}
