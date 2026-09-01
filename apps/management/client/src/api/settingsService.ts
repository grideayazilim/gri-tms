/* ========================================================================
   SETTINGS SERVICE (AYARLAR SERVİSİ)
   Sistem ayarları ve onay bekleyen kullanıcı işlemleri.
   ======================================================================== */
import type { ApiResponse, PendingUserItem, SystemSettings, SystemSettingsType, SystemResetType } from '@timesheet/shared';

import httpClient, { api } from './httpClient';

// ─── PENDING USERS ────────────────────────────────────────────────────────────

export const getPendingUsers = () =>
  api.get<ApiResponse<{ pendingUsers: PendingUserItem[] }>>('/settings/pending-users');

export const approvePendingUser = (id: string) =>
  api.post<ApiResponse<Record<string, never>>>(`/settings/pending-users/${id}/approve`);

export const rejectPendingUser = (id: string) =>
  api.delete<ApiResponse<Record<string, never>>>(`/settings/pending-users/${id}/reject`);

// ─── SYSTEM SETTINGS ──────────────────────────────────────────────────────────

export const getSystemSettings = () =>
  api.get<ApiResponse<{ settings: SystemSettings }>>('/settings/system');

export const updateSystemSettings = (data: SystemSettingsType & { force?: boolean }) =>
  api.put<ApiResponse<{ settings: SystemSettings }>>('/settings/system', data);

// ─── SYSTEM BACKUP & RESET ─────────────────────────────────────────────────────

/* Yedek üretimi yerleşke × dönem sayısına bağlı olarak dakikalar sürebilir
   (70-84 workbook), bu yüzden sıfırlamadan ayrı ve salt-okunur bir uçtan alınır.
   Tek uzun istekte birleştirilseydi timeout'ta kopan bağlantı sunucudaki
   silmeyi durdurmazdı. */
const LONG_OPERATION_TIMEOUT_MS = 600_000;   // 10 dakika

/** Yedek ZIP'ini indirir — sıfırlamadan bağımsız, veri silmez. */
export const downloadBackupZip = (): Promise<Blob> =>
  httpClient.get<unknown, Blob>('/settings/backup', {
    responseType: 'blob',
    timeout: LONG_OPERATION_TIMEOUT_MS,
  });

/* Sıfırlama sonucu artık kalıcı bir modalda gösteriliyor; sunucu neyin
   silindiğini de döner. */
export interface SystemResetResult {
  deleted: { employees: number; users: number; periods: number };
}

/** Sistemi sıfırlar. Yedek almaz — önce downloadBackupZip() çağrılmalıdır. */
export const resetSystem = (data: SystemResetType) =>
  httpClient.post<unknown, ApiResponse<SystemResetResult>>(
    '/settings/reset',
    { ...data, backup: false },
    { timeout: LONG_OPERATION_TIMEOUT_MS },
  );
