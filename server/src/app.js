/* ========================================================================
   BACKEND UYGULAMA YAPILANDIRMASI (EXPRESS)
   Middleware zinciri, Route tanımlamaları ve Global hata yönetimi
   ======================================================================== */
import express from 'express';

import cors from 'cors';
import cookieParser from 'cookie-parser';
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
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route bulunamadı',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // PostgreSQL Unique Violation (Hata Kodu 23505): Çakışan kayıt durumunda 409 döndürür
  if (err.code === '23505') {
    return res.status(409).json({ success: false, message: 'Bu kayıt zaten mevcut' });
  }
  // Diğer özel hatalar veya standart 500 hataları
  const status = err.status || 500;

  if (status === 500) {
    console.error(`[${req.method} ${req.path}]`, err.message, err.stack);
  }
  res.status(status).json({
    success: false,
    message: status === 500 ? 'Sunucu hatası' : err.message,
  });
});

export default app;
