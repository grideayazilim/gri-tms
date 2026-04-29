/* ========================================================================
   AUTH SERVICE (KİMLİK DOĞRULAMA SERVİSİ)
   Giriş, çıkış, kayıt ve şifre işlemleri.
   ======================================================================== */
import type { ApiResponse, AuthUser, SignUpType } from '@timesheet/shared';

import { api } from './httpClient';

// ─── Tipler ───────────────────────────────────────────────────────────────────

interface AuthResponse {
  user: AuthUser;
}

interface MeResponse {
  user: AuthUser;
}

// ─── Servis ───────────────────────────────────────────────────────────────────

export const register = (payload: SignUpType) =>
  api.post<ApiResponse<AuthResponse>>('/auth/register', payload);

export const login = (username: string, password: string) =>
  api.post<ApiResponse<AuthResponse>>('/auth/login', { username, password });

export const getMe = () =>
  api.get<ApiResponse<MeResponse>>('/auth/me');

export const logout = () =>
  api.post<ApiResponse<Record<string, never>>>('/auth/logout');

export const refreshToken = () =>
  api.post<ApiResponse<Record<string, never>>>('/auth/refresh');

// Şifre değiştirme — eski şifre doğrulaması gerektirir (PUT metodu kullanılır)
export const changePassword = (oldPassword: string, newPassword: string) =>
  api.put<ApiResponse<Record<string, never>>>('/users/me', { oldPassword, newPassword });
