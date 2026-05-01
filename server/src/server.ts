/* ========================================================================
   SUNUCU BAŞLATMA (SERVER ENTRY POINT)
   Veritabanı bağlantısı, Port dinleme ve Cron Job başlatma
   ======================================================================== */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import app from './app.js';
import { db } from './config/database.js';
import { initCronJobs } from './utils/cronJobs.js';

const PORT = process.env.PORT ?? 3000;

// Drizzle üzerinden bağlantı kontrolü — raw pool.query yerine tutarlı erişim
async function checkDatabaseConnection(): Promise<void> {
  try {
    const result = await db.execute(sql`SELECT NOW()`);
    const row = result.rows[0] as { now?: string } | undefined;
    console.log('✅ Veritabanı bağlantısı başarılı (Time:', row?.now, ')');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Veritabanına bağlanılamadı! Ayarları kontrol et:', message);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  await checkDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server http://localhost:${String(PORT)} adresinde yayında!`);
    initCronJobs();
  });
}

main().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
