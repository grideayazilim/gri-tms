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
import { sql } from 'drizzle-orm';
import { db } from './config/database.js';
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
// Açık gövde limiti — varsayılan 100kb örtük bir korumaydı; açık sınır
// hem daha net hata verir hem de varsayılan değişse bile korumayı sürdürür.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
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

/* ========================================================================
   SAĞLIK KONTROLLERİ
   /api/health veritabanına dokunur, erişilemezse 503 döner (Docker container'ı
   unhealthy işaretler). /api/health/live yalnızca sürecin ayakta olduğunu söyler.
   ======================================================================== */

// Liveness: hiçbir bağımlılığa dokunmaz, süreç ayaktaysa 200 döner
app.get('/api/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

const HEALTH_DB_TIMEOUT_MS = 3000;

/* Durum değiştiğinde bir kez logla. Docker 30 saniyede bir sorduğu için her
   kontrolü loglamak günlüğü kullanılamaz hale getirirdi. */
let lastHealthy: boolean | null = null;

function logHealthTransition(healthy: boolean, error?: string): void {
  if (lastHealthy === healthy) return;
  lastHealthy = healthy;
  if (healthy) {
    logger.info('Sağlık kontrolü: veritabanı erişilebilir');
  } else {
    logger.error('Sağlık kontrolü: veritabanına erişilemiyor', { error });
  }
}

// Readiness: veritabanı erişilemezse 503 → Docker container'ı unhealthy işaretler
app.get('/api/health', async (_req: Request, res: Response) => {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('health timeout')), HEALTH_DB_TIMEOUT_MS);
      }),
    ]);
    logHealthTransition(true);
    res.json({ status: 'ok', db: 'up' });
  } catch (err: unknown) {
    logHealthTransition(false, err instanceof Error ? err.message : 'Bilinmeyen hata');
    res.status(503).json({ status: 'error', db: 'down' });
  } finally {
    if (timer) clearTimeout(timer);
  }
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
