// Service'lerde kullanılmak üzere hazır istek gönderecek fonksiyonları içeren dosya

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Axios instance oluştur
const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Cookie'leri otomatik gönder
});

// Response interceptor - 401 durumunda auto-refresh
httpClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // Eğer refresh veya me endpoint'i fail olduysa, infinite loop'u önle
    if (originalRequest.url?.includes('/auth/refresh') || originalRequest.url?.includes('/auth/me')) {
      return Promise.reject(error);
    }

    // 401 ve henüz retry yapılmadıysa
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Token'ı yenile
        await httpClient.post('/auth/refresh');
        
        // Orijinal isteği tekrar dene
        return httpClient(originalRequest);
      } catch (refreshError) {
        // Refresh başarısız - auth'a yönlendir
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
    }

    // Diğer hatalar
    if (error.response) {
      return Promise.reject({
        message: error.response.data.message || 'Bir hata oluştu',
        status: error.response.status,
      });
    }

    return Promise.reject({
      message: 'Sunucuya ulaşılamıyor',
      status: 0,
    });
  }
);

export const api = {
  get: (url, config) => httpClient.get(url, config),
  post: (url, data, config) => httpClient.post(url, data, config),
  put: (url, data, config) => httpClient.put(url, data, config),
  patch: (url, data, config) => httpClient.patch(url, data, config),
  delete: (url, config) => httpClient.delete(url, config),
};

export default httpClient;
