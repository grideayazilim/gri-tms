/* ========================================================================
   IMPORT CONTROLLER (İÇE AKTARIM KONTROLCÜSÜ)
   Excel'den puantaj verisi veya toplu çalışan listesi içe aktarımını yönetir.
   ======================================================================== */
import type { Request, Response } from 'express';
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, truncateChanges } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, TURKISH_MONTHS as TURKISH_MONTHS_TC } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { conflict, rethrowIfNotUniqueViolation } from '../utils/AppError.js';
import { importRepo } from '../repositories/importRepo.js';
import { settingsRepo } from '../repositories/settingsRepo.js';

export const importEmployee = asyncHandler(async (req: Request, res: Response) => {
  const {
    tcNo, firstName, lastName, unitName, ibanNo,
    startDate, endDate, locationId, year, month, markers,
  } = req.body;

  let result;
  try {
    result = await withDrizzleTransaction(async (tx) => {
      let unitId: string | null = null;
      if (unitName) {
        const unitRes = await importRepo.findUnitByName(tx, locationId, unitName.trim());
        if (unitRes) unitId = unitRes.id;
      }

      let employeeId: string;
      let action: string;

      const existingEmp = await importRepo.findEmployeeByTc(tx, tcNo);

      if (existingEmp) {
        employeeId = existingEmp.id;
        if (!unitId) unitId = existingEmp.unitId;
        action = 'skipped';
      } else {
        if (!unitId) {
          const fallbackUnit = await importRepo.getFirstUnitInLocation(tx, locationId);
          unitId = fallbackUnit?.id || null;
        }
        
        // Ensure unitId exists if there's any fallback
        if (!unitId) {
           throw new Error(`Belirtilen lokasyonda atanabilecek birim (unit) bulunamadı.`);
        }

        const newEmp = await importRepo.insertEmployee(tx, {
          tcNo,
          firstName,
          lastName,
          ibanNo: ibanNo || null,
          unitId: unitId!,
          startDate: startDate || null,
          endDate: endDate || null,
          isActive: true,
        });
        employeeId = newEmp.id;
        action = 'created';
      }

      let periodId: string;
      const existingPeriod = await importRepo.findPeriod(tx, year, month);
      if (existingPeriod) {
        periodId = existingPeriod.id;
      } else {
        const newPeriod = await importRepo.insertPeriod(tx, year, month);
        periodId = newPeriod.id;
      }

      let timesheetId: string;
      const existingTs = await importRepo.findTimesheet(tx, employeeId, periodId);
      if (existingTs) {
        timesheetId = existingTs.id;
        await importRepo.touchTimesheet(tx, timesheetId);
      } else {
        const newTs = await importRepo.insertTimesheet(tx, employeeId, periodId, unitId!);
        timesheetId = newTs.id;
      }

      await importRepo.deleteTimesheetDays(tx, timesheetId);

      const dayEntries = markers ? Object.entries(markers).filter(([, code]) => !!code) : [];
      if (dayEntries.length > 0) {
        const dayRows = dayEntries.map(([day, code]) => ({
          timesheetId,
          day,
          markerCode: code as string,
        }));
        await importRepo.insertTimesheetDays(tx, dayRows);
      }

      return { employeeId, action };
    });
  } catch (err: unknown) {
    rethrowIfNotUniqueViolation(err, 'Bu TC No başka bir kayıtta zaten mevcut');
  }

  res.json({ success: true, data: result });
});

export const finalizeImport = asyncHandler(async (req: Request, res: Response) => {
  const {
    locationName, year, month,
    createdCount = 0, skippedCount = 0,
    dailyWage, timesheetChanges = [],
  } = req.body;

  await withDrizzleTransaction(async (tx) => {
    const created = createdCount;
    const skipped = skippedCount;
    const total = created + skipped;
    const periodLabel = `${TURKISH_MONTHS_TC[month - 1]} ${year}`;

    let wageUpdated = false;
    let previousWage: number | null = null;
    const newWage = parseFloat(dailyWage);

    if (!isNaN(newWage) && newWage > 0) {
      const current = await settingsRepo.getSettings(tx);
      if (current) {
        previousWage = parseFloat(current.dailyWage || '0');
        if (Math.abs(previousWage - newWage) > 0.001) {
          await settingsRepo.upsertSettings(tx, { maxWeeklyDays: current.maxWeeklyDays, programStartDate: current.programStartDate, programEndDate: current.programEndDate, dailyWage: newWage.toString() });
          wageUpdated = true;
        }
      } else {
        await settingsRepo.upsertSettings(tx, { maxWeeklyDays: 6, programStartDate: `${year}-01-01`, programEndDate: `${year}-12-31`, dailyWage: newWage.toString() });
        wageUpdated = true;
      }
    }

    const tsChanges = Array.isArray(timesheetChanges) ? timesheetChanges : [];
    const totalDaysChanged = tsChanges.reduce((sum, c) => sum + (c.daysCount || 0), 0);

    const changes: string[] = [];
    if (created > 0) changes.push(`${created} yeni çalışan eklendi`);
    if (skipped > 0) changes.push(`${skipped} mevcut çalışan atlandı`);
    if (wageUpdated) {
      if (previousWage !== null && previousWage > 0) {
        changes.push(`Günlük Ücret: ${previousWage.toLocaleString('tr-TR')} TL → ${newWage.toLocaleString('tr-TR')} TL`);
      } else {
        changes.push(`Günlük Ücret: ${newWage.toLocaleString('tr-TR')} TL olarak ayarlandı`);
      }
    }
    if (tsChanges.length > 0) {
      changes.push(`Toplam ${totalDaysChanged} gün güncellendi (${tsChanges.length} çalışan)`);
      for (const c of tsChanges) {
        changes.push(`${c.name}: ${c.daysCount} gün`);
      }
    }

    await createAuditLog(tx, {
      action: AUDIT_ACTION.EXCEL_IMPORT,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.TIMESHEET,
      entityId: null,
      summary: `${locationName.toUpperCase()} yerleşkesi için ${periodLabel} dönemi Excel'den içe aktarıldı (${total} çalışan).`,
      changes: truncateChanges(changes, 50),
      metadata: {
        locationName,
        periodLabel,
        totalAttempted: total,
        created,
        skipped,
        wageUpdated,
        oldWage: previousWage,
        newWage: wageUpdated ? newWage : null,
        totalDaysChanged,
        employeesWithDayChanges: tsChanges.length,
      },
    });
  });

  res.json({ success: true });
});

