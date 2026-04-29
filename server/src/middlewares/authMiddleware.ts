/* ========================================================================
   AUTH MIDDLEWARE
   Cookie içindeki accessToken'ı doğrular ve user bilgisini request'e ekler
   ======================================================================== */
import type { Request, Response, NextFunction } from 'express';

import { verifyAccessToken } from '../utils/tokenUtils.js';


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

    next();
  } catch (error: unknown) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş token',
    });
  }
};

export default authMiddleware;
