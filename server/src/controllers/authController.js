import bcrypt from 'bcrypt';
import { withTransaction } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';
import { cookieConfig } from '../config/jwt.js';
import { toCamelCase } from '../utils/caseMapper.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { AUDIT_EVENT } from '../enums/auditEventTypes.js';

export async function register(req, res) {
  try {
    const { username, password, role, unitId, locationId } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı, şifre ve rol gerekli',
      });
    }

    if (role === 'RESPONSIBLE' && (!unitId || !locationId)) {
      return res.status(400).json({
        success: false,
        message: 'Birim sorumlusu için yerleşke ve birim seçimi zorunlu',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await withTransaction(async (client) => {
      const insertRes = await client.query(
        `INSERT INTO app.users (username, password_hash, role, status, unit_id, location_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, username, role, status, unit_id, location_id`,
        [username, passwordHash, role, 'PENDING', unitId || null, locationId || null]
      );

      const newUser = insertRes.rows[0];

      await createAuditLog(client, {
        username: req.user?.username || 'SYSTEM',
        userRole: req.user?.role || 'SYSTEM',
        eventType: AUDIT_EVENT.USER,
        description: `Yeni kullanıcı oluşturuldu: ${newUser.username}`,
        tableName: 'users',
        recordId: newUser.id,
        newData: newUser
      });

      return insertRes;
    });

    res.status(201).json({
      success: true,
      data: {
        user: toCamelCase(result.rows[0]),
      },
      message: 'Kullanıcı başarıyla oluşturuldu',
    });
  } catch (error) {
    console.error('Register error:', error);

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

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı ve şifre gerekli',
      });
    }

    const result = await withTransaction(async (client) => {
      return await client.query(
        'SELECT * FROM app.users WHERE username = $1',
        [username]
      );
    });

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı adı veya şifre yanlış',
      });
    }

    const user = result.rows[0];

    if (user.status === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        message: 'Hesabınızın süresi dolmuştur. Sisteme giriş yapamazsınız.',
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: 'Hesabınız henüz aktif değil. Admin onayı bekleniyor.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı adı veya şifre yanlış',
      });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      unitId: user.unit_id || null,
      locationId: user.location_id || null,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
      maxAge: cookieConfig.maxAge.access,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: cookieConfig.sameSite,
      secure: cookieConfig.secure,
      maxAge: cookieConfig.maxAge.refresh,
    });

    // Audit log for login
    await withTransaction(async (client) => {
      await createAuditLog(client, {
        username: user.username,
        userRole: user.role,
        eventType: AUDIT_EVENT.LOGIN,
        description: `${user.username} sisteme giriş yaptı.`
      });
    });

    // User data döndür (token'lar DEĞİL)
    res.json({
      success: true,
      data: {
        user: toCamelCase({
          id: user.id,
          username: user.username,
          role: user.role,
          status: user.status,
          unit_id: user.unit_id,
          location_id: user.location_id,
        }),
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

export async function refresh(req, res) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token bulunamadı',
      });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const newAccessToken = generateAccessToken({
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      unitId: decoded.unitId || null,
      locationId: decoded.locationId || null,
    });

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

export async function logout(req, res) {
  try {
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

// Giriş yapan kullanıcının kendi bilgilerini güncelle (username / password)
export async function updateMe(req, res) {
  try {
    const userId = req.user.id;
    const { username, password } = req.body;

    if (!username && !password) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek en az bir alan (username veya password) gönderilmeli.',
      });
    }

    const result = await withTransaction(async (client) => {
      const current = await client.query(
        'SELECT id, username, password_hash FROM app.users WHERE id = $1',
        [userId]
      );

      if (current.rows.length === 0) {
        throw Object.assign(new Error('Kullanıcı bulunamadı'), { statusCode: 404 });
      }

      const newUsername = username || current.rows[0].username;
      const newPasswordHash = password
        ? await bcrypt.hash(password, 10)
        : current.rows[0].password_hash;

      const updateRes = await client.query(
        `UPDATE app.users
         SET username = $1, password_hash = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, username, role, status`,
        [newUsername, newPasswordHash, userId]
      );

      const updatedUser = updateRes.rows[0];

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.USER,
        description: `${current.rows[0].username} adlı kullanıcı profil bilgilerini güncelledi.`,
        tableName: 'users',
        recordId: userId,
        oldData: { id: userId, username: current.rows[0].username },
        newData: { id: userId, username: updatedUser.username }
      });

      return updateRes;
    });

    res.json({
      success: true,
      message: 'Bilgiler güncellendi.',
      data: {
        user: toCamelCase(result.rows[0]),
      },
    });
  } catch (error) {
    console.error('updateMe error:', error);

    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }

    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'Bu kullanıcı adı zaten kullanımda.' });
    }

    res.status(500).json({ success: false, message: 'Bilgiler güncellenirken hata oluştu.' });
  }
}

export async function getMe(req, res) {
  try {
    const userId = req.user.id;

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
      data: {
        user: toCamelCase(result.rows[0]),
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı bilgileri alınırken hata oluştu',
    });
  }
}
