/* ========================================================================
   TIMESHEET CONTROLLER (PUANTAJ YÖNETİMİ)
   Puantaj listeleme, toplu kaydetme, dönem kilitleme ve dönem yönetimi.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import { getISOWeekKey, parseLocalDate, formatPeriodLabel } from '../utils/dateUtils.js';
import { createAuditLog, buildActor, truncateChanges } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, PAID_CODES, USER_ROLE, MarkerCode, TimesheetSaveType } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { badRequest, forbidden, notFound, locked } from '../utils/AppError.js';
import { buildPagination } from '../utils/pagination.js';
import { periodRepo } from '../repositories/periodRepo.js';
import { timesheetRepo } from '../repositories/timesheetRepo.js';
import { settings } from '../../database/schema.js';
import type { TimesheetDayInsert } from '../../database/schema.js';

// ======================== GET /timesheets ========================

type TimesheetQueryParams = {
  month: string | undefined;
  year: string | undefined;
  status: string | undefined;
  search: string | undefined;
  unitId: string | undefined;
  locationId: string | undefined;
  pageNum: number;
  limitNum: number;
  offset: number;
};

function parseTimesheetQuery(query: Request['query']): TimesheetQueryParams {
  const str = (key: string) => (typeof query[key] === 'string' ? (query[key] as string) : undefined);
  const pageNum = Math.max(1, parseInt(str('page') ?? '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(str('limit') ?? '50', 10)));
  return {
    month: str('month'),
    year: str('year'),
    status: str('status'),
    search: str('search'),
    unitId: str('unitId'),
    locationId: str('locationId'),
    pageNum,
    limitNum,
    offset: (pageNum - 1) * limitNum,
  };
}

type TimesheetDayEntry = { id: string; day: string; markerCode: MarkerCode; note: string | null };
type PeriodSnapshot = { id: string; year: number; month: number; startDate: string; endDate: string; isLocked: boolean };

function buildDaysMap(daysResult: { timesheetId: string; id: string; day: string; markerCode: string; note: string | null }[]): Record<string, TimesheetDayEntry[]> {
  const map: Record<string, TimesheetDayEntry[]> = {};
  for (const d of daysResult) {
    if (!map[d.timesheetId]) map[d.timesheetId] = [];
    map[d.timesheetId]!.push({ id: d.id, day: d.day, markerCode: d.markerCode as MarkerCode, note: d.note });
  }
  return map;
}

function toTimesheetRow(
  row: { employeeId: string; firstName: string; lastName: string; tcNo: string | null; ibanNo: string | null; timesheetId: string | null; unitId: string | null; unitName: string | null; locationId: string | null; locationName: string | null },
  daysMap: Record<string, TimesheetDayEntry[]>,
  period: PeriodSnapshot,
  dailyWage: number,
) {
  const days = row.timesheetId ? (daysMap[row.timesheetId] ?? []) : [];
  const totalWorkDays = days.filter((d) => PAID_CODES.has(d.markerCode)).length;
  return {
    employee: { id: row.employeeId, firstName: row.firstName, lastName: row.lastName, tcNo: row.tcNo, ibanNo: row.ibanNo, isActive: true, startDate: null, endDate: null },
    unit: row.unitId ? { id: row.unitId, name: row.unitName } : null,
    location: row.locationId ? { id: row.locationId, name: row.locationName } : null,
    timesheet: { id: row.timesheetId, periodId: period.id, days },
    period,
    totalWorkDays,
    totalPaidAmount: totalWorkDays * dailyWage,
  };
}

export const getTimesheets = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user;
  if (!user) throw forbidden('Yetkisiz erişim');
  const scope = req.scope;

  const { month, year, status, search, unitId, locationId, pageNum, limitNum, offset } = parseTimesheetQuery(req.query);

  if (user.role === USER_ROLE.RESPONSIBLE) {
    if ((unitId && unitId !== user.unitId) || (locationId && locationId !== user.locationId)) {
      throw forbidden('Bu birim veya yerleşkeye erişim yetkiniz yok');
    }
  }

  const emptyPage = { success: true, data: { timesheets: [], pagination: buildPagination(pageNum, limitNum, 0) } };

  const period = await periodRepo.findActive(db, { ...(month ? { month } : {}), ...(year ? { year } : {}) });
  if (!period) { res.json(emptyPage); return; }
  if (status === 'locked' && !period.isLocked) { res.json(emptyPage); return; }
  if (status === 'unlocked' && period.isLocked) { res.json(emptyPage); return; }

  const { data: timesheetData, totalRecords } = await timesheetRepo.listWithEmployees(db, {
    periodId: period.id,
    search,
    unitId,
    locationId,
    scope,
    role: user.role,
    limit: limitNum,
    offset,
  });

  const timesheetIds = timesheetData.map((r) => r.timesheetId).filter((id): id is string => id != null);
  const daysMap = timesheetIds.length > 0
    ? buildDaysMap(await timesheetRepo.getTimesheetDays(db, timesheetIds))
    : {};

  const settingsResult = await db.select({ dailyWage: settings.dailyWage }).from(settings).limit(1);
  const dailyWage = Number(settingsResult[0]?.dailyWage ?? 0);

  const periodSnapshot: PeriodSnapshot = { id: period.id, year: period.year, month: period.month, startDate: period.startDate, endDate: period.endDate, isLocked: period.isLocked };
  const timesheets = timesheetData.map((row) => toTimesheetRow(row, daysMap, periodSnapshot, dailyWage));

  res.json({ success: true, data: { timesheets, pagination: buildPagination(pageNum, limitNum, totalRecords) } });
});

// ======================== POST /timesheets ========================
// Gelen request body'deki puantaj girişi tipi
interface TimesheetEntry {
  employeeId: string;
  days: { markerCode: MarkerCode; day: string; note?: string }[];
}

export const createOrUpdateTimesheets = asyncHandler<Record<string, string>, unknown, TimesheetSaveType>(async (req, res) => {
  const { periodId, timesheets } = req.body;
  const scope = req.scope;

  await withDrizzleTransaction(async (tx) => {
    const period = await periodRepo.findById(tx, periodId);
    if (!period || period.isDeleted) throw badRequest('Geçersiz dönem');
    if (period.isLocked) throw locked('Bu dönem kilitlenmiş. Puantaj girişi yapılamaz');

    // Çalışan Bilgilerini Çek
    const employeeIds = timesheets.map((t) => t.employeeId);
    const empInfoRows = await timesheetRepo.getEmployeeInfoForBulk(tx, employeeIds);

    const employeeMap = new Map(empInfoRows.map((row) => [row.id, row] as const));

    const missingIds = employeeIds.filter((id: string) => !employeeMap.has(id));
    if (missingIds.length > 0) {
      throw badRequest(`Geçersiz çalışan ID'leri: ${missingIds.join(', ')}`);
    }

    if (scope) {
      const unauthorizedEmps = empInfoRows.filter(
        (r) => r.unitId !== scope.unitId || (scope.locationId && r.locationId !== scope.locationId),
      );
      if (unauthorizedEmps.length > 0) throw forbidden('Bu çalışanlar üzerinde işlem yetkiniz yok');
    }

    const settingsResult = await tx.select({ maxWeeklyDays: settings.maxWeeklyDays }).from(settings).limit(1);
    const maxWeeklyDays = settingsResult[0]?.maxWeeklyDays ?? 6;

    // Haftalık Çalışma Sınırı Kontrolü
    const periodISOWeeks: string[] = [];
    const startDt = parseLocalDate(period.startDate);
    const endDt = parseLocalDate(period.endDate);

    if (startDt && endDt) {
      const curr = new Date(startDt);
      while (curr <= endDt) {
        const w = getISOWeekKey(curr);
        if (!periodISOWeeks.includes(w)) periodISOWeeks.push(w);
        curr.setDate(curr.getDate() + 1);
      }
    }
    periodISOWeeks.sort();

    for (const ts of timesheets) {
      const weekMap: Record<string, number> = {};
      for (const dayEntry of ts.days) {
        if (PAID_CODES.has(dayEntry.markerCode)) {
          const date = parseLocalDate(dayEntry.day);
          if (date) {
            const isoWeek = getISOWeekKey(date);
            weekMap[isoWeek] = (weekMap[isoWeek] ?? 0) + 1;
          }
        }
      }

      for (const [weekKey, count] of Object.entries(weekMap)) {
        if (count > maxWeeklyDays) {
          const emp = employeeMap.get(ts.employeeId);
          const empName = emp ? `${emp.firstName} ${emp.lastName}` : ts.employeeId;
          const idx = periodISOWeeks.indexOf(weekKey);
          const weekLabel = idx !== -1 ? `${idx + 1}. hafta` : weekKey.split('-W')[1] + '. hafta';
          throw badRequest(`${empName} için seçili dönemin ${weekLabel}sında ${count} ücretli gün girilmiş (maks: ${maxWeeklyDays})`);
        }
      }
    }

    const existingRows = await timesheetRepo.getExistingTimesheets(tx, employeeIds, periodId);
    const existingTimesheetMap = new Map<string, string>();
    for (const row of existingRows) {
      existingTimesheetMap.set(row.employeeId, row.id);
    }

    // Mevcut tüm puantaj günlerini önceden çek (diff hesabı için)
    const existingTimesheetIds = [...existingTimesheetMap.values()];
    const existingDaysRows = existingTimesheetIds.length > 0
      ? await timesheetRepo.getTimesheetDays(tx, existingTimesheetIds)
      : [];

    // timesheetId -> Set<"day|markerCode"> şeklinde mevcut gün imzalarını tut
    const existingDaySignatures = new Map<string, Set<string>>();
    for (const d of existingDaysRows) {
      if (!existingDaySignatures.has(d.timesheetId)) {
        existingDaySignatures.set(d.timesheetId, new Set());
      }
      existingDaySignatures.get(d.timesheetId)!.add(`${d.day}|${d.markerCode}`);
    }

    let totalDaysChanged = 0;
    const affectedEmployees: { name: string; daysCount: number }[] = [];
    const allTimesheetIds: string[] = [];
    const allDayRows: TimesheetDayInsert[] = [];

    for (const ts of timesheets) {
      const emp = employeeMap.get(ts.employeeId);
      // missingIds kontrolü geçildikten sonra emp kesinlikle mevcuttur
      if (!emp) throw badRequest(`Çalışan bulunamadı: ${ts.employeeId}`);
      let timesheetId = existingTimesheetMap.get(ts.employeeId);

      if (timesheetId) {
        await timesheetRepo.touchTimesheet(tx, timesheetId);
      } else {
        timesheetId = await timesheetRepo.insertTimesheet(tx, {
          employeeId: ts.employeeId,
          periodId: periodId,
          unitId: emp.unitId,
        });
      }

      allTimesheetIds.push(timesheetId);

      const newDaySignatures = new Set<string>();
      if (ts.days && ts.days.length > 0) {
        for (const dayEntry of ts.days) {
          allDayRows.push({
            timesheetId: timesheetId,
            day: dayEntry.day,
            markerCode: dayEntry.markerCode,
            note: dayEntry.note || null,
          });
          newDaySignatures.add(`${dayEntry.day}|${dayEntry.markerCode}`);
        }
      }

      // Gerçek değişim = eklenen + silinen günler
      const prevSignatures = existingDaySignatures.get(timesheetId) ?? new Set<string>();
      const added = [...newDaySignatures].filter((s) => !prevSignatures.has(s)).length;
      const removed = [...prevSignatures].filter((s) => !newDaySignatures.has(s)).length;
      const daysChanged = added + removed;

      totalDaysChanged += daysChanged;

      // Sadece gerçekten değişim olan çalışanları log'a ekle
      if (daysChanged > 0) {
        affectedEmployees.push({
          name: emp ? `${emp.firstName} ${emp.lastName}` : ts.employeeId,
          daysCount: daysChanged,
        });
      }
    }

    // Eski gün kayıtlarını temizle ve yenilerini toplu olarak ekle
    await timesheetRepo.deleteDays(tx, allTimesheetIds);
    await timesheetRepo.insertDays(tx, allDayRows);

    const periodLabel = formatPeriodLabel(period.year, period.month);
    const empCount = affectedEmployees.length;
    const allChanges = affectedEmployees.map((e) => `${e.name}: ${e.daysCount} gün değişti`);

    // Hiç değişiklik yoksa log atmıyoruz
    if (totalDaysChanged > 0) {
      await createAuditLog(tx, {
        action: AUDIT_ACTION.TIMESHEET_SAVE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.TIMESHEET,
        entityId: period.id,
        summary: `${periodLabel} dönemi — ${empCount} çalışan için toplam ${totalDaysChanged} gün değişti.`,
        changes: truncateChanges(allChanges, 50),
        metadata: {
          periodLabel,
          periodId: period.id,
          employeeCount: empCount,
          totalDaysChanged,
        },
      });
    }
  });

  res.json({ success: true, message: 'Puantaj kaydedildi' });
});

// ======================== PATCH /timesheets/:periodId/lock ========================
export const toggleLockPeriod = asyncHandler<{ periodId: string }>(async (req, res) => {
  const { periodId } = req.params;

  let updatedPeriod: { id: string; year: number; month: number; startDate: string; endDate: string; isLocked: boolean } | null = null;

  await withDrizzleTransaction(async (tx) => {
    const period = await periodRepo.findById(tx, periodId!);
    if (!period || period.isDeleted) throw notFound('Dönem bulunamadı');

    const newLockState = !period.isLocked;
    await periodRepo.updateLockStatus(tx, periodId!, newLockState);

    updatedPeriod = {
      id: period.id,
      year: period.year,
      month: period.month,
      startDate: period.startDate,
      endDate: period.endDate,
      isLocked: newLockState,
    };

    const periodLabel = formatPeriodLabel(period.year, period.month);
    await createAuditLog(tx, {
      action: newLockState ? AUDIT_ACTION.PERIOD_LOCK : AUDIT_ACTION.PERIOD_UNLOCK,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.PERIOD,
      entityId: periodId,
      summary: newLockState
        ? `${periodLabel} dönemi kilitlendi.`
        : `${periodLabel} döneminin kilidi açıldı.`,
      metadata: { periodLabel, year: period.year, month: period.month },
    });
  });

  res.json({
    success: true,
    message: updatedPeriod!.isLocked ? 'Dönem kilitlendi' : 'Dönem kilidi açıldı',
    data: { period: updatedPeriod },
  });
});

// ======================== GET /timesheets/periods ========================
export const getPeriods = asyncHandler(async (req: Request, res: Response) => {
  const activePeriods = await periodRepo.findActivePeriods(db);
  // Response transformation: Drizzle returns standard field names mapping from schema
  const periods = activePeriods.map(p => ({
    id: p.id,
    year: p.year,
    month: p.month,
    startDate: p.startDate,
    endDate: p.endDate,
    isLocked: p.isLocked
  }));
  res.json({ success: true, data: { periods } });
});
