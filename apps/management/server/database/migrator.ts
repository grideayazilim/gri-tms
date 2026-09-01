/* ========================================================================
   DATABASE MIGRATOR (VERİTABANI MİGRASYON YÖNETİCİSİ)
   Drizzle migrations klasöründeki değişiklikleri veritabanına uygular.
   ======================================================================== */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const runMigration = async () => {
  // .env içindeki MIGRATION_DATABASE_URL kullanılmalıdır (migration_user yetkisiyle)
  const connectionString = process.env.MIGRATION_DATABASE_URL;

  if (!connectionString) {
    throw new Error('MIGRATION_DATABASE_URL .env dosyasında bulunamadı!');
  }

  // Migrasyon işlemi için tek bir bağlantı yeterlidir
  const migrationPool = new Pool({ connectionString, max: 1 });
  const db = drizzle(migrationPool);

  try {
    console.log('🚧 Migrasyonlar çalıştırılıyor...');
    // database/migrations klasöründeki SQL dosyalarını sırayla uygular
    await migrate(db, { migrationsFolder: './database/migrations' });
    
    console.log('🔒 Şema izinleri ayarlanıyor...');
    const appUser = process.env.DB_APP_USER || 'app_user';
    await migrationPool.query(`GRANT USAGE ON SCHEMA "app" TO "${appUser}"`);
    /* TRUNCATE'i sistem sıfırlaması kullanıyor. Aynı yetki listesi
       01-init.sh ve docker-setup.ts içinde de var. */
    await migrationPool.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA "app" TO "${appUser}"`);
    await migrationPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA "app" GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO "${appUser}"`);
    await migrationPool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "app" TO "${appUser}"`);
    
    console.log('✅ Migrasyonlar başarıyla tamamlandı.');
  } catch (error) {
    console.error('❌ Migrasyon hatası:', error);
    process.exit(1);
  } finally {
    // Havuzu kapatarak işlemi sonlandır
    await migrationPool.end();
  }
};

runMigration();
