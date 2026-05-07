/* ========================================================================
   HTTP CLIENT (AXIOS KONFİGÜRASYONU)
   Tüm API isteklerini yöneten merkezi Axios istemcisi.
   Otomatik Token yenileme (refresh) ve global hata yönetimi içerir.
   ======================================================================== */
import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

export interface ApiError {
  message: string;
  status: number;
}

function hasMessage(data: unknown): data is { message: string } {
  return typeof data === 'object' && data !== null && 'message' in data && typeof (data as { message: unknown }).message === 'string';
}

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // HTTP-Only Cookie'lerin her isteğe eklenmesini sağlar
});

// ─── Response interceptor — 401 durumunda auto-refresh ───────────────────────

httpClient.interceptors.response.use(
  (response) => response.data,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      const unexpectedError: ApiError = { message: 'Beklenmeyen hata', status: 0 };
      return Promise.reject(unexpectedError);
    }

    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // İstisna: temel auth endpoint'lerinde döngüye girme
    if (
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/me') ||
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register')
    ) {
      if (error.response) {
        const apiError: ApiError = {
          message: hasMessage(error.response.data) ? error.response.data.message : 'Bir hata oluştu',
          status: error.response.status,
        };
        return Promise.reject(apiError);
      }
      const networkError: ApiError = { message: 'Sunucuya ulaşılamıyor', status: 0 };
      return Promise.reject(networkError);
    }

    // 401 + henüz retry yapılmadıysa — session yenile
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await httpClient.post('/auth/refresh');
        return httpClient(originalRequest);
      } catch {
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth';
        }
        return Promise.reject(error);
      }
    }

    // Global hata işleme
    if (error.response) {
      let errorMessage = 'Bir hata oluştu';
      // Excel Export gibi Blob tipinde dönen hataları parse et
      if (error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const json = JSON.parse(text) as { message?: string };
          errorMessage = json.message ?? errorMessage;
        } catch {
          // Parse edilemezse varsayılan hata kalır
        }
      } else {
        errorMessage = hasMessage(error.response.data) ? error.response.data.message : errorMessage;
      }
      const apiError: ApiError = { message: errorMessage, status: error.response.status };
      return Promise.reject(apiError);
    }

    const finalError: ApiError = { message: 'Sunucuya ulaşılamıyor', status: 0 };
    return Promise.reject(finalError);
  },
);

// ─── Typed API wrapper ────────────────────────────────────────────────────────

export const api = {
  get:    <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.get<unknown, T>(url, config),
  post:   <T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig) =>
    httpClient.post<unknown, T, B>(url, data, config),
  put:    <T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig) =>
    httpClient.put<unknown, T, B>(url, data, config),
  patch:  <T, B = unknown>(url: string, data?: B, config?: AxiosRequestConfig) =>
    httpClient.patch<unknown, T, B>(url, data, config),
  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    httpClient.delete<unknown, T>(url, config),
};

export default httpClient;
