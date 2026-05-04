/* ========================================================================
   USER SERVICE (KULLANICI SERVİSİ)
   Sistem kullanıcılarının (Admin/Sorumlu) yönetimi.
   ======================================================================== */
import type {
  ApiResponse,
  UserListItem,
  UserEditType,
  ProfileUpdateType,
  UserListQuery,
  UserListResponse,
} from '@timesheet/shared';

import { api } from './httpClient';

// ─── Servis ───────────────────────────────────────────────────────────────────

// Tüm kullanıcıları getir (Filtreleme desteği ile: role, status, search vb.)
export const getUsers = (params: UserListQuery = {}) =>
  api.get<ApiResponse<UserListResponse>>('/users', { params });

// Belirli bir kullanıcıyı güncelle (Durum değişikliği, rol değişikliği vb.)
export const updateUser = (id: string, data: UserEditType) =>
  api.put<ApiResponse<UserListItem>>(`/users/${id}`, data);

// Kullanıcıyı tamamen sil
export const deleteUser = (id: string) =>
  api.delete<ApiResponse<Record<string, never>>>(`/users/${id}`);

export const updateProfile = (profileData: ProfileUpdateType) =>
  api.put<ApiResponse<UserListItem>>('/users/me', profileData);
