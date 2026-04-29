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
