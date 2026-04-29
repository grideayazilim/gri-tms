import express from 'express';
import {
    getAnnouncements,
    getUnreadCount,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    markAsRead
} from '../controllers/announcementController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { announcementSchema } from '@timesheet/shared';

const router = express.Router();

// GET /api/announcements/unread-count -> Okunmamış duyuru sayısını getir
router.get('/unread-count', authMiddleware, getUnreadCount);

// GET /api/announcements -> Duyuruları getir (Sayfalama destekli)
router.get('/', authMiddleware, getAnnouncements);

// POST /api/announcements/:id/read -> Duyuruyu okundu olarak işaretle
router.post('/:id/read', authMiddleware, markAsRead);

// POST /api/announcements -> Yeni duyuru ekle (Admin yetkisi gerekir)
router.post('/', authMiddleware, adminMiddleware, validate(announcementSchema), createAnnouncement);

// PUT /api/announcements/:id -> Mevcut duyuruyu güncelle
router.put('/:id', authMiddleware, adminMiddleware, validate(announcementSchema), updateAnnouncement);

// DELETE /api/announcements/:id -> Duyuruyu sil
router.delete('/:id', authMiddleware, adminMiddleware, deleteAnnouncement);

export default router;
