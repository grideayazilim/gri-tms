/* ========================================================================
   AUTH CONTROLLER (KİMLİK DOĞRULAMA KONTROLCÜSÜ)
   Kayıt olma, giriş yapma, token yenileme ve çıkış işlemlerini yönetir.

   Loglama stratejisi:
     - Giriş/çıkış olayları → Winston (Docker logs) — sistemsel izleme
     - Kayıt (register) → hem DB audit_logs (admin onayı için) hem Winston
     - Başarısız girişler → Winston warn + audit log (güvenlik izleme)

   Güvenlik notları:
     - İlk girişte zorunlu şifre değişimi (mustChangePassword)
     - refresh DB'ye bakar; token_version ile oturum iptali
     - Tek tip hata mesajı + sabit zamanlama (kullanıcı adı sızdırmaz)
     - Kayıt ucu ALLOW_SELF_REGISTRATION ile kapatılabilir
   ======================================================================== */
import bcrypt from 'bcrypt';

import { db, withDrizzleTransaction } from '../config/database.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyAccessToken } from '../utils/tokenUtils.js';
import { cookieConfig } from '../config/jwt.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_STATUS, USER_ROLE } from '@timesheet/shared';
import type { JwtPayload, SignUpType, SignInType, InitialPasswordType } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { unauthorized, forbidden, badRequest, notFound, rethrowIfNotUniqueViolation } from '../utils/AppError.js';
import { ok, created } from '../utils/responses.js';
import * as userRepo from '../repositories/userRepo.js';
import logger from '../utils/logger.js';

/* ── Yardımcılar ──────────────────────────────────────────────────────────── */

/**
 * Kullanıcı bulunamadığında da bcrypt çalışsın diye kullanılan kukla hash.
 * Aksi halde yanıt süresi farkı ölçülebilir bir kullanıcı adı doğrulayıcısı olur.
 */
const DUMMY_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.6VNhF0oGZ5b1J7hqQ2WQ0uL1YQ7u';

type CookieName = 'accessToken' | 'refreshToken';

function setAuthCookie(res: Parameters<typeof ok>[0], name: CookieName, value: string): void {
  res.cookie(name, value, {
    httpOnly: true,
    sameSite: cookieConfig.sameSite,
    secure: cookieConfig.secure,
    maxAge: name === 'accessToken' ? cookieConfig.maxAge.access : cookieConfig.maxAge.refresh,
  });
}

function clearAuthCookies(res: Parameters<typeof ok>[0]): void {
  const opts = {
    httpOnly: true,
    sameSite: cookieConfig.sameSite,
    secure: cookieConfig.secure,
  };
  res.clearCookie('accessToken', opts);
  res.clearCookie('refreshToken', opts);
}

interface TokenSourceUser {
  id: string;
  username: string;
  role: JwtPayload['role'];
  unitId: string | null;
  locationId: string | null;
  mustChangePassword: boolean;
  tokenVersion: number;
}

function buildTokenPayload(user: TokenSourceUser): JwtPayload {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    unitId: user.unitId ?? null,
    locationId: user.locationId ?? null,
    mustChangePassword: user.mustChangePassword,
    tokenVersion: user.tokenVersion,
  };
}

/* ── Kayıt ────────────────────────────────────────────────────────────────── */

