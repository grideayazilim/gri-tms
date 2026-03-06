import express from "express";
import {
    getAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} from "../controllers/announcementController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { adminMiddleware } from "../middlewares/adminMiddleware.js";

const router = express.Router();

// GET /api/announcements -> Duyuruları getir (Sayfalama destekli)
router.get("/", authMiddleware, getAnnouncements);

// POST /api/announcements -> Yeni duyuru ekle (Admin yetkisi gerekir)
router.post("/", authMiddleware, adminMiddleware, createAnnouncement);

// PUT /api/announcements/:id -> Mevcut duyuruyu güncelle
router.put("/:id", authMiddleware, adminMiddleware, updateAnnouncement);

// DELETE /api/announcements/:id -> Duyuruyu sil
router.delete("/:id", authMiddleware, adminMiddleware, deleteAnnouncement);

export default router;