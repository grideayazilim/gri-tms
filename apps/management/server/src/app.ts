/* ========================================================================
   BACKEND UYGULAMA YAPILANDIRMASI (EXPRESS)
   Middleware zinciri, Route tanımlamaları ve Global hata yönetimi
   ======================================================================== */
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { AppError } from './utils/AppError.js';
import logger from './utils/logger.js';
import authRoutes from './routes/authRoutes.js';
import locationAndUnitRoutes from './routes/locationAndUnitRoutes.js';
import timesheetRoutes from './routes/timesheetRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import userRoutes from './routes/userRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';
import exportRoutes from './routes/exportRoutes.js';
import importRoutes from './routes/importRoutes.js';

import { errorMiddleware } from './middlewares/errorMiddleware.js';

const app = express();

// Gerçek istemci IP adresini alabilmek için ters vekil sunucuya (Nginx, Ngrok vb.) güven
app.set('trust proxy', 1);

app.use(helmet());

// Tüm /api/ rotalarına 15 dk pencerede max 5000 istek — DoS koruması
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Çok fazla istek gönderildi, lütfen daha sonra tekrar deneyin.' },
  skip: () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true' || process.env.VITE_COVERAGE === 'true',
});
app.use('/api/', globalLimiter);

// CORS Yapılandırması: Cookie bazlı Auth için credentials: true olmalı
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/locationAndUnits', locationAndUnitRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route bulunamadı',
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;
