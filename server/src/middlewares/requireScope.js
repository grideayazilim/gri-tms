export function requireScope(req, res, next) {
  // Admin bypass
  if (req.user.role === "ADMIN") {
    return next();
  }

  // unit_id ve location_id'yi al
  const targetLocationId = req.params.locationId || req.body.locationId;
  const targetUnitId = req.params.unitId || req.body.unitId;

  // unit ve location id'si request'te yoksa hata mesajı gönder
  if (!targetLocationId || !targetUnitId) {
    return res.status(400).json({
      message: "Bu işlem için yerleşke ve birim ID'si gereklidir.",
    });
  }

  // Hedef birim ve kullanıcı birimi karşılaştırma
  const isLocationMatch = req.user.locationId === targetLocationId;
  const isUnitMatch = req.user.unitId === targetUnitId;

  // Birim/kullanıcı eşleşmesi sağlanmıyorsa hata mesajı gönder
  if (!isLocationMatch || !isUnitMatch) {
    return res.status(403).json({
      message: "Bu yerleşkenin birimindeki verilere erişim yetkiniz bulunmuyor.",
    });
  }

  next();
}