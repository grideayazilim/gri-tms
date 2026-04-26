/* ========================================================================
   IMPORT CONTROLLER (İÇE AKTARIM KONTROLCÜSÜ)
   Excel'den puantaj verisi veya toplu çalışan listesi içe aktarımını yönetir.
   ======================================================================== */
import { withTransaction, pool } from "../config/database.js";
import { createAuditLog, buildActor, truncateChanges } from "../utils/auditLogger.js";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, TURKISH_MONTHS as TURKISH_MONTHS_TC } from "@timesheet/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { conflict } from "../utils/AppError.js";


export const importEmployee = asyncHandler(async (req, res) => {
  const {
    tcNo, firstName, lastName, unitName, ibanNo,
    startDate, endDate, locationId, year, month, markers,
  } = req.body;

  let result;
  try {
    result = await withTransaction(async (client) => {
      let unitId = null;
      if (unitName) {
        // Excel'den gelen birim adını yerleşke içindeki kayıtlarla eşleştir (Case-insensitive)
        const unitRes = await client.query(
          `SELECT id FROM app.units WHERE location_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
          [locationId, unitName.trim()],
        );
        if (unitRes.rows.length > 0) unitId = unitRes.rows[0].id;
      }


      let employeeId;
      let action;

      const existingEmp = await client.query(
        `SELECT id, unit_id FROM app.employees WHERE tc_no = $1 LIMIT 1`,
        [tcNo],
      );

      if (existingEmp.rows.length > 0) {
        // Eğer çalışan zaten varsa, bilgilerini güncellemek yerine mevcut kaydı kullanır (skipped)
        employeeId = existingEmp.rows[0].id;
        if (!unitId) unitId = existingEmp.rows[0].unit_id;
        action = "skipped";
      } else {
        // Yeni çalışan oluşturma süreci
        if (!unitId) {
          // Birim eşleşmezse yerleşkedeki ilk birimi fallback olarak ata
          const fallbackUnit = await client.query(
            `SELECT id FROM app.units WHERE location_id = $1 ORDER BY name LIMIT 1`,
            [locationId],
          );
          unitId = fallbackUnit.rows[0]?.id || null;
        }
        const insertRes = await client.query(
          `INSERT INTO app.employees
             (tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           RETURNING id`,
          [tcNo, firstName, lastName, ibanNo || null, unitId, startDate || null, endDate || null],
        );
        employeeId = insertRes.rows[0].id;
        action = "created";
      }


      let periodId;
      // İlgili ay/yıl için dönem (Period) kaydını kontrol et veya oluştur
      const periodRes = await client.query(
        `SELECT id FROM app.periods WHERE year = $1 AND month = $2 AND is_deleted = false LIMIT 1`,
        [year, month],
      );
      if (periodRes.rows.length > 0) {
        periodId = periodRes.rows[0].id;
      } else {
        const newPeriod = await client.query(
          `INSERT INTO app.periods (year, month, is_deleted) VALUES ($1, $2, false) RETURNING id`,
          [year, month],
        );
        periodId = newPeriod.rows[0].id;
      }


      let timesheetId;
      // Çalışan ve dönem ikilisi için Puantaj (Timesheet) başlığını bul veya oluştur
      const tsRes = await client.query(
        `SELECT id FROM app.timesheets WHERE employee_id = $1 AND period_id = $2 LIMIT 1`,
        [employeeId, periodId],
      );
      if (tsRes.rows.length > 0) {
        timesheetId = tsRes.rows[0].id;
        await client.query(`UPDATE app.timesheets SET updated_at = NOW() WHERE id = $1`, [timesheetId]);
      } else {
        const newTs = await client.query(
          `INSERT INTO app.timesheets (employee_id, period_id, unit_id) VALUES ($1, $2, $3) RETURNING id`,
          [employeeId, periodId, unitId],
        );
        timesheetId = newTs.rows[0].id;
      }


      // Mevcut günleri temizle ve Excel'den gelen yeni marker'ları ekle
      await client.query(`DELETE FROM app.timesheet_days WHERE timesheet_id = $1`, [timesheetId]);

      const dayEntries = markers ? Object.entries(markers).filter(([, code]) => !!code) : [];
      if (dayEntries.length > 0) {
        const valuePlaceholders = [];
        const dayParams = [timesheetId];
        let pi = 2;
        for (const [day, code] of dayEntries) {
          // SQL Injection'a karşı placeholder ($pi) kullanarak toplu INSERT hazırlar
          valuePlaceholders.push(`($1, $${pi++}::date, $${pi++})`);
          dayParams.push(day, code);
        }
        await client.query(
          `INSERT INTO app.timesheet_days (timesheet_id, day, marker_code) VALUES ${valuePlaceholders.join(", ")}`,
          dayParams,
        );
      }


      return { employeeId, action };
    });
  } catch (err) {
    if (err.code === "23505") throw conflict("Bu TC No başka bir kayıtta zaten mevcut");
    throw err;
  }

  res.json({ success: true, data: result });
});

export const finalizeImport = asyncHandler(async (req, res) => {
  const {
    locationName, year, month,
    createdCount = 0, skippedCount = 0,
    dailyWage, timesheetChanges = [],
  } = req.body;

  await withTransaction(async (client) => {
    const created = createdCount;
    const skipped = skippedCount;
    const total = created + skipped;
    const periodLabel = `${TURKISH_MONTHS_TC[month - 1]} ${year}`;

    let wageUpdated = false;
    let previousWage = null;
    const newWage = parseFloat(dailyWage);

    // Günlük Ücret Güncelleme: Excel'den gelen yeni ücret, mevcut ayardan farklıysa günceller.
    if (!isNaN(newWage) && newWage > 0) {
      const current = await client.query(`SELECT id, daily_wage FROM app.settings LIMIT 1`);
      if (current.rows.length > 0) {
        previousWage = parseFloat(current.rows[0].daily_wage || 0);
        if (Math.abs(previousWage - newWage) > 0.001) {
          await client.query(
            `UPDATE app.settings SET daily_wage = $1, updated_at = NOW() WHERE id = $2`,
            [newWage, current.rows[0].id],
          );
          wageUpdated = true;
        }
      } else {
        await client.query(`INSERT INTO app.settings (id, daily_wage) VALUES (1, $1)`, [newWage]);
        wageUpdated = true;
      }
    }


    const tsChanges = Array.isArray(timesheetChanges) ? timesheetChanges : [];
    const totalDaysChanged = tsChanges.reduce((sum, c) => sum + (c.daysCount || 0), 0);

    const changes = [];
    if (created > 0) changes.push(`${created} yeni çalışan eklendi`);
    if (skipped > 0) changes.push(`${skipped} mevcut çalışan atlandı`);
    if (wageUpdated) {
      if (previousWage !== null && previousWage > 0) {
        changes.push(`Günlük Ücret: ${previousWage.toLocaleString("tr-TR")} TL → ${newWage.toLocaleString("tr-TR")} TL`);
      } else {
        changes.push(`Günlük Ücret: ${newWage.toLocaleString("tr-TR")} TL olarak ayarlandı`);
      }
    }
    if (tsChanges.length > 0) {
      changes.push(`Toplam ${totalDaysChanged} gün güncellendi (${tsChanges.length} çalışan)`);
      for (const c of tsChanges) {
        changes.push(`${c.name}: ${c.daysCount} gün`);
      }
    }

    await createAuditLog(client, {
      action: AUDIT_ACTION.EXCEL_IMPORT,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.TIMESHEET,
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

export const bulkImportEmployees = asyncHandler(async (req, res) => {
  const { employees } = req.body;

  if (!Array.isArray(employees)) {
    throw new Error("Geçersiz veri formatı. 'employees' dizisi bekleniyor.");
  }

  const locationsRes = await pool.query(`SELECT id, name FROM app.locations`);
  const unitsRes = await pool.query(`SELECT id, location_id, name FROM app.units`);

  const normalize = (str) =>
    String(str || "")
      .trim()
      .toLocaleLowerCase("tr-TR");

  const locationMap = new Map(locationsRes.rows.map((l) => [normalize(l.name), l.id]));
  const unitMap = new Map();

  // Hızlı arama (O(1)) için Unit isimlerini Location ID ile map'le
  unitsRes.rows.forEach((u) => {
    unitMap.set(`${u.location_id}-${normalize(u.name)}`, u.id);
  });


  const results = {
    successCount: 0,
    failures: [],
  };

  await withTransaction(async (client) => {
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
        if (!tcNo) throw new Error("TC No eksik");
        if (!fullName) throw new Error("Ad Soyad eksik");
        if (!locationName) throw new Error("Yerleşke adı eksik");
        if (!startDate) throw new Error("İşe Giriş tarihi eksik");
        if (!ibanNo) throw new Error("IBAN eksik");

        const locId = locationMap.get(normalize(locationName));
        if (!locId) throw new Error(`'${locationName}' adında bir yerleşke bulunamadı`);

        const unitId = unitName ? unitMap.get(`${locId}-${normalize(unitName)}`) : null;
        if (unitName && !unitId) throw new Error(`'${locationName}' yerleşkesinde '${unitName}' adında bir birim bulunamadı`);

        // Ad Soyad Ayırma: Son boşluktan sonrasını Soyad kabul eder
        const nameParts = fullName.trim().split(/\s+/);
        const lastName = nameParts.length > 1 ? nameParts.pop() : "";
        const firstName = nameParts.join(" ");


        const insertRes = await client.query(
          `INSERT INTO app.employees
            (tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true)
           ON CONFLICT (tc_no) DO NOTHING
           RETURNING id`,
          [
            tcNo.toString().trim(),
            firstName,
            lastName,
            ibanNo || null,
            unitId,
            startDate || null,
            endDate || null,
          ],
        );

        if (insertRes.rows.length === 0) {
          throw conflict("Bu TC No zaten sistemde kayıtlı");
        }

        results.successCount++;
      } catch (err) {
        results.failures.push({
          row: rowNumber,
          name: fullName || "Bilinmiyor",
          error: err.message,
        });
      }
    }

    if (results.successCount > 0 || results.failures.length > 0) {
      const totalAttempted = employees.length;
      const failureCount = results.failures.length;

      const changes = [];
      if (results.successCount > 0) changes.push(`${results.successCount} çalışan başarıyla eklendi`);
      if (failureCount > 0) {
        changes.push(`${failureCount} satır hatalı`);
        for (const f of results.failures) {
          changes.push(`Satır ${f.row} (${f.name}): ${f.error}`);
        }
      }

      await createAuditLog(client, {
        action: AUDIT_ACTION.BULK_EMPLOYEE_IMPORT,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
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
