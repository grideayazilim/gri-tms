import express from "express";
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
    deleteUnit
} from "../controllers/locationAndUnitController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = express.Router();

// ==================== OKUMA (GET) İŞLEMLERİ ====================

// GET /api/locationAndUnits/locations -> Tüm yerleşke listesini döner
router.get("/locations", authMiddleware, getLocations);

// GET /api/locationAndUnits/units -> Tüm birim listesini döner
router.get("/units", authMiddleware, getUnits);

// GET /api/locationAndUnits/locations/:locationId/units -> Sadece belirli bir yerleşkeye ait birimleri döner
router.get("/locations/:locationId/units", authMiddleware, getUnitsByLocation);



// ==================== YAZMA (POST) İŞLEMLERİ ====================

// Yerleşke Ekleme: POST /api/locationAndUnits/locations
router.post("/locations", authMiddleware, adminMiddleware, createLocation);

// Birim Ekleme: POST /api/locationAndUnits/units
router.post("/units", authMiddleware, adminMiddleware, createUnit);



// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

// Yerleşke Güncelleme: PUT /api/locationAndUnits/locations/:locationId
router.put("/locations/:locationId", authMiddleware, adminMiddleware, updateLocation);

// Yerleşke ve Birimleri Toplu Senkronize Etme: PUT /api/locationAndUnits/locations/:locationId/sync
router.put("/locations/:locationId/sync", authMiddleware, adminMiddleware, syncLocationWithUnits);

// Birim Güncelleme: PUT /api/locationAndUnits/units/:unitId
router.put("/units/:unitId", authMiddleware, adminMiddleware, updateUnit);



// ==================== SİLME (DELETE) İŞLEMLERİ ====================

// Yerleşke Silme: DELETE /api/locationAndUnits/locations/:locationId
router.delete("/locations/:locationId", authMiddleware, adminMiddleware, deleteLocation);

// Birim Silme: DELETE /api/locationAndUnits/units/:unitId
router.delete("/units/:unitId", authMiddleware, adminMiddleware, deleteUnit);

export default router;