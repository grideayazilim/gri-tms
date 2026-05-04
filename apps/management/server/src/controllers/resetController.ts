/* ========================================================================
   RESET CONTROLLER (SİSTEM SIFIRLAMA KONTROLCÜSÜ)
   Sistemi yeni bir programa/döneme geçiş için temizler ve yeniden yapılandırır.
   İsteğe bağlı olarak silmeden önce tüm aktif dönemlerin yedeğini alır.
   ======================================================================== */
import type { Request, Response } from 'express';
import JSZip from 'jszip';
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_ROLE } from '@timesheet/shared';
import type { SystemResetType } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { generateTimesheetExcel } from '../utils/excelHandler.js';
import { fetchExportData } from './exportController.js';
import { regeneratePeriodsForRange } from '../utils/periodGenerator.js';
import { toISODateString } from '../utils/dateUtils.js';
import { settingsRepo } from '../repositories/settingsRepo.js';
import { importRepo } from '../repositories/importRepo.js';
import {
  timesheetDays,
  timesheets,
  announcementReads,
  announcements,
  auditLogs,
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

export const systemReset = asyncHandler(async (req: Request, res: Response) => {
  const { backup, deleteLocationsAndUnits, newSettings } = req.body as SystemResetType;

  let zipBuffer: Buffer | null = null;

  // ── Adım 1: Yedekleme ─────────────────────────────────────────────────────
  if (backup) {
    zipBuffer = await buildBackupZip();
  }

  // ── Adım 2 & 3: Silme + Yeni ayarlar (transaction içinde) ─────────────────
  await withDrizzleTransaction(async (tx) => {

    // Silmeden önce sayıları kaydet (audit log için)
    const [empCount] = await tx.select({ count: sql<number>`count(*)::int` }).from(employees);
    const [userCount] = await tx.select({ count: sql<number>`count(*)::int` })
      .from(users).where(ne(users.role, USER_ROLE.ADMIN));
    const [periodCount] = await tx.select({ count: sql<number>`count(*)::int` }).from(periods);

    // Silmeden ÖNCE audit logu yaz (tablolar temizlenince log da silinecek)
    await createAuditLog(tx, {
      action: AUDIT_ACTION.SYSTEM_RESET,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.SETTINGS,
      entityId: null,
      summary: `Sistem sıfırlama işlemi başlatıldı. Yedek: ${backup ? 'Evet' : 'Hayır'}, Yerleşke/Birim silme: ${deleteLocationsAndUnits ? 'Evet' : 'Hayır'}.`,
      metadata: {
        backup,
        deleteLocationsAndUnits,
        deletedEmployeeCount: empCount?.count ?? 0,
        deletedUserCount: userCount?.count ?? 0,
        deletedPeriodCount: periodCount?.count ?? 0,
        initiatedBy: req.user!.username,
      },
    });

    // FK sırasına göre sil
    await tx.delete(timesheetDays);
    await tx.delete(timesheets);
    await tx.delete(announcementReads);
    await tx.delete(announcements);
    await tx.delete(auditLogs);
    await tx.delete(employees);
    await tx.delete(periods);
    // Admin olmayan kullanıcıları sil
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
  });

  // ── Yanıt gönder ──────────────────────────────────────────────────────────
  if (backup && zipBuffer) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `sistem-yedegi-${timestamp}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(zipBuffer);
  } else {
    res.json({ success: true, message: 'Sistem başarıyla sıfırlandı.' });
  }
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

  for (const period of activePeriods.rows) {
    for (const location of activeLocations) {
      const data = await withDrizzleTransaction((tx) =>
        fetchExportData(tx, location.id, period.year, period.month)
      );
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

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
