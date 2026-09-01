/* ========================================================================
   HTTP CLIENT (AXIOS KONFİGÜRASYONU)
   Tüm API isteklerini yöneten merkezi Axios istemcisi.
   Otomatik Token yenileme (refresh) ve global hata yönetimi içerir.
   ======================================================================== */
import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

/* Error'dan türer: düz bir nesne (`{ message, status }`) reddedilseydi `catch`
   bloklarındaki `err instanceof Error` kontrolleri her zaman false döner ve
   sunucunun açıklayıcı mesajı atılırdı. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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
      return Promise.reject(new ApiError('Beklenmeyen hata', 0));
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
        return Promise.reject(new ApiError(
          hasMessage(error.response.data) ? error.response.data.message : 'Bir hata oluştu',
          error.response.status,
        ));
      }
      return Promise.reject(new ApiError('Sunucuya ulaşılamıyor', 0));
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
      return Promise.reject(new ApiError(errorMessage, error.response.status));
    }

    return Promise.reject(new ApiError('Sunucuya ulaşılamıyor', 0));
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
