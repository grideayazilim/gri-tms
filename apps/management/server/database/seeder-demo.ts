/* ========================================================================
   DEMO SEEDER (SUNUM VE TEST VERİLERİ YÜKLEYİCİ)
   Gerçekçi demo verisi üretir. Faker ile 1000 öğrenci, 7 yerleşke,
   63 birim ve her birime özel sorumlu (şifreleri kullanıcı adı ile aynı) oluşturur.
   Tüm isimler büyük harflidir (resmi belge gereği).
   Her periyod için gerçekçi puantaj günleri oluşturulur (%70 X/X/X, %20 X/X/İ, %10 X/R/R).
   ======================================================================== */
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { sql } from 'drizzle-orm';
import { fakerTR as faker } from '@faker-js/faker';
import { randomUUID } from 'crypto';

dotenv.config();
const { Pool } = pg;

// ─── Demo veri tanımları (büyük harfli) ──────────────────────────────────────

const DEMO_LOCATIONS = [
  { name: 'KUZEY KAMPÜSÜ', programNo: 'PRG-KZY', prefix: 'kuzey' },
  { name: 'GÜNEY KAMPÜSÜ', programNo: 'PRG-GNY', prefix: 'guney' },
  { name: 'MERKEZ KAMPÜSÜ', programNo: 'PRG-MRK', prefix: 'merkez' },
  { name: 'DOĞU KAMPÜSÜ', programNo: 'PRG-DGU', prefix: 'dogu' },
  { name: 'BATI KAMPÜSÜ', programNo: 'PRG-BTI', prefix: 'bati' },
  { name: 'TIP FAKÜLTESİ', programNo: 'PRG-TIP', prefix: 'tip' },
  { name: 'TEKNOKENT', programNo: 'PRG-TKN', prefix: 'teknokent' },
];

const DEMO_UNITS = [
  { name: 'İNSAN KAYNAKLARI', suffix: 'ik' },
  { name: 'BİLGİ İŞLEM', suffix: 'bilgiislem' },
  { name: 'MALİ İŞLER', suffix: 'mali' },
  { name: 'ÖĞRENCİ İŞLERİ', suffix: 'ogrenci' },
  { name: 'KÜTÜPHANE', suffix: 'kutuphane' },
  { name: 'TEMİZLİK İŞLERİ', suffix: 'temizlik' },
  { name: 'GÜVENLİK', suffix: 'guvenlik' },
  { name: 'YEMEKHANE', suffix: 'yemekhane' },
  { name: 'TEKNİK SERVİS', suffix: 'teknik' },
];

// ─── Türkiye Resmi Tatiller (2025–2026) ──────────────────────────────────────

const TURKISH_HOLIDAYS = new Set<string>([
  // 2025
  '2025-01-01', // Yılbaşı
  '2025-03-30', '2025-03-31', '2025-04-01', // Ramazan Bayramı
  '2025-04-23', // Ulusal Egemenlik ve Çocuk Bayramı
  '2025-05-01', // Emek ve Dayanışma Günü
  '2025-05-19', // Atatürk'ü Anma, Gençlik ve Spor Bayramı
  '2025-06-05', '2025-06-06', '2025-06-07', '2025-06-08', // Kurban Bayramı
  '2025-07-15', // Demokrasi ve Millî Birlik Günü
  '2025-08-30', // Zafer Bayramı
  '2025-10-29', // Cumhuriyet Bayramı
  // 2026
  '2026-01-01', // Yılbaşı
  '2026-03-19', '2026-03-20', '2026-03-21', // Ramazan Bayramı
  '2026-04-23', // Ulusal Egemenlik ve Çocuk Bayramı
  '2026-05-01', // Emek ve Dayanışma Günü
  '2026-05-19', // Atatürk'ü Anma, Gençlik ve Spor Bayramı
  '2026-05-26', '2026-05-27', '2026-05-28', '2026-05-29', // Kurban Bayramı
  '2026-07-15', // Demokrasi ve Millî Birlik Günü
  '2026-08-30', // Zafer Bayramı
  '2026-10-29', // Cumhuriyet Bayramı
]);

// ─── Puantaj Pattern Tipleri ─────────────────────────────────────────────────
// Her çalışana sabit bir haftalık pattern atanır:
//   Tip 0 → %70: Her hafta X, X, X  (hep geldi)
//   Tip 1 → %20: Her hafta X, X, İ  (2 geldi 1 izinli)
//   Tip 2 → %10: Her hafta X, R, R  (1 geldi 2 raporlu)

