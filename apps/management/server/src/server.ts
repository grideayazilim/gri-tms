/* ========================================================================
   SUNUCU BAŞLATMA (SERVER ENTRY POINT)
   Veritabanı bağlantısı, Port dinleme ve Cron Job başlatma
   ======================================================================== */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import app from './app.js';
import { db, pool } from './config/database.js';
import { initCronJobs, runNightlyMaintenance } from './utils/cronJobs.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT ?? 3000;

async function checkDatabaseConnection(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    const row = result.rows[0] as { now?: string } | undefined;
    logger.info('Veritabanı bağlantısı başarılı', { time: row?.now });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('Veritabanına bağlanılamadı', { error: message });
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await checkDatabaseConnection();

  const server = app.listen(PORT, () => {
    logger.info(`Server başlatıldı`, { port: PORT, env: process.env.NODE_ENV });
    initCronJobs();
    runNightlyMaintenance().catch((err: unknown) => {
      logger.error('Startup maintenance check failed', { error: err instanceof Error ? err.message : String(err) });
    });
  });

  /* Beklenmeyen hatalar process'i sessizce düşürmesin; loglanmadan ölmek
     "neden restart oldu" sorusunu cevapsız bırakır. */
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled promise rejection', {
      error: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught exception — süreç kapatılıyor', { error: err.message, stack: err.stack });
    shutdown('uncaughtException', 1);
  });

  // Docker `stop` sırasında açık istekleri tamamla, havuzu düzgün kapat
  let shuttingDown = false;
  function shutdown(signal: string, exitCode = 0): void {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Kapatma sinyali alındı', { signal });

    const forceTimer = setTimeout(() => {
      logger.warn('Zamanında kapanmadı — zorla çıkılıyor');
      process.exit(exitCode || 1);
    }, 10_000);
    forceTimer.unref();

    server.close(() => {
      pool.end()
        .catch((err: unknown) => logger.error('Havuz kapatılamadı', {
          error: err instanceof Error ? err.message : String(err),
        }))
        .finally(() => {
          logger.info('Sunucu düzgün şekilde kapatıldı');
          process.exit(exitCode);
        });
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  logger.error('Fatal startup error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
