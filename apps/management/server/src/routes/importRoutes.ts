import express from 'express';
import { bulkImportEmployees } from '../controllers/importController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { bulkImportEmployeesSchema } from '@timesheet/shared';

const router = express.Router();

// Sadece Adminler import yapabilir
router.use(authMiddleware, adminMiddleware);

// POST /api/import/bulk-employees -> Sadece çalışan (isim, tc, vs) listesini toplu ekler
router.post('/bulk-employees', validate(bulkImportEmployeesSchema), bulkImportEmployees);

export default router;
