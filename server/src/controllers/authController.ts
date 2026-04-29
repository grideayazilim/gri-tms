/* ========================================================================
   AUTH CONTROLLER (KİMLİK DOĞRULAMA KONTROLCÜSÜ)
   Kayıt olma, giriş yapma, token yenileme ve çıkış işlemlerini yönetir.
   ======================================================================== */
import bcrypt from 'bcrypt';

import { db, withDrizzleTransaction } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyAccessToken } from '../utils/tokenUtils.js';
import { cookieConfig } from '../config/jwt.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared';
import type { JwtPayload } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { unauthorized, forbidden, notFound, conflict } from '../utils/AppError.js';
import { ok, created } from '../utils/responses.js';
import * as userRepo from '../repositories/userRepo.js';
import type { DatabaseError } from 'pg';


export const register = asyncHandler(async (req, res) => {
  const { username, password, role, unitId, locationId } = req.body as {
    username: string;
    password: string;
    role: string;
    unitId?: string;
    locationId?: string;
  };

  const passwordHash = await bcrypt.hash(password, 10);

  let newUser;
  try {
    newUser = await withDrizzleTransaction(async (tx) => {
      const user = await userRepo.createPendingUser(tx, {
        username,
        passwordHash,
        role: role as JwtPayload['role'],
        unitId: unitId ?? null,
        locationId: locationId ?? null,
      });

      await createAuditLog(tx, {
        action: AUDIT_ACTION.USER_REGISTER,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: user.id,
        summary: `${user.username} adlı yeni kullanıcı kayıt oldu (onay bekliyor).`,
        metadata: {
          role: user.role,
          status: user.status,
          unitId: user.unitId ?? null,
          locationId: user.locationId ?? null,
        },
      });

      return user;
    });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as DatabaseError).code === '23505') {
      throw conflict('Bu kullanıcı adı zaten kullanımda');
    }
    throw err;
  }

  return created(res, {
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      status: newUser.status,
      unitId: newUser.unitId,
      locationId: newUser.locationId,
    },
  }, 'Kullanıcı başarıyla oluşturuldu');
});

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body as { username: string; password: string };

  const user = await userRepo.findByUsername(db, username);
  if (!user) throw unauthorized('Kullanıcı adı veya şifre yanlış');

  // Hesap Durum Kontrolleri: EXPIRED veya ACTIVE olmayan kullanıcı giriş yapamaz
  if (user.status === 'EXPIRED') {
    throw forbidden('Hesabınızın süresi dolmuştur. Sisteme giriş yapamazsınız.');
  }

  if (user.status !== 'ACTIVE') {
    throw forbidden('Hesabınız henüz aktif değil. Admin onayı bekleniyor.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) throw unauthorized('Kullanıcı adı veya şifre yanlış');

  const tokenPayload: JwtPayload = {
    id: user.id,
    username: user.username,
    role: user.role as JwtPayload['role'],
    unitId: user.unitId ?? null,
    locationId: user.locationId ?? null,
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

  await createAuditLog(db, {
    action: AUDIT_ACTION.USER_LOGIN,
    actor: { username: user.username, role: user.role },
    entityType: AUDIT_ENTITY_TYPE.USER,
    entityId: user.id,
    summary: `${user.username} sisteme giriş yaptı.`,
  });

  return ok(res, {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      unitId: user.unitId,
      locationId: user.locationId,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshTokenStr = req.cookies?.refreshToken as string | undefined;

  if (!refreshTokenStr) throw unauthorized('Refresh token bulunamadı');

  let decoded: JwtPayload;
  try {
    decoded = verifyRefreshToken(refreshTokenStr);
  } catch {
    throw unauthorized('Token yenilenemedi');
  }

  const newAccessToken = generateAccessToken({
    id: decoded.id,
    username: decoded.username,
    role: decoded.role,
    unitId: decoded.unitId ?? null,
    locationId: decoded.locationId ?? null,
  });

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    sameSite: cookieConfig.sameSite,
    secure: cookieConfig.secure,
    maxAge: cookieConfig.maxAge.access,
  });

  return ok(res, undefined, 'Token yenilendi');
});

export const logout = asyncHandler(async (req, res) => {
  // Access token'ı (varsa) decode edip log için kullanıcı bilgisini al — başarısız olursa anonim çıkış logla
  let actor: { username: string; role: string | null } = { username: 'UNKNOWN', role: null };
  let entityId: string | null = null;
  const accessToken = req.cookies?.accessToken as string | undefined;
  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      actor = { username: decoded.username, role: decoded.role };
      entityId = decoded.id ?? null;
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
    await createAuditLog(db, {
      action: AUDIT_ACTION.USER_LOGOUT,
      actor,
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId,
      summary: `${actor.username} sistemden çıkış yaptı.`,
    });
  }

  return ok(res, undefined, 'Çıkış yapıldı');
});

export const getMe = asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  const user = await userRepo.findPublicById(db, userId);
  if (!user) throw notFound('Kullanıcı bulunamadı');

  return ok(res, {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      status: user.status,
      unitId: user.unitId,
      locationId: user.locationId,
    },
  });
});
