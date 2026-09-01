/* ========================================================================
   AUTH MIDDLEWARE
   Cookie içindeki accessToken'ı doğrular ve user bilgisini request'e ekler.

   Zorunlu şifre değişimi kapısı:
     Şifresini değiştirmek zorunda olan kullanıcı, değiştirene kadar yalnızca
     izin listesindeki uçlara erişebilir. Kapı burada olmalı; arayüzdeki modal
     tek başına curl ile baypas edilebilir.
   ======================================================================== */
import type { Request, Response, NextFunction } from 'express';

import { verifyAccessToken } from '../utils/tokenUtils.js';
import logger from '../utils/logger.js';

/** Zorunlu şifre değişimi beklerken erişilebilen tek uçlar. */
const PASSWORD_GATE_ALLOWLIST = new Set([
  '/api/auth/change-initial-password',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/auth/refresh',
]);

/** Sorgu dizesini atarak yalnızca yol kısmını verir (`/api/auth/me?x=1` → `/api/auth/me`). */
function pathOf(req: Request): string {
  return (req.originalUrl || req.url).split('?')[0] ?? '';
}

// Cookie'den token oku
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const accessToken: string | undefined = req.cookies?.accessToken;

    if (!accessToken) {
      res.status(401).json({
        success: false,
        message: 'Token bulunamadı. Lütfen giriş yapın.',
      });
      return;
    }

    // Token doğrula
    const decoded = verifyAccessToken(accessToken);

    // Decoded user bilgisini request'e ekle (express.d.ts augmentation sayesinde tipli)
    req.user = decoded;

    // Şifre değişimi zorunluysa diğer tüm uçları kapat
    if (decoded.mustChangePassword && !PASSWORD_GATE_ALLOWLIST.has(pathOf(req))) {
      res.status(403).json({
        success: false,
        message: 'Devam etmeden önce şifrenizi değiştirmelisiniz.',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
      return;
    }

    next();
  } catch (error: unknown) {
    logger.warn('Auth token doğrulama başarısız', {
      path: req.path,
      ip: req.ip,
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(401).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş token',
    });
  }
};

export default authMiddleware;
