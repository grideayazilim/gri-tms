/* ========================================================================
   RESET CONTROLLER (SİSTEM SIFIRLAMA KONTROLCÜSÜ)
   Sistemi yeni bir programa/döneme geçiş için temizler ve yeniden yapılandırır.
   Yedek BU UÇTAN ALINMAZ — ayrı ve salt-okunur `GET /settings/backup` uçtan
   alınır; gerekçesi o ucun başlığında.
   ======================================================================== */
import type { Request, Response } from 'express';
import JSZip from 'jszip';
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_ROLE } from '@timesheet/shared';
import type { SystemResetType } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { badRequest } from '../utils/AppError.js';
import { generateTimesheetExcel } from '../utils/excelHandler.js';
import { fetchExportData } from './exportController.js';
import { regeneratePeriodsForRange } from '../utils/periodGenerator.js';
import { settingsRepo } from '../repositories/settingsRepo.js';
import { importRepo } from '../repositories/importRepo.js';
import logger from '../utils/logger.js';
import {
  employees,
  periods,
  users,
  units,
  locations,
} from '../../database/schema.js';
import { ne, sql } from 'drizzle-orm';
import { TURKISH_MONTHS_UPPER as TURKISH_MONTHS } from '@timesheet/shared';

/* ========================================================================
   POST /settings/reset
   ======================================================================== */

/* TRUNCATE listesi tek bir yerde tutulur. `CASCADE`, listede YAZILMAYAN
   ama listedekilere yabancı anahtarla bağlı bir tabloyu da sessizce siler;
   bugün böyle bir tablo yok, ama ileride eklenirse kimse fark etmez. Bu sabit
   sayesinde bir test listeyi şemayla karşılaştırıp o durumu yakalayabilir. */
export const RESET_TRUNCATE_TABLES = [
  'timesheet_days',
  'timesheets',
  'announcement_reads',
  'announcements',
  'audit_logs',
  'employees',
  'periods',
] as const;

export const systemReset = asyncHandler(async (req: Request, res: Response) => {
  const { backup, deleteLocationsAndUnits, newSettings } = req.body as SystemResetType;
  const username = req.user?.username ?? 'unknown';

  /* Bu uç yedek üretmez. Yedeği silme isteğinin içinde üretmek, dakikalarca
     süren tek bir istek demekti: istemci ya da nginx timeout'a düştüğünde
     bağlantı kopuyor, kullanıcı hata görüyor ama sunucudaki silme yine
     tamamlanıyordu — yedeksiz veri kaybı. Bayrak açık gelirse çağıranı doğru
     akışa yönlendiriyoruz, sessizce yok saymıyoruz. */
  if (backup) {
    throw badRequest(
      'Yedek bu uçtan alınmaz. Önce GET /api/settings/backup ile yedeği indirin, '
      + 'ardından sıfırlamayı backup: false ile çağırın.',
    );
  }

  logger.warn(`Sistem sıfırlama işlemi başlatıldı. Başlatan: ${username}, Yerleşke/Birim silme: ${deleteLocationsAndUnits ? 'Evet' : 'Hayır'}`);

  /* Sonuç kalıcı bir modalda gösteriliyor; kullanıcı neyin silindiğini
     görebilmeli. Sayılar zaten audit log için hesaplanıyor, yanıta da taşınır. */
  const deleted = { employees: 0, users: 0, periods: 0 };

  // ── Silme + Yeni ayarlar (transaction içinde) ─────────────────────────────
  await withDrizzleTransaction(async (tx) => {
    /* Havuzdaki genel `statement_timeout` 30 saniye; bu işlem 260 binden fazla
       satır sildiği için o sınırı aşabilir ve transaction 57014 ile rollback
       olur. SET LOCAL yalnızca bu transaction için geçerlidir. */
    await tx.execute(sql`SET LOCAL statement_timeout = 0`);
    await tx.execute(sql`SET LOCAL idle_in_transaction_session_timeout = 0`);

    // Silmeden önce sayıları kaydet (audit log için)
    const [empCount] = await tx.select({ count: sql<number>`count(*)::int` }).from(employees);
    const [userCount] = await tx.select({ count: sql<number>`count(*)::int` })
      .from(users).where(ne(users.role, USER_ROLE.ADMIN));
    const [periodCount] = await tx.select({ count: sql<number>`count(*)::int` }).from(periods);

    deleted.employees = empCount?.count ?? 0;
    deleted.users = userCount?.count ?? 0;
    deleted.periods = periodCount?.count ?? 0;

    /* DELETE yerine TRUNCATE: 260 bin satırda çok daha hızlıdır ve WAL üretmez.
       app_user'ın TRUNCATE yetkisi 01-init.sh ve docker-setup.ts'te veriliyor.
       users TRUNCATE edilmez çünkü adminler korunacak. Tablo adları
       RESET_TRUNCATE_TABLES sabitinden gelir, kullanıcı girdisi değildir. */
    const truncateList = RESET_TRUNCATE_TABLES.map((t) => `app.${t}`).join(', ');
    await tx.execute(sql.raw(`TRUNCATE TABLE ${truncateList} RESTART IDENTITY CASCADE`));

    // Admin olmayan kullanıcıları sil (adminler korunur → TRUNCATE kullanılamaz)
    await tx.delete(users).where(ne(users.role, USER_ROLE.ADMIN));

    if (deleteLocationsAndUnits) {
      await tx.delete(units);
      await tx.delete(locations);
    }

    // ── Adım 3: Yeni ayarları uygula ────────────────────────────────────────
    const { dailyWage, maxWeeklyDays, programStartDate, programEndDate } = newSettings;

    await settingsRepo.upsertSettings(tx, {
      dailyWage: String(dailyWage),
      maxWeeklyDays,
      programStartDate,
      programEndDate,
    });

    // Yeni tarih aralığına göre dönemleri oluştur
    await regeneratePeriodsForRange(tx, programStartDate, programEndDate);

    /* Audit kaydı silmelerden sonra yazılır; önce yazılsaydı aynı transaction
       içindeki audit_logs temizliğiyle birlikte silinirdi. */
    await createAuditLog(tx, {
      action: AUDIT_ACTION.SYSTEM_RESET,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.SETTINGS,
      entityId: null,
      summary: `Sistem sıfırlandı. Silinen: ${empCount?.count ?? 0} çalışan, `
        + `${userCount?.count ?? 0} kullanıcı, ${periodCount?.count ?? 0} dönem. `
        + `Yerleşke/Birim silme: ${deleteLocationsAndUnits ? 'Evet' : 'Hayır'}.`,
      metadata: {
        deleteLocationsAndUnits,
        deletedEmployeeCount: empCount?.count ?? 0,
        deletedUserCount: userCount?.count ?? 0,
        deletedPeriodCount: periodCount?.count ?? 0,
        initiatedBy: req.user!.username,
      },
    });
  });

  logger.info(`Sistem sıfırlama işlemi başarıyla tamamlandı. Başlatan: ${username}`);

  res.json({ success: true, message: 'Sistem başarıyla sıfırlandı.', data: { deleted } });
});

