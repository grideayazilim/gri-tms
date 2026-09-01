/* ========================================================================
   DATABASE SEEDER (VERİTABANI ÖN VERİ YÜKLEYİCİ)
   Veritabanına başlangıç verilerini (örneğin ilk admin kullanıcısı) yükler.
   Admin must_change_password ile oluşturulur ve seeder tekrar çalıştığında
   mevcut şifreyi ezmez (DO NOTHING).
   ======================================================================== */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';

dotenv.config();
const { Pool } = pg;

const DEFAULT_SEED_PASSWORD = '1234';

const runSeed = async () => {
  // Migrasyon kullanıcısı ile bağlanarak başlangıç verilerini ekliyoruz
  const connectionString = process.env.MIGRATION_DATABASE_URL;

  if (!connectionString) {
    throw new Error('MIGRATION_DATABASE_URL .env dosyasında bulunamadı!');
  }

  console.log('🚀 Başlangıç verileri yükleniyor...');

  const seedPool = new Pool({ connectionString, max: 1 });
  const db = drizzle(seedPool);

  try {
    // İlk admin kullanıcısı için şifre oluştur.
    // SEED_ADMIN_PASSWORD verilmezse '1234' kullanılır; her iki durumda da
    // must_change_password bayrağı ile ilk girişte değişim zorunlu tutulur.
    const password = process.env.SEED_ADMIN_PASSWORD || DEFAULT_SEED_PASSWORD;
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Admin kullanıcısını ekle; varsa dokunma.
    // DO NOTHING sayesinde seeder idempotent kalır ama kazara şifre sıfırlaması yapamaz.
    await db.execute(sql`
      INSERT INTO app.users (username, password_hash, role, status, must_change_password)
      VALUES ('admin', ${passwordHash}, 'ADMIN', 'ACTIVE', true)
      ON CONFLICT (username) DO NOTHING;
    `);

    // Mevcut kurulumlar için güvenlik ağı: admin hâlâ varsayılan zayıf şifreyi
    // kullanıyorsa, şifre değişim zorunluluğunu geriye dönük olarak işaretle.
    const existing = await db.execute<{ id: string; password_hash: string; must_change_password: boolean }>(sql`
      SELECT id, password_hash, must_change_password FROM app.users WHERE username = 'admin';
    `);
    const adminRow = existing.rows[0];
    if (adminRow && !adminRow.must_change_password) {
      const stillDefault = await bcrypt.compare(DEFAULT_SEED_PASSWORD, adminRow.password_hash);
      if (stillDefault) {
        await db.execute(sql`
          UPDATE app.users SET must_change_password = true WHERE id = ${adminRow.id};
        `);
        console.log('⚠️  Admin hâlâ varsayılan şifreyi kullanıyor — ilk girişte değişim zorunlu kılındı.');
      }
    }

    // Sistem ayarlarını ekle; varsa dokunma. Upsert olsaydı seeder program
    // ortasında çalıştırıldığında günlük ücreti ezerdi.
    await db.execute(sql`
      INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
      VALUES (1, 1080.50, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('✅ Seed işlemi başarıyla tamamlandı. Admin kullanıcısı ve sistem ayarları hazır.');
    console.log('ℹ️  İlk girişte şifre değişimi zorunludur.');
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  } finally {
    await seedPool.end();
  }
};

runSeed();