type PatternType = 0 | 1 | 2;

const PATTERN_MARKERS: Record<PatternType, string[]> = {
  0: ['X', 'X', 'X'],
  1: ['X', 'X', 'İ'],
  2: ['X', 'R', 'R'],
};

function assignPattern(rand: number): PatternType {
  if (rand < 0.70) return 0;
  if (rand < 0.90) return 1;
  return 2;
}

// ─── Yardımcı: tarih string'i ─────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// ─── Puantaj Günü Üretici ─────────────────────────────────────────────────────
// Verilen periyod için her haftadan rastgele 3 iş günü (Pzt-Cum, tatil hariç) seçer
// ve çalışanın pattern'ine göre marker atar.

interface TimesheetDayRecord {
  id: string;
  timesheetId: string;
  day: string;
  markerCode: string;
}

function generateTimesheetDays(
  timesheetId: string,
  periodStart: string,
  periodEnd: string,
  pattern: PatternType,
): TimesheetDayRecord[] {
  const result: TimesheetDayRecord[] = [];
  const markers = PATTERN_MARKERS[pattern];

  const start = new Date(periodStart + 'T00:00:00');
  const end = new Date(periodEnd + 'T00:00:00');

  // Periyodun başladığı haftanın Pazartesi'sine git
  const cur = new Date(start);
  const dow = cur.getDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
  cur.setDate(cur.getDate() - daysBack);

  while (cur <= end) {
    // Bu haftanın periyod içindeki iş günlerini topla (Pzt-Cum, tatil hariç)
    const weekWorkDays: string[] = [];
    for (let offset = 0; offset < 5; offset++) {
      const day = new Date(cur);
      day.setDate(cur.getDate() + offset);
      if (day >= start && day <= end) {
        const ds = toDateStr(day);
        if (!TURKISH_HOLIDAYS.has(ds)) {
          weekWorkDays.push(ds);
        }
      }
    }

    if (weekWorkDays.length > 0) {
      // Partial Fisher-Yates: min(3, available) gün seç
      const count = Math.min(3, weekWorkDays.length);
      const arr = [...weekWorkDays];
      for (let i = 0; i < count; i++) {
        const j = i + Math.floor(Math.random() * (arr.length - i));
        const tmp = arr[i] as string; arr[i] = arr[j] as string; arr[j] = tmp;
      }
      const chosen = arr.slice(0, count).sort(); // kronolojik sıra

      for (let i = 0; i < chosen.length; i++) {
        result.push({
          id: randomUUID(),
          timesheetId,
          day: chosen[i]!,
          markerCode: markers[i] ?? 'X',
        });
      }
    }

    cur.setDate(cur.getDate() + 7);
  }

  return result;
}

// ─── Yardımcı: Periyod oluşturma ─────────────────────────────────────────────

async function generatePeriods(db: ReturnType<typeof drizzle>, startDate: string, endDate: string) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  await db.execute(sql`
    UPDATE app.periods
    SET is_deleted = true
    WHERE start_date < ${startDate}::date OR end_date > ${endDate}::date;
  `);

  let current = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonthStart = new Date(end.getFullYear(), end.getMonth(), 1);

  while (current <= endMonthStart) {
    const y = current.getFullYear();
    const m = current.getMonth() + 1;
    const mm = String(m).padStart(2, '0');

    const isFirstMonth = y === start.getFullYear() && m === start.getMonth() + 1;
    const periodStart = isFirstMonth ? startDate : `${y}-${mm}-01`;

    const isLastMonth = y === end.getFullYear() && m === end.getMonth() + 1;
    const lastDay = String(new Date(y, m, 0).getDate()).padStart(2, '0');
    const periodEnd = isLastMonth ? endDate : `${y}-${mm}-${lastDay}`;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const graceDate = new Date(new Date(periodEnd + 'T00:00:00').getTime() + 5 * 24 * 60 * 60 * 1000);
    const graceDateStr = `${graceDate.getFullYear()}-${String(graceDate.getMonth() + 1).padStart(2, '0')}-${String(graceDate.getDate()).padStart(2, '0')}`;

    const isLocked = !(todayStr >= periodStart && todayStr <= graceDateStr);

    await db.execute(sql`
      INSERT INTO app.periods (id, year, month, start_date, end_date, is_locked, is_deleted)
      VALUES (gen_random_uuid(), ${y}, ${m}, ${periodStart}, ${periodEnd}, ${isLocked}, false)
      ON CONFLICT (year, month) DO UPDATE
      SET start_date = ${periodStart}, end_date = ${periodEnd}, is_deleted = false;
    `);

    current = new Date(y, m, 1);
  }
}

