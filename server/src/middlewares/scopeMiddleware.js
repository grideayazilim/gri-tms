/* ========================================================================
   SCOPE MIDDLEWARE
   Kullanıcının rolüne göre hangi verilere (Birim/Yerleşke) erişebileceğini belirler
   ======================================================================== */
import { USER_ROLE } from '@timesheet/shared';


export function scopeMiddleware(req, res, next) {
  const { role } = req.user;

  // ADMIN rolü için Scope kontrolü: 
  // Eğer query parametresi varsa o birime kısıtlanır, yoksa tüm verilere (req.scope = null) erişir.
  if (role === USER_ROLE.ADMIN) {

    const { unitId, locationId } = req.query;

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
