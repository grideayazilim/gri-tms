import express from 'express';
import { exportTimesheet, exportBot } from '../controllers/exportController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { exportQuerySchema } from '@timesheet/shared';

const router = express.Router();

router.use(authMiddleware);

// GET /api/export/timesheet?locationId=X&year=2024&month=10 -> Maaş Excel'i
router.get('/timesheet', validate(exportQuerySchema, 'query'), exportTimesheet);

// GET /api/export/bot?locationId=X&year=2024&month=10 -> Bot Girdi Excel'i
router.get('/bot', validate(exportQuerySchema, 'query'), exportBot);

export default router;