// ─── Yardımcı: Dinamik tarih hesaplama ───────────────────────────────────────

function calcProgramDates(): { startDate: string; endDate: string } {
  const now = new Date();

  const startMonth = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const startDate = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}-01`;

  const endMonthDate = new Date(now.getFullYear(), now.getMonth() + 4, 0);
  const endDate = `${endMonthDate.getFullYear()}-${String(endMonthDate.getMonth() + 1).padStart(2, '0')}-${String(endMonthDate.getDate()).padStart(2, '0')}`;

  return { startDate, endDate };
}

// ─── Yardımcı: Toplu batch insert ────────────────────────────────────────────

async function batchRawInsert(db: ReturnType<typeof drizzle>, insertSql: string, chunkSize = 2000) {
  await db.execute(sql.raw(insertSql));
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

    const createdUnits: Array<{ id: string; unitId: string }> = [];

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
        createdUnits.push({ id: unitId, unitId });

        const username = `${loc.prefix}_${unit.suffix}`;
        const passHash = await bcrypt.hash(username, 10);

        await db.execute(sql`
          INSERT INTO app.users (username, password_hash, role, status, location_id, unit_id, expiry_date)
          VALUES (${username}, ${passHash}, 'RESPONSIBLE', 'ACTIVE', ${locId}, ${unitId}, ${expiryDate});
        `);
      }
    }

    const createdUnitIds = createdUnits.map(u => u.id);

    // ── 3. 1000 Gerçekçi Öğrenci/Çalışan Oluştur ─────────────────────────────
    console.log('👥  1000 Öğrenci (Çalışan) üretiliyor (büyük harfli isimler, puantaj pattern\'leri atanıyor)...');

    interface EmployeeSeed {
      id: string;
      unitId: string;
      tcNo: string;
      ibanNo: string;
      firstName: string;
      lastName: string;
      startDate: string;
      patternType: PatternType;
    }

    const employees: EmployeeSeed[] = [];

    for (let i = 0; i < 1000; i++) {
      const unitId = faker.helpers.arrayElement(createdUnitIds);
      // İsimler büyük harfli (resmi belge gereği) — Türkçe karakter dönüşümü ile
      const firstName = faker.person.firstName().toLocaleUpperCase('tr-TR');
      const lastName = faker.person.lastName().toLocaleUpperCase('tr-TR');

      const firstDigit = faker.number.int({ min: 1, max: 9 }).toString();
      const tcNo = firstDigit + faker.string.numeric(10);
      const ibanNo = 'TR' + faker.string.numeric(24);

      employees.push({
        id: randomUUID(),
        unitId,
        tcNo,
        ibanNo,
        firstName,
        lastName,
        startDate, // Program başlangıcından itibaren aktif
        patternType: assignPattern(Math.random()),
      });
    }

    // Insertleri 100'erli gruplar halinde veritabanına basıyoruz
    const EMP_CHUNK_SIZE = 100;
    for (let i = 0; i < employees.length; i += EMP_CHUNK_SIZE) {
      const chunk = employees.slice(i, i + EMP_CHUNK_SIZE);
      const valuesSql = chunk
        .map(e =>
          `('${e.id}', '${e.unitId}', '${e.tcNo}', '${e.ibanNo}', '${e.firstName.replace(/'/g, "''")}', '${e.lastName.replace(/'/g, "''")}', '${e.startDate}')`,
        )
        .join(', ');

      await db.execute(sql.raw(`
        INSERT INTO app.employees (id, unit_id, tc_no, iban_no, first_name, last_name, start_date)
        VALUES ${valuesSql};
      `));
    }

    // ── 4. Sistem ayarlarında program tarihlerini güncelle ───────────────────
    console.log('⚙️  Program tarihleri güncelleniyor...');

    await db.execute(sql`
      INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
      VALUES (1, 1080.50, 3, ${startDate}, ${endDate})
      ON CONFLICT (id) DO UPDATE
      SET program_start_date = ${startDate}, program_end_date = ${endDate}, max_weekly_days = 3;
    `);

    // ── 5. Program tarihlerine göre periyodları oluştur ──────────────────────
    console.log('📅  Program periyodları oluşturuluyor...');
    await generatePeriods(db, startDate, endDate);

    // ── 6. Tüm periyodları oku ───────────────────────────────────────────────
    const periodsResult = await db.execute(sql`
      SELECT id, year, month, start_date, end_date
      FROM app.periods
      WHERE is_deleted = false
      ORDER BY year, month;
    `);

    interface PeriodRow {
      id: string;
      year: number;
      month: number;
      start_date: string;
      end_date: string;
    }

    const periods = periodsResult.rows as unknown as PeriodRow[];
    console.log(`📊  ${periods.length} periyod bulundu. Her periyod için ${employees.length} çalışanın puantajı doldurulacak...`);

    // ── 7. Her periyod için puantaj ve günler oluştur ────────────────────────
    let totalTimesheets = 0;
    let totalDays = 0;

    for (const period of periods) {
      const monthLabel = `${period.year}/${String(period.month).padStart(2, '0')}`;
      process.stdout.write(`   📋 ${monthLabel} işleniyor... `);

      // Timesheet kayıtlarını üret
      interface TimesheetSeed {
        id: string;
        employeeId: string;
        periodId: string;
        unitId: string;
        patternType: PatternType;
      }

      const timesheets: TimesheetSeed[] = employees.map(emp => ({
        id: randomUUID(),
        employeeId: emp.id,
        periodId: period.id,
        unitId: emp.unitId,
        patternType: emp.patternType,
      }));

      // Timesheets batch insert (500'erli)
      const TS_CHUNK = 500;
      for (let i = 0; i < timesheets.length; i += TS_CHUNK) {
        const chunk = timesheets.slice(i, i + TS_CHUNK);
        const valuesSql = chunk
          .map(t => `('${t.id}', '${t.employeeId}', '${t.periodId}', '${t.unitId}')`)
          .join(', ');
        await batchRawInsert(db, `
          INSERT INTO app.timesheets (id, employee_id, period_id, unit_id)
          VALUES ${valuesSql}
          ON CONFLICT (employee_id, period_id) DO NOTHING;
        `);
      }

      totalTimesheets += timesheets.length;

      // Timesheet günlerini üret
      const allDays: TimesheetDayRecord[] = [];
      for (const ts of timesheets) {
        const days = generateTimesheetDays(ts.id, period.start_date, period.end_date, ts.patternType);
        for (const d of days) allDays.push(d);
      }

      // Timesheet days batch insert (2000'erli)
      const TD_CHUNK = 2000;
      for (let i = 0; i < allDays.length; i += TD_CHUNK) {
        const chunk = allDays.slice(i, i + TD_CHUNK);
        const valuesSql = chunk
          .map(d => `('${d.id}', '${d.timesheetId}', '${d.day}', '${d.markerCode}')`)
          .join(', ');
        await batchRawInsert(db, `
          INSERT INTO app.timesheet_days (id, timesheet_id, day, marker_code)
          VALUES ${valuesSql}
          ON CONFLICT (timesheet_id, day) DO NOTHING;
        `);
      }

      totalDays += allDays.length;
      console.log(`${allDays.length} gün eklendi ✓`);
    }

    // ── Özet ─────────────────────────────────────────────────────────────────

    console.log('');
    console.log('✅ Demo seed harika bir şekilde tamamlandı!');
    console.log(`   📍 ${DEMO_LOCATIONS.length} Yerleşke (büyük harfli)`);
    console.log(`   🏢 ${DEMO_LOCATIONS.length * DEMO_UNITS.length} Birim (büyük harfli)`);
    console.log(`   👤 ${DEMO_LOCATIONS.length * DEMO_UNITS.length} Birim Sorumlusu (şifreler kullanıcı adlarıyla birebir aynı)`);
    console.log(`   👥 ${employees.length} Öğrenci (büyük harfli isimler, işe giriş: ${startDate})`);
    console.log(`   📅 ${periods.length} Periyod (${startDate} → ${endDate})`);
    console.log(`   📊 ${totalTimesheets} Puantaj kaydı`);
    console.log(`   📆 ${totalDays} Puantaj günü (~%70 X/X/X, ~%20 X/X/İ, ~%10 X/R/R)`);
    console.log(`   ⚙️  Program: ${startDate} → ${endDate}`);
  } catch (error: unknown) {
    console.error('❌ Demo seed hatası:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await seedPool.end();
  }
};

runDemoSeed();
