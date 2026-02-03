import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Token yok, gönderilmemiş
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Bu işlem için oturum açmanız gerekiyor." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // JWT doğrula
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Kullanıcıyı oluştur
    const user = {
      id: payload.id,
      role: payload.role,
      locationId: payload.locationId ?? "",
      unitId: payload.unitId ?? "",
    };

    // Request'e bağla (Database'e user'ı göndermek üzere zincirin devamına user bilgilerini gönder)
    req.user = user;
    req.dbContext = {
      userId: user.id,
      role: user.role,
      locationId: user.locationId,
      unitId: user.unitId,
    };

    next();
  } catch {
    // Token Geçersiz
    return res.status(401).json({ message: "Oturumunuzun süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın." });
  }
}
