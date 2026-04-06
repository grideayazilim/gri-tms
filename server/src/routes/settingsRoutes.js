import express from 'express';
import {
  getPendingUsers,
  approvePendingUser,
  rejectPendingUser,
  getSystemSettings,
  updateSystemSettings,
  getMarkers,
  updateMarkers,
  reorderMarkers,
  resetSystem
} from '../controllers/settingsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

// 1. Pending Users
router.get('/pending-users', authMiddleware, adminMiddleware, getPendingUsers);
router.post('/pending-users/:id/approve', authMiddleware, adminMiddleware, approvePendingUser);
router.delete('/pending-users/:id/reject', authMiddleware, adminMiddleware, rejectPendingUser);

// 2. System Settings
router.get('/system', authMiddleware, adminMiddleware, getSystemSettings);
router.put('/system', authMiddleware, adminMiddleware, updateSystemSettings);
router.delete('/system/reset', authMiddleware, adminMiddleware, resetSystem);

export default router;