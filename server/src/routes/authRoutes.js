import express from 'express';
import { register, login, refresh, logout, getMe } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { validate } from '../middlewares/validate.js';
import { signInSchema, signUpSchema } from '@timesheet/shared';

const router = express.Router();

// Public routes
router.post('/register', validate(signUpSchema), register);
router.post('/login', validate(signInSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected routes
router.get('/me', authMiddleware, getMe);

export default router;
