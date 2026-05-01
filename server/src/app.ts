/* ========================================================================
   BACKEND UYGULAMA YAPILANDIRMASI (EXPRESS)
   Middleware zinciri, Route tanımlamaları ve Global hata yönetimi
   ======================================================================== */
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import { AppError } from './utils/AppError.js';
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

const app = express();

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

// ─── PG error narrowing helper ──────────────────────────────────────────────

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === '23505'
  );
}

// Global error handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  // PostgreSQL Unique Violation (Hata Kodu 23505): Çakışan kayıt durumunda 409 döndürür
  if (isUniqueViolation(err)) {
    res.status(409).json({ success: false, message: 'Bu kayıt zaten mevcut' });
    return;
  }

  // AppError — tip narrow
  if (err instanceof AppError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Bilinmeyen hata — 500
  const message = err instanceof Error ? err.message : 'Bilinmeyen hata';
  const stack = err instanceof Error ? err.stack : undefined;

  console.error(`[${req.method} ${req.path}]`, message, stack);
  res.status(500).json({
    success: false,
    message: 'Sunucu hatası',
  });
});

export default app;
