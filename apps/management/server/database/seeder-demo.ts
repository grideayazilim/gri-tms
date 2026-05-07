/* ========================================================================
   DEMO SEEDER (SUNUM VE TEST VERİLERİ YÜKLEYİCİ)
   Gerçekçi demo verisi üretir. Faker ile 1000 öğrenci, 7 yerleşke,
   63 birim ve her birime özel sorumlu (şifreleri kullanıcı adı ile aynı) oluşturur.
   ======================================================================== */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import { fakerTR as faker } from '@faker-js/faker';

dotenv.config();
const { Pool } = pg;

// ─── Demo veri tanımları ──────────────────────────────────────────────────────

const DEMO_LOCATIONS = [
  { name: 'Kuzey Kampüsü', programNo: 'PRG-KZY', prefix: 'kuzey' },
  { name: 'Güney Kampüsü', programNo: 'PRG-GNY', prefix: 'guney' },
  { name: 'Merkez Kampüsü', programNo: 'PRG-MRK', prefix: 'merkez' },
  { name: 'Doğu Kampüsü', programNo: 'PRG-DGU', prefix: 'dogu' },
  { name: 'Batı Kampüsü', programNo: 'PRG-BTI', prefix: 'bati' },
  { name: 'Tıp Fakültesi', programNo: 'PRG-TIP', prefix: 'tip' },
  { name: 'Teknokent', programNo: 'PRG-TKN', prefix: 'teknokent' },
];

const DEMO_UNITS = [
  { name: 'İnsan Kaynakları', suffix: 'ik' },
  { name: 'Bilgi İşlem', suffix: 'bilgiislem' },
  { name: 'Mali İşler', suffix: 'mali' },
  { name: 'Öğrenci İşleri', suffix: 'ogrenci' },
  { name: 'Kütüphane', suffix: 'kutuphane' },
  { name: 'Temizlik İşleri', suffix: 'temizlik' },
  { name: 'Güvenlik', suffix: 'guvenlik' },
  { name: 'Yemekhane', suffix: 'yemekhane' },
  { name: 'Teknik Servis', suffix: 'teknik' }
];

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

  console.log('🚀 Devasa demo verileri yükleniyor...');

  const seedPool = new Pool({ connectionString, max: 1 });
  const db = drizzle(seedPool);

  try {
    // ── 1. Mevcut demo verilerini temizle (FK sırasına göre) ─────────────────
    console.log('🗑️  Mevcut demo verileri temizleniyor...');

    await db.execute(sql`DELETE FROM app.employees;`);
    await db.execute(sql`DELETE FROM app.users WHERE role = 'RESPONSIBLE';`);
    await db.execute(sql`DELETE FROM app.units;`);
    await db.execute(sql`DELETE FROM app.locations;`);

    // ── 2. Yerleşkeleri ve Birimleri oluştur ─────────────────────────────────
    console.log(`🏗️  ${DEMO_LOCATIONS.length} Yerleşke, ${DEMO_LOCATIONS.length * DEMO_UNITS.length} Birim ve Sorumluları oluşturuluyor...`);

    const createdUnitIds: string[] = [];

    const { startDate, endDate } = calcProgramDates();
    const expiryDate = new Date(new Date(endDate).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const loc of DEMO_LOCATIONS) {
      const locResult = await db.execute(sql`
        INSERT INTO app.locations (name, program_no)
        VALUES (${loc.name}, ${loc.programNo})
        RETURNING id;
      `);
      const locId = locResult.rows[0]?.id as string;
      if (!locId) throw new Error(`${loc.name} oluşturulamadı (ID dönmedi)`);

      for (const unit of DEMO_UNITS) {
        const unitResult = await db.execute(sql`
          INSERT INTO app.units (location_id, name)
          VALUES (${locId}, ${unit.name})
          RETURNING id;
        `);
        const unitId = unitResult.rows[0]?.id as string;
        if (!unitId) throw new Error(`${unit.name} oluşturulamadı (ID dönmedi)`);
        createdUnitIds.push(unitId);

        // Kullanıcı adı: yerleşke_birim (örn: kuzey_ik)
        const username = `${loc.prefix}_${unit.suffix}`;
        // Şifre kullanıcı adıyla aynı olacak
        const passHash = await bcrypt.hash(username, 10);

        await db.execute(sql`
          INSERT INTO app.users (username, password_hash, role, status, location_id, unit_id, expiry_date)
          VALUES (${username}, ${passHash}, 'RESPONSIBLE', 'ACTIVE', ${locId}, ${unitId}, ${expiryDate});
        `);
      }
    }

    // ── 3. 1000 Gerçekçi Öğrenci/Çalışan Oluştur ─────────────────────────────
    console.log('👥  1000 Öğrenci (Çalışan) TC, IBAN ve rastgele isimlerle üretiliyor...');
    
    const todayStr = new Date().toISOString().split('T')[0];
    const employees = [];

    for (let i = 0; i < 1000; i++) {
      const unitId = faker.helpers.arrayElement(createdUnitIds);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      // TC No: 11 haneli, ilk hanesi sıfır olmayan sayı
      const firstDigit = faker.number.int({ min: 1, max: 9 }).toString();
      const tcNo = firstDigit + faker.string.numeric(10);
      
      // IBAN: TR + 24 rakam
      const ibanNo = 'TR' + faker.string.numeric(24);

      employees.push({
        unitId,
        tcNo,
        ibanNo,
        firstName,
        lastName,
        startDate: todayStr
      });
    }

    // Insertleri 100'erli gruplar halinde veritabanına basıyoruz (Max parametre sınırına takılmamak için)
    const CHUNK_SIZE = 100;
    for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
      const chunk = employees.slice(i, i + CHUNK_SIZE);
      const valuesSql = chunk.map(e => `('${e.unitId}', '${e.tcNo}', '${e.ibanNo}', '${e.firstName.replace(/'/g, "''")}', '${e.lastName.replace(/'/g, "''")}', '${e.startDate}')`).join(', ');
      
      await db.execute(sql.raw(`
        INSERT INTO app.employees (unit_id, tc_no, iban_no, first_name, last_name, start_date)
        VALUES ${valuesSql};
      `));
    }

    // ── 4. Sistem ayarlarında program tarihlerini güncelle ───────────────────
    console.log('⚙️  Program tarihleri güncelleniyor...');

    await db.execute(sql`
      INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
      VALUES (1, 1080.50, 3, ${startDate}, ${endDate})
      ON CONFLICT (id) DO UPDATE
      SET program_start_date = ${startDate}, program_end_date = ${endDate};
    `);

    console.log(`✅ Demo seed harika bir şekilde tamamlandı!`);
    console.log(`   - 7 Yerleşke`);
    console.log(`   - 63 Birim`);
    console.log(`   - 63 Birim Sorumlusu (Şifreler kullanıcı adlarıyla BİREBİR AYNI)`);
    console.log(`   - 1000 Gerçekçi Öğrenci (İşe Giriş: ${todayStr}, Çıkış: null, Tamamı Aktif)`);
    console.log(`   - Program: ${startDate} → ${endDate}`);
  } catch (error: unknown) {
    console.error('❌ Demo seed hatası:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await seedPool.end();
  }
};

runDemoSeed();
