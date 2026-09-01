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

/* Excel üretimi yerleşke başına saniyeler sürebiliyor ve sunucuda
   semafor kuyruğu var. Varsayılan 10 sn'lik istemci timeout'u nginx'in izin
   verdiği 120 sn'nin çok altındaydı; büyük export'lar istemcide kopuyordu. */
const EXPORT_TIMEOUT_MS = 120_000;

async function fetchBlob(url: string, params: Record<string, unknown>): Promise<Blob> {
  const blob = await httpClient.get<unknown, Blob>(url, {
    params,
    responseType: 'blob',
    timeout: EXPORT_TIMEOUT_MS,
  });
  return blob;
}

// ─── Tipler ───────────────────────────────────────────────────────────────────

type ExportType = 'timesheet' | 'simple' | 'bot';

const EXPORT_CONFIG: Record<ExportType, { endpoint: string; suffix: string }> = {
  timesheet: { endpoint: '/export/timesheet', suffix: 'MAAŞLAR.xlsm' },
  simple:    { endpoint: '/export/simple',    suffix: 'LİSTE.xlsm' },
  bot:       { endpoint: '/export/bot',       suffix: 'BOT GİRDİSİ.xlsx' },
};

// ─── Servis ───────────────────────────────────────────────────────────────────

/** Genel export fonksiyonu — type'a göre endpoint ve dosya adı seçer. */
export async function downloadExcel(type: ExportType, params: ExportParams): Promise<void> {
  const config = EXPORT_CONFIG[type];
  const blob = await fetchBlob(config.endpoint, {
    locationId: params.locationId,
    year: params.year,
    month: params.month,
  });
  const period = formatPeriodUpper(params.year, params.month);
  const filename = `${params.locationName.toLocaleUpperCase('tr-TR')} - ${period} ${config.suffix}`;
  downloadBlob(blob, filename);
}

// ─── Backward-compat wrapper'lar ──────────────────────────────────────────────

export const downloadTimesheetExcel = (params: ExportParams) => downloadExcel('timesheet', params);
export const downloadSimpleExcel    = (params: ExportParams) => downloadExcel('simple',    params);
export const downloadBotExcel       = (params: ExportParams) => downloadExcel('bot',       params);
