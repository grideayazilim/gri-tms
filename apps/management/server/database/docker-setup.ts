/* ========================================================================
   DOCKER SETUP (MIGRATION + GRANT)
   Docker entrypoint'te çalışır: migration yapar, app_user'a şema izinlerini verir.
   Sadece docker-entrypoint.sh tarafından çağrılır — local dev'de kullanılmaz.
   ======================================================================== */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function dockerSetup(): Promise<void> {
  const migrationUrl = process.env.MIGRATION_DATABASE_URL;
  if (!migrationUrl) throw new Error('MIGRATION_DATABASE_URL ortam değişkeni eksik');

  const appUser = process.env.DB_APP_USER;
  if (!appUser) throw new Error('DB_APP_USER ortam değişkeni eksik');

  const pool = new Pool({ connectionString: migrationUrl, max: 1 });
  const db = drizzle(pool);

  try {
    console.log('[docker-setup] Migration başlatılıyor...');
    await migrate(db, { migrationsFolder: './database/migrations' });
    console.log('[docker-setup] Migration tamamlandı.');

    console.log('[docker-setup] app_user için şema izinleri veriliyor...');
    const client = await pool.connect();
    try {
      // Şema erişimi
      await client.query(`GRANT USAGE ON SCHEMA app TO "${appUser}";`);
      /* TRUNCATE'i sistem sıfırlaması kullanıyor. 01-init.sh yalnızca ilk
         kurulumda çalıştığı için mevcut kurulumları burası onarır; aynı liste
         01-init.sh ve migrator.ts içinde de var. */
      await client.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA app TO "${appUser}";`,
      );
      // Bundan sonra migration ile eklenecek tablolar için de aynı yetki
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO "${appUser}";`,
      );
      // Sequence erişimi (uuid üretimi için)
      await client.query(
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO "${appUser}";`,
      );

      /* Yetkinin gerçekten oturduğunu doğrula: sessizce eksik kalırsa yıllık
         sıfırlama 500 döner, bu yüzden container hiç ayağa kalkmasın. */
      const check = await client.query<{ granted: boolean }>(
        `SELECT has_table_privilege($1, 'app.timesheet_days', 'TRUNCATE') AS granted;`,
        [appUser],
      );
      if (!check.rows[0]?.granted) {
        throw new Error(
          `app.timesheet_days üzerinde "${appUser}" için TRUNCATE yetkisi verilemedi — sistem sıfırlama çalışmaz.`,
        );
      }
    } finally {
      client.release();
    }
    console.log('[docker-setup] Şema izinleri verildi.');
  } finally {
    await pool.end();
  }
}

dockerSetup().catch((err: unknown) => {
  console.error('[docker-setup] Hata:', err);
  process.exit(1);
});
