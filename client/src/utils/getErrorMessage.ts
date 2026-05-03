/* ========================================================================
   HATA MESAJI YARDIMCISI
   Bilinmeyen hatalardan güvenli mesaj çıkarma — tüm hook'larda kullanılır.
   ======================================================================== */

export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}
