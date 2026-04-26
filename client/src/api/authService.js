/* ========================================================================
   AUTH SERVICE (KİMLİK DOĞRULAMA SERVİSİ)
   Giriş, çıkış, kayıt ve şifre işlemleri.
   ======================================================================== */
import { api } from './httpClient';


export const register = async (username, password, role, unitId, locationId) => {
  return api.post('/auth/register', { username, password, role, unitId, locationId });
};

export const login = async (username, password) => {
  return api.post('/auth/login', { username, password });
};

export const getMe = async () => {
  return api.get('/auth/me');
};

export const logout = async () => {
  return api.post('/auth/logout');
};

export const refreshToken = async () => {
  return api.post('/auth/refresh');
};

// Şifre değiştirme — eski şifre doğrulaması gerektirir (PUT metodu kullanılır)
export const changePassword = async (oldPassword, newPassword) => {
  return api.put('/users/me', { oldPassword, newPassword });
};