/* ========================================================================
   DATABASE INITIALIZATION (VERİTABANI İLKLENDİRME)
   Veritabanını sıfırdan oluşturur, rolleri tanımlar ve migrasyonları çalıştırır.
   ======================================================================== */
import pg from 'pg';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const { Client } = pg;

// .env dosyasından gelen yapılandırma
const superPassword = process.env.DB_SUPER_PASSWORD;
const config = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_SUPER_USER, // Superuser (postgres veya sistem kullanıcısı)
  ...(superPassword ? { password: superPassword } : {}),
  database: 'postgres', // İlk bağlantı için varsayılan sistem veritabanı
};

// Oluşturulacak db, kullanıcı ve şifre bilgileri
const DB_NAME = process.env.DB_NAME;
const APP_USER = process.env.DB_APP_USER;
const APP_USER_PASS = process.env.DB_APP_PASSWORD;
const MIG_USER = process.env.DB_MIGRATION_USER;
const MIG_USER_PASS = process.env.DB_MIGRATION_PASSWORD;

async function run() {
  console.log('🚀 Veritabanı ilklendirme işlemi başlatıldı...');

  const client = new Client(config);

  try {
    await client.connect();
    console.log('🔗 Postgres sunucusuna superuser olarak bağlanıldı.');

    // 1. Veritabanını Sil ve Yeniden Oluştur (Temiz Başlangıç)
    console.log(`🗑️ Veritabanı yeniden oluşturuluyor: ${DB_NAME}...`);
    await client.query(`DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);`);
    await client.query(`CREATE DATABASE ${DB_NAME} ENCODING 'UTF8';`);

    // uuid-ossp eklentisini kurmak için yeni oluşturulan veritabanına bağlan
    const extensionClient = new Client({ ...config, database: DB_NAME });
    await extensionClient.connect();
    console.log('🧪 uuid-ossp eklentisi etkinleştiriliyor...');
    await extensionClient.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
    await extensionClient.end();

    // 2. Rolleri (Kullanıcıları) Oluştur
    console.log('👤 Roller oluşturuluyor...');
    // Roller global olduğu için varlıklarını kontrol edip oluşturuyoruz veya şifre güncelliyoruz
    await client.query(`
      DO $$
      BEGIN
        -- Uygulama kullanıcısı (app_user)
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${APP_USER}') THEN
          CREATE USER ${APP_USER} WITH PASSWORD '${APP_USER_PASS}';
        ELSE
          ALTER USER ${APP_USER} WITH PASSWORD '${APP_USER_PASS}';
        END IF;

        -- Migrasyon kullanıcısı (migration_user)
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${MIG_USER}') THEN
          CREATE USER ${MIG_USER} WITH PASSWORD '${MIG_USER_PASS}';
        ELSE
          ALTER USER ${MIG_USER} WITH PASSWORD '${MIG_USER_PASS}';
        END IF;
      END
      $$;
    `);

    // 3. Veritabanı Sahibini Ayarla
    console.log(`👑 Veritabanı sahibi ${MIG_USER} olarak ayarlanıyor...`);
    await client.query(`ALTER DATABASE ${DB_NAME} OWNER TO ${MIG_USER};`);

    await client.end();

    // 4. Migrasyonları Çalıştır
    console.log('🚧 Drizzle Migrasyonları çalıştırılıyor...');
    // .env içindeki MIGRATION_DATABASE_URL kullanılarak migrasyonlar yapılır
    execSync('npm run db:migrate', { stdio: 'inherit' });

    // 5. Şema İzinlerini Ayarla (Yeni veritabanına bağlanarak)
    console.log('🔐 "app" şeması üzerinde yetkilendirmeler yapılıyor...');
    const dbClient = new Client({ ...config, database: DB_NAME });
    await dbClient.connect();

    await dbClient.query(`
      -- Şema sahipliğini migration_user'a ver
      ALTER SCHEMA app OWNER TO ${MIG_USER};
      ALTER SCHEMA public OWNER TO ${MIG_USER};

      -- app_user'a kullanım yetkisi ver
      GRANT USAGE ON SCHEMA app TO ${APP_USER};
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO ${APP_USER};
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO ${APP_USER};

      -- Gelecekte oluşturulacak tablolar için varsayılan yetkiler
      ALTER DEFAULT PRIVILEGES FOR USER ${MIG_USER} IN SCHEMA app
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_USER};
      
      ALTER DEFAULT PRIVILEGES FOR USER ${MIG_USER} IN SCHEMA app
      GRANT USAGE, SELECT ON SEQUENCES TO ${APP_USER};
    `);

    await dbClient.end();
    console.log('✨ Veritabanı kurulumu başarıyla tamamlandı!');

  } catch (err) {
    console.error('❌ Veritabanı ilklendirme hatası:', err);
    process.exit(1);
  }
}

run();
