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

    console.log('✅ Seed işlemi başarıyla tamamlandı. Admin kullanıcısı oluşturuldu/güncellendi.');
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  } finally {
    await seedPool.end();
  }
};

runSeed();
