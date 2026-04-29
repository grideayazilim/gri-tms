/* ========================================================================
   ADMIN MIDDLEWARE
   Sadece ADMIN rolüne sahip kullanıcıların geçmesine izin verir
   ======================================================================== */
import type { Request, Response, NextFunction } from 'express';

import { USER_ROLE } from '@timesheet/shared';
import { forbidden } from '../utils/AppError.js';

export function adminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Auth middleware'den sonra çağrılır — req.user set edilmiş olmalı
  if (!req.user) {
    throw forbidden('Bu işlem için giriş yapmanız gerekli.');
  }

  if (req.user.role !== USER_ROLE.ADMIN) {
    throw forbidden('Bu işlem için admin yetkisi gerekli.');
  }

  next();
}
