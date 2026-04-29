/* ========================================================================
   EXPORT CONTROLLER (DIŞA AKTARIM KONTROLCÜSÜ)
   Puantaj verilerini Maaş veya Bot formatında Excel olarak aktarır.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import {
  generateTimesheetExcel,
  generateBotExcel,
} from '../utils/excelHandler.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, TURKISH_MONTHS_UPPER as TURKISH_MONTHS } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound } from '../utils/AppError.js';
import { importRepo } from '../repositories/importRepo.js';
import type { DbExecutor } from '../types/db.js';

async function fetchExportData(tx: DbExecutor, locationId: string, year: number, month: number) {
  const location = await importRepo.getLocation(tx, locationId);
  if (!location) return null;

  const period = await importRepo.findPeriod(tx, year, month);
  const employees = await importRepo.getEmployeesByLocation(tx, locationId);

  const daysMap = new Map<string, Record<string, string>>();

  if (period && employees.length > 0) {
    const empIds = employees.map((e) => e.id);
    const tsDays = await importRepo.getTimesheetDaysForEmployees(tx, period.id, empIds);

    for (const row of tsDays) {
      if (!daysMap.has(row.employeeId)) daysMap.set(row.employeeId, {});
      daysMap.get(row.employeeId)![row.day] = row.markerCode;
    }
  }

  const settings = await importRepo.getSettingsData(tx);

  return {
    location,
    employees,
    daysMap,
    dailyWage: parseFloat(settings?.dailyWage || '0'),
    period,
    programStartDate: settings?.programStartDate || null,
    programEndDate: settings?.programEndDate || null,
  };
}

function sendExcelResponse(res: Response, buffer: Buffer | ArrayBuffer, filename: string) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  const buf = buffer instanceof ArrayBuffer ? Buffer.from(new Uint8Array(buffer)) : buffer;
  res.send(buf);
}

function periodLabel(year: number, month: number): string {
  return `${TURKISH_MONTHS[month - 1]} ${year}`;
}

async function fireExportAuditLog(req: Request, params: { exportType: string; locationName: string; year: number; month: number; locationId: string }) {
  const { exportType, locationName, year, month, locationId } = params;
  const typeLabels: Record<string, string> = { timesheet: 'Maaş Tablosu', bot: 'Bot Girdisi' };

  try {
    await createAuditLog(db, {
      action: AUDIT_ACTION.EXCEL_EXPORT,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.LOCATION,
      entityId: locationId || null,
      summary: `${locationName.toUpperCase()} yerleşkesi ${periodLabel(year, month)} dönemi ${typeLabels[exportType] ?? 'Excel'} olarak dışa aktarıldı.`,
      metadata: { exportType, locationName, periodLabel: periodLabel(year, month), year, month },
    });
  } catch (err) {
    console.error('[AUDIT] Export audit log kaydedilemedi:', err);
  }
}

function mapEmployee(e: { id: string; tcNo: string | null; firstName: string; lastName: string; ibanNo: string | null; unitId: string; unitName: string; startDate: string; endDate: string | null }) {
  return {
    id: e.id,
    tcNo: e.tcNo,
    firstName: e.firstName,
    lastName: e.lastName,
    ibanNo: e.ibanNo,
    unitId: e.unitId,
    unitName: e.unitName,
    startDate: e.startDate,
    endDate: e.endDate,
  };
}

// ─── Maaş Tablosu ─────────────────────────────────────────────────────────────

export const exportTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.locationId as string;
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  const data = await withDrizzleTransaction((tx) => fetchExportData(tx, locationId, year, month));
  if (!data) throw notFound('Yerleşke bulunamadı');

  const buffer = await generateTimesheetExcel({
    employees: data.employees.map(mapEmployee),
    daysMap: Object.fromEntries(data.daysMap.entries()),
    dailyWage: data.dailyWage,
    year,
    month,
    locationName: data.location.name,
    programNo: data.location.programNo,
    periodStartDate: data.programStartDate,
    periodEndDate: data.programEndDate,
  });

  const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${periodLabel(year, month)} MAAŞLAR.xlsm`;
  sendExcelResponse(res, buffer, filename);

  await fireExportAuditLog(req, { exportType: 'timesheet', locationName: data.location.name, year, month, locationId });
});

// ─── Bot Girdisi ──────────────────────────────────────────────────────────────

export const exportBot = asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.locationId as string;
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  const data = await withDrizzleTransaction((tx) => fetchExportData(tx, locationId, year, month));
  if (!data) throw notFound('Yerleşke bulunamadı');

  const buffer = await generateBotExcel({
    employees: data.employees.map(mapEmployee),
    daysMap: Object.fromEntries(data.daysMap.entries()),
    year,
    month,
    locationName: data.location.name,
  });

  const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${periodLabel(year, month)} BOT GİRDİSİ.xlsx`;
  sendExcelResponse(res, buffer, filename);

  await fireExportAuditLog(req, { exportType: 'bot', locationName: data.location.name, year, month, locationId });
});
