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

// ─── SYSTEM RESET ──────────────────────────────────────────────────────────────

// Yedekli modda yanıt Blob (zip) döner — backend zip dosyasını stream eder
export const resetSystemWithBackup = (data: SystemResetType): Promise<Blob> =>
  httpClient.post<unknown, Blob>('/settings/reset', data, { responseType: 'blob', timeout: 120000 });

// Yedeksiz modda standart JSON başarı yanıtı döner
export const resetSystemWithoutBackup = (data: SystemResetType) =>
  api.post<ApiResponse<Record<string, never>>>('/settings/reset', data);

// Backward-compat: backup flag'ine göre uygun fonksiyona delege eder
export const resetSystem = (data: SystemResetType): Promise<Blob | ApiResponse<Record<string, never>>> =>
  data.backup ? resetSystemWithBackup(data) : resetSystemWithoutBackup(data);
