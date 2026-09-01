import express from 'express';
import { bulkImportEmployees } from '../controllers/importController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { bulkImportEnvelopeSchema } from '@timesheet/shared';

const router = express.Router();

// Sadece Adminler import yapabilir
router.use(authMiddleware, adminMiddleware);

// POST /api/import/bulk-employees -> Sadece çalışan (isim, tc, vs) listesini toplu ekler
/* Zarf şeması yalnızca dizi sınırlarını kontrol eder; satır doğrulaması
   controller'da satır bazlı yapılır, böylece tek hatalı satır tüm isteği
   reddettirmez. */
router.post('/bulk-employees', validate(bulkImportEnvelopeSchema), bulkImportEmployees);

export default router;
