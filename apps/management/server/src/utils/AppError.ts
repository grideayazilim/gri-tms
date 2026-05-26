/* ========================================================================
   ÖZEL HATA SINIFI (CUSTOM ERROR CLASS)
   HTTP durum kodları ile uyumlu hata nesneleri oluşturur.
   ======================================================================== */

type HttpStatus = 400 | 401 | 403 | 404 | 409 | 423 | 500 | 501 | 502;

export class AppError extends Error {
  readonly status: HttpStatus;

  constructor(message: string, status: HttpStatus = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

export const badRequest   = (msg: string): AppError                      => new AppError(msg, 400);
export const unauthorized = (msg = 'Yetkisiz erişim'): AppError          => new AppError(msg, 401);
export const forbidden    = (msg = 'Erişim reddedildi'): AppError        => new AppError(msg, 403);
export const notFound     = (msg = 'Kayıt bulunamadı'): AppError         => new AppError(msg, 404);
export const conflict     = (msg = 'Bu kayıt zaten mevcut'): AppError    => new AppError(msg, 409);
export const locked       = (msg = 'Kayıt kilitli'): AppError            => new AppError(msg, 423);

// PostgreSQL hata kodları (https://www.postgresql.org/docs/current/errcodes-appendix.html)
const PG_UNIQUE_VIOLATION = '23505';

function isRecordWithCode(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

/**
 * Verilen hatayı kontrol eder; eğer Postgres unique violation ise belirtilen
 * mesajla `conflict` (409) hatası fırlatır, değilse hatayı yeniden fırlatır.
 */
export function rethrowIfNotUniqueViolation(err: unknown, message: string): never {
  if (isRecordWithCode(err) && err.code === PG_UNIQUE_VIOLATION) {
    throw conflict(message);
  }
  throw err;
}
