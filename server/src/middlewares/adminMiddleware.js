/* ========================================================================
   ADMIN MIDDLEWARE
   Sadece ADMIN rolüne sahip kullanıcıların geçmesine izin verir
   ======================================================================== */
import { USER_ROLE } from '@timesheet/shared';

export function adminMiddleware(req, res, next) {
  if (req.user.role !== USER_ROLE.ADMIN) {
    return res.status(403).json({
      success: false,
      message: "Bu işlem için admin yetkisi gerekli.",
    });
  }
  next();
}
