/* ========================================================================
   HTTP CLIENT (AXIOS KONFİGÜRASYONU)
   Tüm API isteklerini yöneten merkezi Axios istemcisi. 
   Otomatik Token yenileme (refresh) ve global hata yönetimi içerir.
   ======================================================================== */
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Axios instance oluştur
const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // HTTP-Only Cookie'lerin (session) her isteğe eklenmesini sağlar
});


// Response interceptor - 401 durumunda auto-refresh
httpClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    // İstisna Durumlar: Temel auth endpoint'lerinde hata oluşursa döngüye girmemek için auto-refresh yapma
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/me') ||
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      if (error.response) {
        return Promise.reject({
          message: error.response.data.message || 'Bir hata oluştu',
          status: error.response.status,
        });
      }
      return Promise.reject({ message: 'Sunucuya ulaşılamıyor', status: 0 });
    }


    // 401 Unauthorized ve henüz retry yapılmadıysa (Süre dolan Session'ı yenile)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Token'ı (Cookie) yenilemek için refresh endpoint'ine git
        await httpClient.post('/auth/refresh');

        // Refresh başarılıysa, kullanıcının asıl isteğini aynı ayarlarla tekrar dene
        return httpClient(originalRequest);
      } catch (refreshError) {
        // Refresh de başarısızsa (örn: Refresh token süresi de dolduysa)
        // Kullanıcıyı giriş sayfasına yönlendir
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth';
        }
        return Promise.reject(refreshError);
      }
    }


    // Global Hata Yakalama
    if (error.response) {
      let errorMessage = 'Bir hata oluştu';
      // Excel Export gibi Blob tipinde dönen hataları parse etme mantığı
      if (error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text);
          errorMessage = json.message || errorMessage;
        } catch (e) {
          // Parse edilemezse varsayılan hataya kalır
        }
      } else {
        errorMessage = error.response.data?.message || errorMessage;
      }

      return Promise.reject({
        message: errorMessage,
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
