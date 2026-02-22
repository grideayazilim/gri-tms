export function scopeMiddleware(req, res, next) {
  const { role } = req.user;

  // ADMIN
  if (role === "ADMIN") {
    const { unitId, locationId } = req.query;

    // parametre verdiyse filtreli admin
    if (unitId && locationId) {
      req.scope = { unitId, locationId };
    } else {
      req.scope = null; // tüm data
    }

    return next();
  }

  // RESPONSIBLE
  req.scope = {
    unitId: req.user.unitId,
    locationId: req.user.locationId,
  };

  next();
}
