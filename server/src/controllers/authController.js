import bcrypt from 'bcrypt';
import { withTransaction } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';
import { cookieConfig } from '../config/jwt.js';

export async function register(req, res) {
  try {
    const { username, password, role, unitId, locationId } = req.body;

    // Input validasyon
    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı, şifre ve rol gerekli',
      });
    }

    // Role göre unit/location kontrolü
    if (role === 'RESPONSIBLE' && (!unitId || !locationId)) {
      return res.status(400).json({
        success: false,
        message: 'Birim sorumlusu için yerleşke ve birim seçimi zorunlu',
      });
    }

    // Şifreyi hashle
    const passwordHash = await bcrypt.hash(password, 10);

    // Kullanıcıyı oluştur (TestLogin için direkt ACTIVE)
    const result = await withTransaction(async (client) => {
      return await client.query(
        `INSERT INTO app.users (username, password_hash, role, status, unit_id, location_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, role, status, unit_id, location_id`,
        [username, passwordHash, role, 'ACTIVE', unitId || null, locationId || null]
      );
    });

    res.status(201).json({
      success: true,
      data: {
        user: result.rows[0],
      },
      message: 'Kullanıcı başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Unique constraint hatası
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Bu kullanıcı adı zaten kullanımda',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Kayıt sırasında bir hata oluştu',
    });
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    // Input validasyon
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı ve şifre gerekli',
      });
    }

    // Kullanıcıyı bul
    const result = await withTransaction(async (client) => {
      return await client.query(
        'SELECT * FROM app.users WHERE username = $1',
        [username]
      );
    });

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre',
      });
    }

    const user = result.rows[0];

    // Aktiflik kontrolü
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Hesabınız henüz aktif değil. Admin onayı bekleniyor.',
      });
    }

    // Şifre kontrol
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı adı veya şifre',
      });
    }

    // Token payload (minimal data + scope bilgisi)
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      unitId: user.unit_id || null,
      locationId: user.location_id || null,
    };

    // Token'ları oluştur
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
      maxAge: cookieConfig.maxAge.access,
    });

    // Refresh token cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
      maxAge: cookieConfig.maxAge.refresh,
    });

    // User data döndür (token'lar DEĞİL)
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          unit_id: user.unit_id,
          location_id: user.location_id,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş yapılırken bir hata oluştu',
    });
  }
}

// Token yenile
export async function refresh(req, res) {
  try {
    // Cookie'den refresh token oku
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token bulunamadı',
      });
    }

    // Token doğrula
    const decoded = verifyRefreshToken(refreshToken);

    // Yeni access token oluştur
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      unitId: decoded.unitId || null,
      locationId: decoded.locationId || null,
    });

    // Yeni access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
      maxAge: cookieConfig.maxAge.access,
    });

    res.json({
      success: true,
      message: 'Token yenilendi',
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Token yenilenemedi',
    });
  }
}

// Çıkış
export async function logout(req, res) {
  try {
    // Her iki cookie'yi temizle
    res.clearCookie('accessToken', {
      httpOnly: true,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
    });

    res.json({
      success: true,
      message: 'Çıkış yapıldı',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Çıkış yapılırken bir hata oluştu',
    });
  }
}

// Mevcut kullanıcı bilgisi (protected route örneği)
export async function getMe(req, res) {
  try {
    // req.user authMiddleware tarafından set edildi
    const userId = req.user.id;

    // Database'den kullanıcı bilgilerini getir
    const result = await withTransaction(async (client) => {
      return await client.query(
        'SELECT id, username, role, status, unit_id, location_id FROM app.users WHERE id = $1',
        [userId]
      );
    });

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınırken hata oluştu',
    });
  }
}
