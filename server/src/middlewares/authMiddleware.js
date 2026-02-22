import { verifyAccessToken } from '../utils/tokenUtils.js';

// Cookie'den token oku
export const authMiddleware = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Token bulunamadı. Lütfen giriş yapın.',
      });
  }

    // Token doğrula
    const decoded = verifyAccessToken(accessToken);

    // Decoded user bilgisini request'e ekle
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş token',
    });
  }
};

export default authMiddleware;
