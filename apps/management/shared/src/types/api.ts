/* ========================================================================
   API TİP TANIMLARI
   Uygulama genelinde kullanılan API yanıt zarfları ve yardımcı tipler

   Kullanım rehberi (#29):
   - ApiResponse<T>  → HTTP endpoint'lerinin dönüş tipi (server → client JSON zarfı).
                        success discriminator ile data veya hata mesajını taşır.
   - Result<T, E>    → Servis/use-case katmanı içi dönüş tipi (client-side hook'lar vb.).
                        HTTP'ye bağlı değil; error alanı string veya özel hata tipi olabilir.
   ======================================================================== */

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiFailure {
  success: false;
  message: string;
  // #28: unknown yerine Zod fieldErrors formatı — consumer tarafta tip daraltmaya gerek kalmaz
  errors?: Record<string, string[]>;
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
