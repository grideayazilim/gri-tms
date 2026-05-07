/* ========================================================================
   TIMESHEET CONTROLLER (PUANTAJ YÖNETİMİ)
   Puantaj listeleme, toplu kaydetme, dönem kilitleme ve dönem yönetimi.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import { getISOWeekKey, parseLocalDate, formatPeriodLabel } from '../utils/dateUtils.js';
import { createAuditLog, buildActor, truncateChanges } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, PAID_CODES, USER_ROLE } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { badRequest, forbidden, notFound, locked } from '../utils/AppError.js';
import { buildPagination } from '../utils/pagination.js';
import { periodRepo } from '../repositories/periodRepo.js';
import { timesheetRepo } from '../repositories/timesheetRepo.js';
import { settings } from '../../database/schema.js';
import type { TimesheetDayInsert } from '../../database/schema.js';

// ======================== GET /timesheets ========================
export const getTimesheets = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const scope = req.scope;

  const month = typeof req.query.month === 'string' ? req.query.month : undefined;
  const year = typeof req.query.year === 'string' ? req.query.year : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const unitId = typeof req.query.unitId === 'string' ? req.query.unitId : undefined;
  const locationId = typeof req.query.locationId === 'string' ? req.query.locationId : undefined;
  const page = typeof req.query.page === 'string' ? req.query.page : undefined;
  const limit = typeof req.query.limit === 'string' ? req.query.limit : undefined;

  // Yetki Kontrolü: RESPONSIBLE sadece kendi birimine/yerleşkesine erişebilir
  if (user.role === USER_ROLE.RESPONSIBLE) {
    if ((unitId && unitId !== user.unitId) || (locationId && locationId !== user.locationId)) {
      throw forbidden('Bu birim veya yerleşkeye erişim yetkiniz yok');
    }
  }

  // Sayfalama (Pagination) ayarları: 1'den küçük sayfa ve 100'den büyük limit kabul edilmez
  const pageNum = Math.max(1, parseInt(page || '1', 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '50', 10)));
  const offset = (pageNum - 1) * limitNum;

  // Dönem Bilgisi: Ay/Yıl bazlı veya varsayılan aktif dönemi bulur
  const period = await periodRepo.findActive(db, { ...(month ? { month } : {}), ...(year ? { year } : {}) });

  if (!period) {
    res.json({ success: true, data: { timesheets: [], pagination: buildPagination(pageNum, limitNum, 0) } });
    return;
  }

  // Durum Filtresi: Dönemin kilitli olup olmamasına göre boş sonuç döner
  if (status === 'locked' && !period.isLocked) {
    res.json({ success: true, data: { timesheets: [], pagination: buildPagination(pageNum, limitNum, 0) } });
    return;
  }
  if (status === 'unlocked' && period.isLocked) {
    res.json({ success: true, data: { timesheets: [], pagination: buildPagination(pageNum, limitNum, 0) } });
    return;
  }

  // Ana Veri Sorgusu (Çalışanlar ve Puantajlar)
  const { data: timesheetData, totalRecords } = await timesheetRepo.listWithEmployees(db, {
    periodId: period.id,
    search: search || undefined,
    unitId,
    locationId,
    scope,
    role: user.role,
    limit: limitNum,
    offset,
  });

  const timesheetIds = timesheetData.map((r) => r.timesheetId).filter(Boolean) as string[];

  // Günlük Günlerin Alınması
  const daysMap: Record<string, { id: string; day: string; markerCode: string; note: string | null }[]> = {};
  if (timesheetIds.length > 0) {
    const daysResult = await timesheetRepo.getTimesheetDays(db, timesheetIds);
    for (const d of daysResult) {
      if (!daysMap[d.timesheetId]) daysMap[d.timesheetId] = [];
      // Drizzle maps pg date to string (YYYY-MM-DD)
      daysMap[d.timesheetId]!.push({
        id: d.id,
        day: d.day,
        markerCode: d.markerCode,
        note: d.note,
      });
    }
  }

  // Maaş Ayarları
  const settingsResult = await db.select({ dailyWage: settings.dailyWage }).from(settings).limit(1);
  const dailyWage = parseFloat(settingsResult[0]?.dailyWage || '0');

  // Veri Transformasyonu
  const timesheets = timesheetData.map((row) => {
    const days = row.timesheetId ? daysMap[row.timesheetId] || [] : [];
    // Ücretli Gün Hesabı
    const totalWorkDays = days.filter((d) => PAID_CODES.has(d.markerCode)).length;

    return {
      employee: {
        id: row.employeeId,
        firstName: row.firstName,
        lastName: row.lastName,
        tcNo: row.tcNo,
        ibanNo: row.ibanNo,
        isActive: true,
        startDate: null,
        endDate: null,
      },
      unit: row.unitId ? { id: row.unitId, name: row.unitName } : null,
      location: row.locationId ? { id: row.locationId, name: row.locationName } : null,
      timesheet: {
        id: row.timesheetId,
        periodId: period.id,
        days,
      },
      period: {
        id: period.id,
        year: period.year,
        month: period.month,
        startDate: period.startDate,
        endDate: period.endDate,
        isLocked: period.isLocked,
      },
      totalWorkDays,
      totalPaidAmount: totalWorkDays * dailyWage,
    };
  });

  res.json({
    success: true,
    data: {
      timesheets,
      pagination: buildPagination(pageNum, limitNum, totalRecords),
    },
  });
});

// ======================== POST /timesheets ========================
// Gelen request body'deki puantaj girişi tipi
interface TimesheetEntry {
  employeeId: string;
  days: { markerCode: string; day: string; note?: string }[];
}

export const createOrUpdateTimesheets = asyncHandler(async (req: Request, res: Response) => {
  const periodId = req.body.periodId as string;
  const timesheets: TimesheetEntry[] = req.body.timesheets;
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
    const maxWeeklyDays = settingsResult[0]?.maxWeeklyDays || 6;

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
            weekMap[isoWeek] = (weekMap[isoWeek] || 0) + 1;
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
export const toggleLockPeriod = asyncHandler(async (req: Request, res: Response) => {
  const periodId = req.params.periodId as string;

  let newLockState = false;
  await withDrizzleTransaction(async (tx) => {
    const period = await periodRepo.findById(tx, periodId!);
    if (!period || period.isDeleted) throw notFound('Dönem bulunamadı');

    newLockState = !period.isLocked;

    await periodRepo.updateLockStatus(tx, periodId!, newLockState);

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
    message: newLockState ? 'Dönem kilitlendi' : 'Dönem kilidi açıldı',
    data: { isLocked: newLockState },
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
