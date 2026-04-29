import express from 'express';
import { exportTimesheet, exportSimple, exportBot } from '../controllers/exportController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Herkesin erişebileceği dışa aktarım (Birim/Yetki filtreleri dahilinde)
router.use(authMiddleware);

// GET /api/export/timesheet?locationId=X&year=2024&month=10 -> Maaş Excel'i
router.get('/timesheet', exportTimesheet);

// GET /api/export/simple?locationId=X&year=2024&month=10 -> Basit Liste Excel'i
router.get('/simple', exportSimple);

// GET /api/export/bot?locationId=X&year=2024&month=10 -> Bot Girdi Excel'i
router.get('/bot', exportBot);

export default router;