export const register = asyncHandler<Record<string, string>, unknown, SignUpType>(async (req, res) => {
  const { username, password, role, unitId, locationId } = req.body;

  // bcrypt transaction DIŞINDA — havuz bağlantısını CPU işiyle tutmaz
  const passwordHash = await bcrypt.hash(password, 10);

  let newUser;
  try {
    newUser = await withDrizzleTransaction(async (tx) => {
      const user = await userRepo.createPendingUser(tx, {
        username,
        passwordHash,
        role: role,
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
    /* Daha önce 409 "Bu kullanıcı adı zaten kullanımda" dönüyordu —
       doğrudan bir kullanıcı adı doğrulayıcısı. Artık başarılı kayıt ile aynı
       yanıt verilir; çakışmayı admin bekleyen kullanıcılar ekranında görür. */
    if (isUniqueViolation(err)) {
      logger.warn('Kayıt: kullanıcı adı çakışması', { username, ip: req.ip });
      return created(res, { pending: true },
        'Kayıt talebiniz alındı. Yönetici onayından sonra giriş yapabilirsiniz.');
    }
    rethrowIfNotUniqueViolation(err, 'Bu kullanıcı adı zaten kullanımda');
  }

  logger.info('Yeni kullanıcı kaydı', { username: newUser.username, role: newUser.role, ip: req.ip });

  return created(res, { pending: true },
    'Kayıt talebiniz alındı. Yönetici onayından sonra giriş yapabilirsiniz.');
});

/** Drizzle, pg hatasını DrizzleQueryError içinde `.cause` olarak sarar. */
function isUniqueViolation(err: unknown): boolean {
  const direct = typeof err === 'object' && err !== null && 'code' in err
    ? (err as { code?: unknown }).code
    : undefined;
  if (direct === '23505') return true;

  const cause = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
  return typeof cause === 'object' && cause !== null && 'code' in cause
    && (cause as { code?: unknown }).code === '23505';
}

/* ── Giriş ────────────────────────────────────────────────────────────────── */

export const login = asyncHandler<Record<string, string>, unknown, SignInType>(async (req, res) => {
  const { username, password } = req.body;

  const user = await userRepo.findByUsername(db, username);

  // Kullanıcı bulunamasa bile bcrypt çalıştır — zamanlama farkını kapat
  const isPasswordValid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  /* Tüm başarısızlıklar TEK mesaj + TEK durum kodu döner.
     Tek istisna: doğru şifreyi bilen kullanıcıya hesabının süresi dolduğu
     söylenir — bu bilgi zaten şifreyi bilen kişiye sızmış sayılır. */
  const fail = (reason: string): never => {
    logger.warn('Başarısız giriş denemesi', { username, reason, ip: req.ip });
    recordFailedLogin(username, reason, req.ip);
    throw unauthorized('Kullanıcı adı veya şifre hatalı.');
  };

  if (!user) fail('user_not_found');
  if (!isPasswordValid) fail('invalid_password');

  if (user!.status === USER_STATUS.EXPIRED) {
    logger.warn('Başarısız giriş denemesi', { username, reason: 'account_expired', ip: req.ip });
    throw forbidden('Hesabınızın süresi dolmuştur. Sisteme giriş yapamazsınız.');
  }

  if (user!.status !== USER_STATUS.ACTIVE) {
    logger.warn('Başarısız giriş denemesi', { username, reason: 'account_not_active', status: user!.status, ip: req.ip });
    throw forbidden('Hesabınız henüz aktif değil. Admin onayı bekleniyor.');
  }

  const tokenPayload = buildTokenPayload(user!);

  setAuthCookie(res, 'accessToken', generateAccessToken(tokenPayload));
  setAuthCookie(res, 'refreshToken', generateRefreshToken(tokenPayload));

  // Giriş olayı → Docker logs (sistemsel izleme). DB audit_logs'a yazmıyoruz.
  logger.info('Kullanıcı girişi', { username: user!.username, role: user!.role, ip: req.ip });

  return ok(res, {
    user: {
      id: user!.id,
      username: user!.username,
      role: user!.role,
      status: user!.status,
      unitId: user!.unitId,
      locationId: user!.locationId,
      mustChangePassword: user!.mustChangePassword,
    },
  });
});

/* ── Başarısız giriş izleme ───────────────────────────────────────────────────
   audit_logs'a yalnızca eşik aşıldığında tek kayıt yazılır. Her denemeyi yazmak,
   kimlik doğrulaması olmayan bir uçtan tetiklenen DB yazımı olurdu: IP
   rotasyonuyla tablo şişer ve giriş yolu her istekte bir INSERT bekler. */

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const FAILED_LOGIN_AUDIT_THRESHOLD = 5;
const FAILED_LOGIN_MAX_KEYS = 10_000;

interface FailedLoginRecord {
  count: number;
  firstAt: number;
}

const failedLoginCounts = new Map<string, FailedLoginRecord>();

/** Pencere dışı kayıtları temizler; bellek sınırsız büyümesin. */
function pruneFailedLoginCounts(now: number): void {
  for (const [key, rec] of failedLoginCounts) {
    if (now - rec.firstAt > FAILED_LOGIN_WINDOW_MS) failedLoginCounts.delete(key);
  }
  // Saldırgan rastgele kullanıcı adlarıyla belleği şişirmeye çalışırsa son çare
  if (failedLoginCounts.size > FAILED_LOGIN_MAX_KEYS) failedLoginCounts.clear();
}

const failedLoginPruner = setInterval(() => pruneFailedLoginCounts(Date.now()), 10 * 60 * 1000);
failedLoginPruner.unref();

/** Bu kullanıcı adı için audit kaydı yazılmalı mı? (yalnızca eşiği geçtiği anda) */
function shouldAuditFailedLogin(username: string): boolean {
  const now = Date.now();
  const key = username.toLocaleLowerCase('tr-TR').slice(0, 64);
  const rec = failedLoginCounts.get(key);

  if (!rec || now - rec.firstAt > FAILED_LOGIN_WINDOW_MS) {
    failedLoginCounts.set(key, { count: 1, firstAt: now });
    return false;
  }

  rec.count++;
  return rec.count === FAILED_LOGIN_AUDIT_THRESHOLD;
}

/** Testler için sayaçları sıfırlar. */
export function __resetFailedLoginCounters(): void {
  failedLoginCounts.clear();
}

/* Başarısız girişleri admin görebilsin diye audit log'a yazar. Yanıtı
   geciktirmemek için beklenmez, yalnızca eşik aşıldığında yazılır. */
function recordFailedLogin(username: string, reason: string, ip: string | undefined): void {
  if (!shouldAuditFailedLogin(username)) return;

  void createAuditLog(db, {
    action: AUDIT_ACTION.USER_LOGIN_FAILED,
    actor: { username: 'SYSTEM', role: null },
    entityType: AUDIT_ENTITY_TYPE.USER,
    summary: `"${username}" için ${FAILED_LOGIN_AUDIT_THRESHOLD} başarısız giriş denemesi yapıldı (15 dakika içinde).`,
    metadata: { username, reason, ip: ip ?? null, threshold: FAILED_LOGIN_AUDIT_THRESHOLD },
  }).catch((err: unknown) => {
    logger.error('Başarısız giriş audit kaydı yazılamadı', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

/* ── Token yenileme ───────────────────────────────────────────────────────── */

export const refresh = asyncHandler(async (req, res) => {
  const refreshTokenStr = req.cookies?.refreshToken as string | undefined;

  if (!refreshTokenStr) throw unauthorized('Refresh token bulunamadı');

  let decoded: JwtPayload;
  try {
    decoded = verifyRefreshToken(refreshTokenStr);
  } catch {
    throw unauthorized('Token yenilenemedi');
  }

  /* Token'a güvenmeyip DB'ye bakılır: silinen, pasife alınmış veya rolü değişmiş
     kullanıcı aksi halde 7 gün boyunca eski yetkileriyle çalışmaya devam eder. */
  const user = await userRepo.findPublicById(db, decoded.id);

  if (!user || user.status !== USER_STATUS.ACTIVE || user.tokenVersion !== decoded.tokenVersion) {
    clearAuthCookies(res);
    logger.warn('Refresh reddedildi', {
      userId: decoded.id,
      status: user?.status ?? 'DELETED',
      tokenVersionMismatch: user ? user.tokenVersion !== decoded.tokenVersion : false,
      ip: req.ip,
    });
    throw unauthorized('Oturumunuz geçersiz. Lütfen tekrar giriş yapın.');
  }

  // Token'ı DB'deki GÜNCEL rol/birim/bayrak ile yeniden üret
  const payload = buildTokenPayload(user);
  setAuthCookie(res, 'accessToken', generateAccessToken(payload));
  setAuthCookie(res, 'refreshToken', generateRefreshToken(payload));

  return ok(res, undefined, 'Token yenilendi');
});

/* ── Çıkış ────────────────────────────────────────────────────────────────── */

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

  clearAuthCookies(res);

  // Çıkış olayı → Docker logs (sistemsel izleme). DB audit_logs'a yazmıyoruz.
  if (actor.username !== 'UNKNOWN') {
    logger.info('Kullanıcı çıkışı', { username: actor.username, role: actor.role, ip: req.ip });
  }

  return ok(res, undefined, 'Çıkış yapıldı');
});

/* ── Oturum bilgisi ───────────────────────────────────────────────────────── */

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
      mustChangePassword: user.mustChangePassword,
    },
  });
});

/* ── Zorunlu şifre değişimi ─────────────────────────────────────────── */

export const changeInitialPassword = asyncHandler<Record<string, string>, unknown, InitialPasswordType>(
  async (req, res) => {
    const { newPassword } = req.body;
    const userId = req.user!.id;

    const current = await userRepo.findById(db, userId);
    if (!current) throw notFound('Kullanıcı bulunamadı');

    if (!current.mustChangePassword) {
      throw badRequest('Şifre değişimi zorunlu değil. Profil sayfasından değiştirebilirsiniz.');
    }

    // Aynı şifreyi tekrar koymayı engelle — yoksa "1234 → 1234" ile madde kapanmış görünür
    if (await bcrypt.compare(newPassword, current.passwordHash)) {
      throw badRequest('Yeni şifre mevcut şifreyle aynı olamaz.');
    }

    // bcrypt transaction dışında
    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updated = await withDrizzleTransaction(async (tx) => {
      const row = await userRepo.completeInitialPasswordChange(tx, userId, passwordHash);
      if (!row) throw notFound('Kullanıcı bulunamadı');

      await createAuditLog(tx, {
        action: AUDIT_ACTION.USER_PASSWORD_CHANGE,
        actor: { username: current.username, role: current.role },
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: userId,
        summary: `${current.username} zorunlu ilk giriş şifre değişimini tamamladı.`,
      });

      return row;
    });

    // Bayrağı temizlenmiş yeni token'lar bas — yoksa kapı 15 dakika daha kapalı kalır
    const payload = buildTokenPayload(updated);
    setAuthCookie(res, 'accessToken', generateAccessToken(payload));
    setAuthCookie(res, 'refreshToken', generateRefreshToken(payload));

    logger.info('Zorunlu şifre değişimi tamamlandı', { username: current.username, ip: req.ip });

    return ok(res, {
      user: {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        status: updated.status,
        unitId: updated.unitId,
        locationId: updated.locationId,
        mustChangePassword: false,
      },
    }, 'Şifreniz güncellendi.');
  },
);

/* ── Bot servisi için oturum doğrulama ucu ──────────────────────────── */

/* nginx auth_request bu ucu çağırır: gövde yok, yalnızca durum kodu ve
   başlıkta kullanıcı bilgisi. Bot yalnızca yöneticilere açık, diğerleri 403. */
export const verifySession = asyncHandler(async (req, res) => {
  const user = req.user!;

  if (user.role !== USER_ROLE.ADMIN) {
    res.status(403).end();
    return;
  }

  res.setHeader('X-Auth-User', encodeURIComponent(user.username));
  res.setHeader('X-Auth-Role', user.role);
  res.setHeader('X-Auth-User-Id', user.id);
  res.status(204).end();
});
