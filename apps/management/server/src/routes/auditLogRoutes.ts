import express from 'express';
import { getAuditLogs } from '../controllers/auditLogController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { auditLogQuerySchema } from '@timesheet/shared';

const router = express.Router();

// Tüm audit log route'ları admin yetkisi gerektirir
router.use(authMiddleware, adminMiddleware);

// GET /audit-logs - Audit log listesi (filtrelenebilir)
router.get('/', validate(auditLogQuerySchema, 'query'), getAuditLogs);

export default router;
