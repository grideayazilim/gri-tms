/* ========================================================================
   AUTH ROUTES (KİMLİK DOĞRULAMA ROTALARI)
   Kayıt, giriş, token yenileme ve çıkış endpoint'leri

   Katmanlı rate limit:
     IP başına ve kullanıcı adı başına ayrı sayaçlar vardır; kullanıcı adı
     sayacı IP rotasyonunu etkisiz kılar.
   ======================================================================== */
import express from 'express';
import rateLimit from 'express-rate-limit';
import type { Request } from 'express';

import { register, login, refresh, logout, getMe, changeInitialPassword, verifySession } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { signInSchema, signUpSchema, initialPasswordSchema } from '@timesheet/shared';
import { parseIpAllowlist, isIpAllowlisted } from '../utils/ipMatch.js';
import logger from '../utils/logger.js';

const router = express.Router();

/** Test ortamlarında limitleri atla (x-test-rate-limit başlığı ile bilinçli olarak açılabilir). */
const skipInTests = (req: Request): boolean =>
  (process.env.NODE_ENV === 'test'
    || process.env.DISABLE_RATE_LIMIT === 'true'
    || process.env.VITE_COVERAGE === 'true')
  && req.headers['x-test-rate-limit'] !== 'true';

/* Brute force'a karşı asıl koruma kullanıcı adı başına sayaçtır (aşağıda,
   15 dakikada 10). IP sayacı yalnızca kaba bir hacim korumasıdır: okulda tüm
   bilgisayarlar tek NAT IP'sinin arkasında olduğu için dar bir IP eşiği,
   şifresini yanlış giren tek bir kullanıcının herkesi kilitlemesine yol açar.
   Varsayılan 100 ≈ 70 kullanıcı × ay sonu yoğunluğu; yeniden build gerekmeden
   .env.prod'dan ayarlanabilir. */
const LOGIN_IP_RATE_LIMIT_MAX = Number(process.env.LOGIN_IP_RATE_LIMIT_MAX ?? 100);

/* İç ağ aralıkları yalnızca IP sayacından muaf tutulabilir. Kullanıcı adı
   sayacı hiçbir zaman muaf tutulmaz. */
const loginRateLimitAllowlist = parseIpAllowlist(process.env.LOGIN_RATE_LIMIT_ALLOWLIST);

// IP başına giriş denemesi: 15 dakikada LOGIN_IP_RATE_LIMIT_MAX (varsayılan 100)
const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: LOGIN_IP_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true, // başarılı girişler sayaca yazılmaz
  standardHeaders: true,
  legacyHeaders: false,
  // Mesaj ayrıştırıldı — kullanıcı hangi duvara çarptığını anlasın
  message: { success: false, message: 'Bu ağdan çok fazla giriş denemesi yapıldı. 15 dakika sonra tekrar deneyin.' },
  skip: (req: Request): boolean => skipInTests(req) || isIpAllowlisted(req.ip, loginRateLimitAllowlist),
});

// Kullanıcı adı başına giriş denemesi: 15 dakikada 10 — IP rotasyonunu etkisiz kılar
const loginUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request): string =>
    `u:${String((req.body as { username?: unknown } | undefined)?.username ?? '').toLocaleLowerCase('tr-TR').slice(0, 64)}`,
  standardHeaders: false,
  legacyHeaders: false,
  message: { success: false, message: 'Bu hesap için çok fazla deneme yapıldı. 15 dakika sonra tekrar deneyin.' },
  skip: skipInTests,
});

// Kayıt: saatte 5 / IP — her istek bcrypt + DB satırı + audit log yazıyor
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.' },
  skip: skipInTests,
});

// Token yenileme: 15 dakikada 60 — normalde 15 dakikada 1 yenileme yeterli
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla oturum yenileme denemesi.' },
  skip: skipInTests,
});

/* ── Public routes ────────────────────────────────────────────────────────── */

/* 70 kişilik sabit bir kadro için self-service kayıt gereksiz saldırı
   yüzeyi. Kadro oturduktan sonra .env'de ALLOW_SELF_REGISTRATION=false yapılır;
   kullanıcıları admin doğrudan oluşturur. */
const selfRegistrationEnabled = process.env.ALLOW_SELF_REGISTRATION !== 'false';

if (selfRegistrationEnabled) {
  router.post('/register', registerLimiter, validate(signUpSchema), register);
} else {
  logger.info('Self-service kayıt kapalı (ALLOW_SELF_REGISTRATION=false)');
  router.post('/register', (_req, res) => {
    res.status(403).json({
      success: false,
      message: 'Kayıt kapalıdır. Lütfen yöneticinizle iletişime geçin.',
    });
  });
}

router.post('/login', loginIpLimiter, loginUserLimiter, validate(signInSchema), login);
router.post('/refresh', refreshLimiter, refresh);
router.post('/logout', logout);

/* ── Protected routes ─────────────────────────────────────────────────────── */

router.get('/me', authMiddleware, getMe);

// Zorunlu ilk şifre değişimi — authMiddleware izin listesinde
router.post('/change-initial-password', authMiddleware, validate(initialPasswordSchema), changeInitialPassword);

// nginx auth_request bu ucu çağırır; bot arayüzü/API'si buradan korunur
router.get('/verify', authMiddleware, verifySession);

export default router;
