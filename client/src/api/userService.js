/* ========================================================================
   USER SERVICE (KULLANICI SERVİSİ)
   Sistem kullanıcılarının (Admin/Sorumlu) yönetimi.
   ======================================================================== */
import { api } from './httpClient';


// Tüm kullanıcıları getir (Filtreleme desteği ile: role, status, search vb.)
export const getUsers = async (params) => {
  return api.get('/users', { params });
};

// Belirli bir kullanıcıyı güncelle (Durum değişikliği, rol değişikliği vb.)
export const updateUser = async (id, data) => {
  return api.put(`/users/${id}`, data);
};

// Kullanıcıyı tamamen sil
export const deleteUser = async (id) => {
  return api.delete(`/users/${id}`);
};


export const updateProfile = async (profileData) => {
  return await api.put('/users/me', profileData);
};