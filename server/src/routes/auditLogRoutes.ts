import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Tüm audit log route'ları admin yetkisi gerektirir
router.use(authMiddleware, adminMiddleware);

// GET /audit-logs - Audit log listesi (filtrelenebilir)
router.get('/', getAuditLogs);

export default router;
