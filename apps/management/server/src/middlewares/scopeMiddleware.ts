/* ========================================================================
   SCOPE MIDDLEWARE
   Kullanıcının rolüne göre hangi verilere (Birim/Yerleşke) erişebileceğini belirler
   ======================================================================== */
import type { Request, Response, NextFunction } from 'express';

import { USER_ROLE } from '@timesheet/shared';
import { forbidden } from '../utils/AppError.js';


export function scopeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw forbidden('Bu işlem için giriş yapmanız gerekli.');
  }

  const { role } = req.user;

  // ADMIN rolü için Scope kontrolü: 
  // Eğer query parametresi varsa o birime kısıtlanır, yoksa tüm verilere (req.scope = null) erişir.
  if (role === USER_ROLE.ADMIN) {
    const unitId = typeof req.query.unitId === 'string' ? req.query.unitId : null;
    const locationId = typeof req.query.locationId === 'string' ? req.query.locationId : null;

    // parametre verdiyse filtreli admin
    if (unitId && locationId) {
      req.scope = { unitId, locationId };
    } else {
      req.scope = null; // tüm data
    }

    return next();
  }

  // RESPONSIBLE (Sorumlu) rolü için Scope kontrolü:
  // Sadece kendi tanımlı olduğu Birim ve Yerleşke verilerine erişebilir.
  req.scope = {
    unitId: req.user.unitId,
    locationId: req.user.locationId,
  };

  next();
}
