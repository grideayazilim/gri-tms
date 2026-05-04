/* ========================================================================
   API TİP TANIMLARI
   Uygulama genelinde kullanılan API yanıt zarfları ve yardımcı tipler
   ======================================================================== */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  errors?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E; code?: string };
