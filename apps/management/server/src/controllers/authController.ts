/* ========================================================================
   AUTH CONTROLLER (KİMLİK DOĞRULAMA KONTROLCÜSÜ)
   Kayıt olma, giriş yapma, token yenileme ve çıkış işlemlerini yönetir.

   Loglama stratejisi:
     - Giriş/çıkış olayları → Winston (Docker logs) — sistemsel izleme
     - Kayıt (register) → hem DB audit_logs (admin onayı için) hem Winston
     - Başarısız girişler → Winston warn (güvenlik izleme)
   ======================================================================== */
import bcrypt from 'bcrypt';

import { db, withDrizzleTransaction } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyAccessToken } from '../utils/tokenUtils.js';
import { cookieConfig } from '../config/jwt.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared';
import type { JwtPayload, SignUpType, SignInType } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { unauthorized, forbidden, notFound, rethrowIfNotUniqueViolation } from '../utils/AppError.js';
import { ok, created } from '../utils/responses.js';
import * as userRepo from '../repositories/userRepo.js';
import logger from '../utils/logger.js';
import type { DatabaseError } from 'pg';


export const register = asyncHandler(async (req, res) => {
  const { username, password, role, unitId, locationId } = req.body as SignUpType;

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

      // Register admin-anlamlı olay — DB audit_logs'a yaz (admin onay akışı için)
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
    rethrowIfNotUniqueViolation(err, 'Bu kullanıcı adı zaten kullanımda');
  }

  logger.info('Yeni kullanıcı kaydı', { username: newUser.username, role: newUser.role, ip: req.ip });

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
  const { username, password } = req.body as SignInType;

  const user = await userRepo.findByUsername(db, username);
  if (!user) {
    logger.warn('Başarısız giriş denemesi', { username, reason: 'user_not_found', ip: req.ip });
    throw unauthorized('Kullanıcı adı veya şifre yanlış');
  }

  if (user.status === 'EXPIRED') {
    logger.warn('Başarısız giriş denemesi', { username, reason: 'account_expired', ip: req.ip });
    throw forbidden('Hesabınızın süresi dolmuştur. Sisteme giriş yapamazsınız.');
  }

  if (user.status !== 'ACTIVE') {
    logger.warn('Başarısız giriş denemesi', { username, reason: 'account_not_active', status: user.status, ip: req.ip });
    throw forbidden('Hesabınız henüz aktif değil. Admin onayı bekleniyor.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    logger.warn('Başarısız giriş denemesi', { username, reason: 'invalid_password', ip: req.ip });
    throw unauthorized('Kullanıcı adı veya şifre yanlış');
  }

  const tokenPayload: JwtPayload = {
    id: user.id,
    username: user.username,
    role: user.role as JwtPayload['role'],
    unitId: user.unitId ?? null,
    locationId: user.locationId ?? null,
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

  // Giriş olayı → Docker logs (sistemsel izleme). DB audit_logs'a yazmıyoruz.
  logger.info('Kullanıcı girişi', { username: user.username, role: user.role, ip: req.ip });

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
  let actor = { username: 'UNKNOWN', role: null as string | null };
  const accessToken = req.cookies?.accessToken as string | undefined;
  if (accessToken) {
    try {
      const decoded = verifyAccessToken(accessToken);
      actor = { username: decoded.username, role: decoded.role };
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

  // Çıkış olayı → Docker logs (sistemsel izleme). DB audit_logs'a yazmıyoruz.
  if (actor.username !== 'UNKNOWN') {
    logger.info('Kullanıcı çıkışı', { username: actor.username, role: actor.role, ip: req.ip });
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
