/* ========================================================================
   SETTINGS SERVICE (AYARLAR SERVİSİ)
   Sistem ayarları ve onay bekleyen kullanıcı işlemleri.
   ======================================================================== */
import type { ApiResponse, PendingUserItem, SystemSettings, SystemSettingsType } from '@timesheet/shared';

import { api } from './httpClient';

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
