/* ========================================================================
   AUTH CONTROLLER (KİMLİK DOĞRULAMA KONTROLCÜSÜ)
   Kayıt olma, giriş yapma, token yenileme ve çıkış işlemlerini yönetir.
   ======================================================================== */
import bcrypt from 'bcrypt';
import { pool, withTransaction } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyAccessToken } from '../utils/tokenUtils.js';
import { cookieConfig } from '../config/jwt.js';
import { toCamelCase } from '../utils/caseMapper.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_ROLE, USER_STATUS } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { unauthorized, forbidden, notFound, conflict } from '../utils/AppError.js';


export const register = asyncHandler(async (req, res) => {
  const { username, password, role, unitId, locationId } = req.body;

  const passwordHash = await bcrypt.hash(password, 10);

  let result;
  try {
    result = await withTransaction(async (client) => {
      // Expiry Date Mantığı: ADMIN rolü süresizdir (NULL). 
      // Diğer roller için sistem bitiş tarihinden (program_end_date) 20 gün sonrası set edilir.
      const insertRes = await client.query(
        `INSERT INTO app.users (username, password_hash, role, status, unit_id, location_id, expiry_date)
         VALUES (
           $1, $2, $3, $4, $5, $6,
           CASE
             WHEN $3 = $7 THEN NULL
             ELSE (SELECT program_end_date + INTERVAL '20 days' FROM app.settings LIMIT 1)
           END
         )

         RETURNING id, username, role, status, unit_id, location_id`,
        [username, passwordHash, role, USER_STATUS.PENDING, unitId || null, locationId || null, USER_ROLE.ADMIN]
      );

      const newUser = insertRes.rows[0];

      await createAuditLog(client, {
        action: AUDIT_ACTION.USER_REGISTER,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: newUser.id,
        summary: `${newUser.username} adlı yeni kullanıcı kayıt oldu (onay bekliyor).`,
        metadata: {
          role: newUser.role,
          status: newUser.status,
          unitId: newUser.unit_id || null,
          locationId: newUser.location_id || null,
        },
      });

      return insertRes;
    });
  } catch (err) {
    if (err.code === '23505') throw conflict('Bu kullanıcı adı zaten kullanımda');
    throw err;
  }

  res.status(201).json({
    success: true,
    data: {
      user: toCamelCase(result.rows[0]),
    },
    message: 'Kullanıcı başarıyla oluşturuldu',
  });
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    'SELECT * FROM app.users WHERE username = $1',
    [username]
  );

  if (result.rows.length === 0) throw unauthorized('Kullanıcı adı veya şifre yanlış');

  const user = result.rows[0];

  // Hesap Durum Kontrolleri: EXPIRED veya ACTIVE olmayan kullanıcı giriş yapamaz
  if (user.status === USER_STATUS.EXPIRED) {
    throw forbidden('Hesabınızın süresi dolmuştur. Sisteme giriş yapamazsınız.');
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw forbidden('Hesabınız henüz aktif değil. Admin onayı bekleniyor.');
  }


  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) throw unauthorized('Kullanıcı adı veya şifre yanlış');

  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    unitId: user.unit_id || null,
    locationId: user.location_id || null,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Token'ları HTTP-Only Cookie olarak set et (Güvenlik için JavaScript erişimi kapalıdır)
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


  await createAuditLog(pool, {
    action: AUDIT_ACTION.USER_LOGIN,
    actor: { username: user.username, role: user.role },
    entityType: AUDIT_ENTITY_TYPE.USER,
    entityId: user.id,
    summary: `${user.username} sisteme giriş yaptı.`,
  });

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
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) throw unauthorized('Refresh token bulunamadı');

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Token yenilenemedi');
  }

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
});

export const logout = asyncHandler(async (req, res) => {
  // Access token'ı (varsa) decode edip log için kullanıcı bilgisini al — başarısız olursa anonim çıkış logla
  let actor = { username: 'UNKNOWN', role: null };
  let entityId = null;
  const accessToken = req.cookies?.accessToken;
  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      actor = { username: decoded.username, role: decoded.role };
      entityId = decoded.id || null;
    } catch {
      // Token geçersiz; sessizce devam
    }
  }

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

  if (actor.username !== 'UNKNOWN') {
    await createAuditLog(pool, {
      action: AUDIT_ACTION.USER_LOGOUT,
      actor,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId,
      summary: `${actor.username} sistemden çıkış yaptı.`,
    });
  }

  res.json({
    success: true,
    message: 'Çıkış yapıldı',
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const result = await pool.query(
    'SELECT id, username, role, status, unit_id, location_id FROM app.users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) throw notFound('Kullanıcı bulunamadı');

  res.json({
    success: true,
    data: {
      user: toCamelCase(result.rows[0]),
    },
  });
});
