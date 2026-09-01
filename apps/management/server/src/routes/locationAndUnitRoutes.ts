/* ========================================================================
   LOCATION & UNIT ROUTES (YERLEŞKE VE BİRİM ROTALARI)
   Yerleşke ve Birimlerin CRUD ve senkronizasyon endpoint'leri.
   ======================================================================== */
import express from 'express';
import rateLimit from 'express-rate-limit';

import {
  getLocations,
  getUnits,
  getUnitsByLocation,
  getPublicSignupTree,
  createLocation,
  createUnit,
  updateLocation,
  updateUnit,
  syncLocationWithUnits,
  deleteLocation,
  deleteUnit,
} from '../controllers/locationAndUnitController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { locationSchema, unitSchema, syncLocationSchema } from '@timesheet/shared';

const router = express.Router();

/** Public kayıt ağacı ucu için sınır — tek public uç sınırsız sorgulanmasın. */
const signupTreeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' },
  skip: () => process.env.NODE_ENV === 'test'
    || process.env.DISABLE_RATE_LIMIT === 'true'
    || process.env.VITE_COVERAGE === 'true',
});

// ==================== OKUMA (GET) İŞLEMLERİ ====================

/* Kayıt (SignUp) ekranı henüz giriş yapmamış kullanıcıya yerleşke/birim
   seçtirdiği için tek bir public uç gerekiyor: yalnızca id + ad döndürür ve
   rate limit'e tabidir. programNo ve employeeCount taşıyan asıl uçlar auth
   arkasındadır. */
router.get('/public/signup-tree', signupTreeLimiter, getPublicSignupTree);

router.get('/locations', authMiddleware, getLocations);
router.get('/units', authMiddleware, getUnits);
router.get('/locations/:locationId/units', authMiddleware, getUnitsByLocation);

// ==================== YAZMA (POST) İŞLEMLERİ ====================

router.post('/locations', authMiddleware, adminMiddleware, validate(locationSchema), createLocation);
router.post('/units', authMiddleware, adminMiddleware, validate(unitSchema), createUnit);

// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

router.put('/locations/:locationId', authMiddleware, adminMiddleware, validate(locationSchema), updateLocation);
router.put('/locations/:locationId/sync', authMiddleware, adminMiddleware, validate(syncLocationSchema), syncLocationWithUnits);
router.put('/units/:unitId', authMiddleware, adminMiddleware, validate(unitSchema), updateUnit);

// ==================== SİLME (DELETE) İŞLEMLERİ ====================

router.delete('/locations/:locationId', authMiddleware, adminMiddleware, deleteLocation);
router.delete('/units/:unitId', authMiddleware, adminMiddleware, deleteUnit);

export default router;