/* ========================================================================
   GET /settings/backup

   Yedek üretimi yerleşke × dönem sayısına bağlı olarak dakikalar sürebilir
   (70-84 workbook). Bu yüzden sıfırlamadan ayrı, salt-okunur bir uçtur: admin
   önce yedeği indirir, sonra sıfırlamayı çalıştırır. Tek uzun istekte
   birleştirilseydi timeout'ta kopan bağlantı silmeyi durdurmazdı.
   ======================================================================== */

export const downloadBackup = asyncHandler(async (req: Request, res: Response) => {
  logger.info(`Yedek ZIP talebi. İsteyen: ${req.user?.username ?? 'unknown'}`);

  const zipBuffer = await buildBackupZip();

  if (zipBuffer.length === 0) {
    throw badRequest('Yedeklenecek aktif dönem veya yerleşke bulunamadı.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `sistem-yedegi-${timestamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(zipBuffer);
});

// ─── Yedek ZIP oluştur ────────────────────────────────────────────────────────

async function buildBackupZip(): Promise<Buffer> {
  // Aktif dönemleri ve tüm yerleşkeleri çek
  const activePeriods = await db.execute<{ id: string; year: number; month: number }>(
    sql`SELECT id, year, month FROM app.periods WHERE is_deleted = false ORDER BY year, month`
  );
  const activeLocations = await importRepo.getAllLocations(db);

  if (activePeriods.rows.length === 0 || activeLocations.length === 0) {
    return Buffer.alloc(0);
  }

  const zip = new JSZip();

  /* Workbook'lar sırayla üretilir. 96 dönem × yerleşke kombinasyonunu Promise.all
     ile aynı anda üretmek 512 MB'lık container limitinde OOM riski ve havuz
     baskısı yaratır; sıralı üretim yavaş ama güvenlidir. */
  for (const period of activePeriods.rows) {
    for (const location of activeLocations) {
      {
        const data = await fetchExportData(db, location.id, period.year, period.month);
        if (!data) continue;

        const buffer = await generateTimesheetExcel({
          employees: data.employees.map((e) => ({
            id: e.id,
            tcNo: e.tcNo,
            firstName: e.firstName,
            lastName: e.lastName,
            ibanNo: e.ibanNo,
            unitId: e.unitId,
            unitName: e.unitName,
            startDate: e.startDate,
            endDate: e.endDate,
          })),
          daysMap: Object.fromEntries(data.daysMap.entries()),
          dailyWage: data.dailyWage,
          year: period.year,
          month: period.month,
          locationName: data.location.name,
          programNo: data.location.programNo,
          periodStartDate: data.programStartDate,
          periodEndDate: data.programEndDate,
        });

        const monthName = TURKISH_MONTHS[period.month - 1] ?? String(period.month);
        const filename = `${data.location.name} - ${period.year} ${monthName} MAAŞLAR.xlsm`;
        zip.file(filename, buffer);
      }
    }
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