export const bulkImportEmployees = asyncHandler(async (req: Request, res: Response) => {
  const { employees } = req.body;

  if (!Array.isArray(employees)) {
    throw new Error("Geçersiz veri formatı. 'employees' dizisi bekleniyor.");
  }

  const locations = await importRepo.getAllLocations(db);
  const unitsList = await importRepo.getAllUnits(db);

  const normalize = (str: string) =>
    String(str || '')
      .trim()
      .toLocaleLowerCase('tr-TR');

  const locationMap = new Map<string, string>(locations.map((l) => [normalize(l.name), l.id]));
  const unitMap = new Map<string, string>();

  unitsList.forEach((u) => {
    unitMap.set(`${u.locationId}-${normalize(u.name)}`, u.id);
  });

  const results = {
    successCount: 0,
    failures: [] as { row: number; name: string; error: string }[],
  };

  await withDrizzleTransaction(async (tx) => {
    for (const [index, emp] of employees.entries()) {
      const rowNumber = index + 2;
      const {
        tcNo,
        fullName,
        locationName,
        unitName,
        ibanNo,
        startDate,
        endDate,
      } = emp;

      try {
        if (!tcNo) throw new Error('TC No eksik');
        if (!fullName) throw new Error('Ad Soyad eksik');
        if (!locationName) throw new Error('Yerleşke adı eksik');
        if (!startDate) throw new Error('İşe Giriş tarihi eksik');
        if (!ibanNo) throw new Error('IBAN eksik');

        const locId = locationMap.get(normalize(locationName));
        if (!locId) throw new Error(`'${locationName}' adında bir yerleşke bulunamadı`);

        const unitId = unitName ? unitMap.get(`${locId}-${normalize(unitName)}`) : undefined;
        if (unitName && !unitId) throw new Error(`'${locationName}' yerleşkesinde '${unitName}' adında bir birim bulunamadı`);
        if (!unitId) throw new Error('Birim adı zorunludur');

        const nameParts = fullName.trim().split(/\s+/);
        const lastName = nameParts.length > 1 ? nameParts.pop()! : '';
        const firstName = nameParts.join(' ');

        const insertRes = await importRepo.insertEmployeeOnConflictDoNothing(tx, {
          tcNo: tcNo.toString().trim(),
          firstName,
          lastName,
          ibanNo: ibanNo || null,
          unitId: unitId,
          startDate: startDate || null,
          endDate: endDate || null,
          isActive: true,
        });

        if (!insertRes) {
          throw conflict('Bu TC No zaten sistemde kayıtlı');
        }

        results.successCount++;
      } catch (err: unknown) {
        results.failures.push({
          row: rowNumber,
          name: fullName || 'Bilinmiyor',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (results.successCount > 0 || results.failures.length > 0) {
      const totalAttempted = employees.length;
      const failureCount = results.failures.length;

      const changes: string[] = [];
      if (results.successCount > 0) changes.push(`${results.successCount} çalışan başarıyla eklendi`);
      if (failureCount > 0) {
        changes.push(`${failureCount} satır hatalı`);
        for (const f of results.failures) {
          changes.push(`Satır ${f.row} (${f.name}): ${f.error}`);
        }
      }

      await createAuditLog(tx, {
        action: AUDIT_ACTION.BULK_EMPLOYEE_IMPORT,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
        entityId: null,
        summary: `Toplu çalışan içe aktarımı: ${results.successCount} başarılı, ${failureCount} hatalı (toplam ${totalAttempted}).`,
        changes: truncateChanges(changes, 50),
        metadata: {
          totalAttempted,
          successCount: results.successCount,
          failureCount,
          failedItems: results.failures.slice(0, 50),
        },
      });
    }
  });

  res.json({ success: true, data: results });
});
