/* ========================================================================
   DEMO SEEDER (SUNUM VE TEST VERİLERİ YÜKLEYİCİ)
   Gerçekçi demo verisi üretir. Çalıştırıldığında önce mevcut demo verilerini
   temizler (admin kullanıcısına dokunmadan), ardından yeniden oluşturur.
   ======================================================================== */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';

dotenv.config();
const { Pool } = pg;

// ─── Demo veri tanımları ──────────────────────────────────────────────────────

const DEMO_LOCATIONS = [
  { name: 'Kuzey Kampüsü', programNo: 'PRG-001' },
  { name: 'Güney Kampüsü', programNo: 'PRG-002' },
  { name: 'Doğu Kampüsü', programNo: 'PRG-003' },
];

const DEMO_UNITS = ['İnşaat', 'Elektrik', 'Mekanik'];

// Kullanıcı adı ön eklerini yerleşke ve birime göre üret
const locationCodes = ['kuzey', 'guney', 'dogu'];
const unitCodes = ['ins', 'elk', 'mek'];

// ─── Yardımcı: Dinamik tarih hesaplama ───────────────────────────────────────

function calcProgramDates(): { startDate: string; endDate: string } {
  const now = new Date();

  // 3 ay öncesinin ilk günü
  const startMonth = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const startDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}-01`;

  // 3 ay sonrasının son günü
  const endMonthDate = new Date(now.getFullYear(), now.getMonth() + 4, 0); // +4 ay, 0. gün = +3 ay son gün
  const endDate = `${endMonthDate.getFullYear()}-${String(endMonthDate.getMonth() + 1).padStart(2, '0')}-${String(endMonthDate.getDate()).padStart(2, '0')}`;

  return { startDate, endDate };
}

// ─── Ana Seeder ───────────────────────────────────────────────────────────────

const runDemoSeed = async () => {
  const connectionString = process.env.MIGRATION_DATABASE_URL;
  if (!connectionString) {
    throw new Error('MIGRATION_DATABASE_URL .env dosyasında bulunamadı!');
  }

  console.log('🚀 Demo verileri yükleniyor...');

  const seedPool = new Pool({ connectionString, max: 1 });
  const db = drizzle(seedPool);

  try {
    const passwordHash = await bcrypt.hash('1234', 10);

    // ── 1. Mevcut demo verilerini temizle (FK sırasına göre) ─────────────────
    console.log('🗑️  Mevcut demo verileri temizleniyor...');

    // Önce RESPONSIBLE kullanıcılar (location/unit FK bağımlılığı)
    await db.execute(sql`
      DELETE FROM app.users WHERE role = 'RESPONSIBLE';
    `);

    // Sonra birimler (locations'a FK var, cascade ile çalışacak ama explicit silelim)
    await db.execute(sql`
      DELETE FROM app.units;
    `);

    // Son olarak yerleşkeler
    await db.execute(sql`
      DELETE FROM app.locations;
    `);

    // ── 2. Yerleşkeleri oluştur ──────────────────────────────────────────────
    console.log('🏗️  Yerleşkeler oluşturuluyor...');

    const createdLocationIds: string[] = [];
    for (const loc of DEMO_LOCATIONS) {
      const result = await db.execute(sql`
        INSERT INTO app.locations (name, program_no)
        VALUES (${loc.name}, ${loc.programNo})
        RETURNING id;
      `);
      const row = result.rows[0] as { id: string };
      createdLocationIds.push(row.id);
    }

    // ── 3. Birimleri oluştur ─────────────────────────────────────────────────
    console.log('🏢  Birimler oluşturuluyor...');

    const createdUnitIds: { locationId: string; unitId: string; locIdx: number; unitIdx: number }[] = [];
    for (let locIdx = 0; locIdx < createdLocationIds.length; locIdx++) {
      const locationId = createdLocationIds[locIdx]!;
      for (let unitIdx = 0; unitIdx < DEMO_UNITS.length; unitIdx++) {
        const unitName = DEMO_UNITS[unitIdx]!;
        const result = await db.execute(sql`
          INSERT INTO app.units (location_id, name)
          VALUES (${locationId}, ${unitName})
          RETURNING id;
        `);
        const row = result.rows[0] as { id: string };
        createdUnitIds.push({ locationId, unitId: row.id, locIdx, unitIdx });
      }
    }

    // ── 4. Kullanıcıları oluştur (her birim için 20 RESPONSIBLE) ─────────────
    console.log('👥  Kullanıcılar oluşturuluyor...');

    // Program bitiş tarihini expiry_date hesabı için kullan (+20 gün)
    const { startDate, endDate } = calcProgramDates();
    const expiryDate = new Date(new Date(endDate).getTime() + 20 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    for (const { locationId, unitId, locIdx, unitIdx } of createdUnitIds) {
      const locCode = locationCodes[locIdx]!;
      const unitCode = unitCodes[unitIdx]!;

      for (let userNum = 1; userNum <= 20; userNum++) {
        const username = `${locCode}_${unitCode}_${String(userNum).padStart(2, '0')}`;
        await db.execute(sql`
          INSERT INTO app.users (username, password_hash, role, status, location_id, unit_id, expiry_date)
          VALUES (
            ${username},
            ${passwordHash},
            'RESPONSIBLE',
            'ACTIVE',
            ${locationId},
            ${unitId},
            ${expiryDate}
          )
          ON CONFLICT (username) DO UPDATE
          SET password_hash = ${passwordHash}, status = 'ACTIVE',
              location_id = ${locationId}, unit_id = ${unitId}, expiry_date = ${expiryDate};
        `);
      }
    }

    // ── 5. Sistem ayarlarında program tarihlerini güncelle ───────────────────
    console.log('⚙️  Program tarihleri güncelleniyor...');

    await db.execute(sql`
      INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
      VALUES (1, 1080.50, 3, ${startDate}, ${endDate})
      ON CONFLICT (id) DO UPDATE
      SET program_start_date = ${startDate}, program_end_date = ${endDate};
    `);

    const totalUsers = createdUnitIds.length * 20;
    console.log(`✅ Demo seed tamamlandı.`);
    console.log(`   - ${DEMO_LOCATIONS.length} yerleşke`);
    console.log(`   - ${createdUnitIds.length} birim`);
    console.log(`   - ${totalUsers} kullanıcı (şifre: 1234)`);
    console.log(`   - Program: ${startDate} → ${endDate}`);
  } catch (error) {
    console.error('❌ Demo seed hatası:', error);
    process.exit(1);
  } finally {
    await seedPool.end();
  }
};

runDemoSeed();
