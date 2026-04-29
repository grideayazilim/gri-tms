import express from 'express';
import { importEmployee, finalizeImport, bulkImportEmployees } from '../controllers/importController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Sadece Adminler import yapabilir
router.use(authMiddleware, adminMiddleware);

// POST /api/import/employee -> Tek bir çalışanın puantaj verisini içeri aktarır
router.post('/employee', importEmployee);

// POST /api/import/finalize -> Tüm çalışanlar eklendikten sonra audit log yazar ve varsa yevmiye ayarlarını günceller
router.post('/finalize', finalizeImport);

// POST /api/import/bulk-employees -> Sadece çalışan (isim, tc, vs) listesini toplu ekler
router.post('/bulk-employees', bulkImportEmployees);

export default router;
