/* ========================================================================
   AUTH ROUTES (KİMLİK DOĞRULAMA ROTALARI)
   Kayıt, giriş, token yenileme ve çıkış endpoint'leri
   ======================================================================== */
import express from 'express';
import rateLimit from 'express-rate-limit';

import { register, login, refresh, logout, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { signInSchema, signUpSchema } from '@timesheet/shared';

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla istek gönderildi, lütfen 15 dakika sonra tekrar deneyin.' },
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true' || process.env.VITE_COVERAGE === 'true',
});

// Public routes
router.post('/register', authLimiter, validate(signUpSchema), register);
router.post('/login', authLimiter, validate(signInSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes
router.get('/me', authMiddleware, getMe);

export default router;
