/* ========================================================================
   LOCATION & UNIT ROUTES (YERLEŞKE VE BİRİM ROTALARI)
   Yerleşke ve Birimlerin CRUD ve senkronizasyon endpoint'leri.
   ======================================================================== */
import express from 'express';

import {
  getLocations,
  getUnits,
  getUnitsByLocation,
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

// ==================== OKUMA (GET) İŞLEMLERİ ====================

router.get('/locations', getLocations);
router.get('/units', authMiddleware, getUnits);
router.get('/locations/:locationId/units', getUnitsByLocation);

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
