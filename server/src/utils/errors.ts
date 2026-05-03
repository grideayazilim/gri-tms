/* ========================================================================
   HATA YARDIMCI FONKSİYONLARI
   Bilinmeyen hatalardan güvenli mesaj çıkarma.
   ======================================================================== */

/**
 * Bilinmeyen bir hatadan okunabilir mesaj çıkarır.
 * - `Error` instance'ından `.message` alır
 * - `message` alanı olan objelerden onu alır
 * - Hiçbiri değilse fallback'i döndürür
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return fallback;
}
