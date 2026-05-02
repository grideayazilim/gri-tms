/* ========================================================================
   DATABASE SEEDER (VERİTABANI ÖN VERİ YÜKLEYİCİ)
   Veritabanına başlangıç verilerini (örneğin ilk admin kullanıcısı) yükler.
   ======================================================================== */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';

dotenv.config();
const { Pool } = pg;

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
    // İlk admin kullanıcısı için şifre oluştur
    const password = '1234';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Admin kullanıcısını ekle veya varsa güncelle (Upsert)
    await db.execute(sql`
      INSERT INTO app.users (username, password_hash, role, status)
      VALUES ('admin', ${passwordHash}, 'ADMIN', 'ACTIVE')
      ON CONFLICT (username) DO UPDATE
      SET password_hash = ${passwordHash}, role = 'ADMIN', status = 'ACTIVE';
    `);

    // Sistem ayarlarını ekle veya varsa günlük ücret ve haftalık gün sınırını güncelle
    await db.execute(sql`
      INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
      VALUES (1, 1080.50, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day')
      ON CONFLICT (id) DO UPDATE
      SET daily_wage = 1080.50, max_weekly_days = 3;
    `);

    console.log('✅ Seed işlemi başarıyla tamamlandı. Admin kullanıcısı ve sistem ayarları oluşturuldu/güncellendi.');
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  } finally {
    await seedPool.end();
  }
};

runSeed();
