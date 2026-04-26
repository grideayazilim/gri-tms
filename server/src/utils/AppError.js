/* ========================================================================
   ÖZEL HATA SINIFI (CUSTOM ERROR CLASS)
   HTTP durum kodları ile uyumlu hata nesneleri oluşturur.
   ======================================================================== */
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}

export const badRequest   = (msg)                      => new AppError(msg, 400);
export const unauthorized = (msg = 'Yetkisiz erişim')  => new AppError(msg, 401);
export const forbidden    = (msg = 'Erişim reddedildi') => new AppError(msg, 403);
export const notFound     = (msg = 'Kayıt bulunamadı') => new AppError(msg, 404);
export const conflict     = (msg = 'Bu kayıt zaten mevcut') => new AppError(msg, 409);
export const locked       = (msg = 'Kayıt kilitli')    => new AppError(msg, 423);
