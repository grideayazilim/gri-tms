/* ========================================================================
   EXPORT CONTROLLER (DIŞA AKTARIM KONTROLCÜSÜ)
   Puantaj verilerini farklı formatlarda (Maaş, Liste, Bot) Excel'e aktarır.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import {
  generateTimesheetExcel,
  generateSimpleExcel,
  generateBotExcel,
} from '../utils/excelHandler.js';
import { createAuditLog, buildActor } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, TURKISH_MONTHS_UPPER as TURKISH_MONTHS } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { AppError, notFound } from '../utils/AppError.js';
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
  res.send(Buffer.from(buffer));
}

async function fireExportAuditLog(req: Request, params: { exportType: string; locationName: string; year: number; month: number; locationId: string }) {
  const { exportType, locationName, year, month, locationId } = params;
  const periodLabel = `${TURKISH_MONTHS[month - 1]} ${year}`;
  const typeLabels: Record<string, string> = {
    timesheet: 'Maaş Tablosu',
    simple: 'Liste',
    bot: 'Bot Girdisi',
  };
  const typeLabel = typeLabels[exportType] || 'Excel';

  try {
    // using db directly for fire & forget logging outside transaction if possible, or we could pass tx
    await createAuditLog(db, {
      action: AUDIT_ACTION.EXCEL_EXPORT,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.LOCATION,
      entityId: locationId || null,
      summary: `${locationName.toUpperCase()} yerleşkesi ${periodLabel} dönemi ${typeLabel} olarak dışa aktarıldı.`,
      metadata: {
        exportType,
        locationName,
        periodLabel,
        year,
        month,
      },
    });
  } catch (err) {
    console.error('[AUDIT] Export audit log kaydedilemedi:', err);
  }
}

export const exportTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.locationId as string;
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  const data = await withDrizzleTransaction((tx) => fetchExportData(tx, locationId, year, month));
  if (!data) throw notFound('Yerleşke bulunamadı');

  let buffer;
  try {
    buffer = await generateTimesheetExcel({
      employees: data.employees.map(e => ({
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
      year,
      month,
      locationName: data.location.name,
      programNo: data.location.programNo,
      periodStartDate: data.programStartDate,
      periodEndDate: data.programEndDate,
    });
  } catch (err: any) {
    if (err.message === 'EXCEL_NOT_IMPLEMENTED') {
      throw new AppError('Bu sistemin excel çıktı şablonu ve script\'i henüz yazılmadı.', 501);
    }
    throw err;
  }

  const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${TURKISH_MONTHS[month - 1]} ${year} MAAŞLAR.xlsm`;
  sendExcelResponse(res, buffer, filename);

  await fireExportAuditLog(req, {
    exportType: 'timesheet',
    locationName: data.location.name,
    year, month, locationId,
  });
});

export const exportSimple = asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.locationId as string;
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  const data = await withDrizzleTransaction((tx) => fetchExportData(tx, locationId, year, month));
  if (!data) throw notFound('Yerleşke bulunamadı');

  let buffer;
  try {
    buffer = await generateSimpleExcel({
      employees: data.employees.map(e => ({
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
      year,
      month,
      locationName: data.location.name,
    });
  } catch (err: any) {
    if (err.message === 'EXCEL_NOT_IMPLEMENTED') {
      throw new AppError('Bu sistemin excel çıktı şablonu ve script\'i henüz yazılmadı.', 501);
    }
    throw err;
  }

  const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${TURKISH_MONTHS[month - 1]} ${year} LİSTE.xlsm`;
  sendExcelResponse(res, buffer, filename);

  await fireExportAuditLog(req, {
    exportType: 'simple',
    locationName: data.location.name,
    year, month, locationId,
  });
});

export const exportBot = asyncHandler(async (req: Request, res: Response) => {
  const locationId = req.query.locationId as string;
  const year = parseInt(req.query.year as string, 10);
  const month = parseInt(req.query.month as string, 10);

  const data = await withDrizzleTransaction((tx) => fetchExportData(tx, locationId, year, month));
  if (!data) throw notFound('Yerleşke bulunamadı');

  let buffer;
  try {
    buffer = await generateBotExcel({
      employees: data.employees.map(e => ({
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
      year,
      month,
      locationName: data.location.name,
      programNo: data.location.programNo,
      periodStartDate: data.period?.startDate,
      periodEndDate: data.period?.endDate,
    });
  } catch (err: any) {
    if (err.message === 'EXCEL_NOT_IMPLEMENTED') {
      throw new AppError('Bu sistemin excel çıktı şablonu ve script\'i henüz yazılmadı.', 501);
    }
    throw err;
  }

  const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${TURKISH_MONTHS[month - 1]} ${year} BOT GİRDİSİ.xlsx`;
  sendExcelResponse(res, buffer, filename);

  await fireExportAuditLog(req, {
    exportType: 'bot',
    locationName: data.location.name,
    year, month, locationId,
  });
});
