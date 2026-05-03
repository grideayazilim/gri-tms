/* ========================================================================
   SUNUCU BAŞLATMA (SERVER ENTRY POINT)
   Veritabanı bağlantısı, Port dinleme ve Cron Job başlatma
   ======================================================================== */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import app from './app.js';
import { db } from './config/database.js';
import { initCronJobs } from './utils/cronJobs.js';
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

  app.listen(PORT, () => {
    logger.info(`Server başlatıldı`, { port: PORT, env: process.env.NODE_ENV });
    initCronJobs();
  });
}

main().catch((err: unknown) => {
  logger.error('Fatal startup error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
