/* ========================================================================
   ÖZEL HATA SINIFI (CUSTOM ERROR CLASS)
   HTTP durum kodları ile uyumlu hata nesneleri oluşturur.
   ======================================================================== */

type HttpStatus = 400 | 401 | 403 | 404 | 409 | 423 | 500;

export class AppError extends Error {
  readonly status: HttpStatus;

  constructor(message: string, status: HttpStatus = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export const badRequest   = (msg: string): AppError                      => new AppError(msg, 400);
export const unauthorized = (msg = 'Yetkisiz erişim'): AppError          => new AppError(msg, 401);
export const forbidden    = (msg = 'Erişim reddedildi'): AppError        => new AppError(msg, 403);
export const notFound     = (msg = 'Kayıt bulunamadı'): AppError         => new AppError(msg, 404);
export const conflict     = (msg = 'Bu kayıt zaten mevcut'): AppError    => new AppError(msg, 409);
export const locked       = (msg = 'Kayıt kilitli'): AppError            => new AppError(msg, 423);
