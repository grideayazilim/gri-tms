import express from 'express';
import {
  getPendingUsers,
  approvePendingUser,
  rejectPendingUser,
  getSystemSettings,
  updateSystemSettings,
  getMarkers,
  updateMarkers
} from '../controllers/settingsController.js';

// If you have auth middlewares
// import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// 1. Pending Users
router.get('/pending-users', getPendingUsers);
router.post('/pending-users/:id/approve', approvePendingUser);
router.delete('/pending-users/:id/reject', rejectPendingUser);

// 2. System Settings
router.get('/system', getSystemSettings);
router.put('/system', updateSystemSettings);

// 3. Markers
router.get('/markers', getMarkers);
router.put('/markers', updateMarkers);

export default router;