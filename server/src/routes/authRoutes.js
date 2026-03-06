import express from 'express';
import { register, login, refresh, logout, getMe, updateMe } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.put('/me', authMiddleware, updateMe);

export default router;
