/* ========================================================================
   IMPORT CONTROLLER (İÇE AKTARIM KONTROLCÜSÜ)
   Excel'den puantaj verisi veya toplu çalışan listesi içe aktarımını yönetir.
   ======================================================================== */
import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, truncateChanges } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, BulkImportEmployeesType, normalizePhone } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { conflict } from '../utils/AppError.js';
import { importRepo } from '../repositories/importRepo.js';

export const bulkImportEmployees = asyncHandler<Record<string, string>, unknown, BulkImportEmployeesType>(async (req, res) => {
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
    successes: [] as { row: number; name: string }[],
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
        phoneNo,
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

        // Çalışan adı her zaman büyük harfle kaydedilir (resmi belge gereği)
        const nameParts = fullName.trim().toLocaleUpperCase('tr-TR').split(/\s+/);
        const lastName = nameParts.length > 1 ? nameParts.pop()! : '';
        const firstName = nameParts.join(' ');

        const insertRes = await importRepo.insertEmployeeOnConflictDoNothing(tx, {
          tcNo: tcNo.toString().trim(),
          firstName,
          lastName,
          ibanNo: ibanNo || null,
          phoneNo: phoneNo ? normalizePhone(phoneNo) : null,
          unitId: unitId,
          startDate: (startDate || new Date().toISOString().split('T')[0]) as string,
          endDate: endDate || null,
          isActive: true,
        });

        if (!insertRes) {
          throw conflict('Bu TC No zaten sistemde kayıtlı');
        }

        results.successes.push({
          row: rowNumber,
          name: fullName,
        });
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
      for (const s of results.successes) {
        changes.push(`Satır ${s.row} (${s.name}): Başarılı`);
      }
      for (const f of results.failures) {
        changes.push(`Satır ${f.row} (${f.name}): Hata - ${f.error}`);
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
          successItems: results.successes.slice(0, 50),
        },
      });
    }
  });

  res.json({ success: true, data: results });
});
