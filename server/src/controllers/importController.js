import { withTransaction } from "../config/database.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AUDIT_EVENT } from "../enums/auditEventTypes.js";

const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

// ── POST /api/import/employee ──────────────────────────────────────────────────
// Tek bir çalışanı (ve puantaj günlerini) içe aktarır.
export async function importEmployee(req, res) {
  try {
    const {
      tcNo,
      firstName,
      lastName,
      unitName,
      ibanNo,
      startDate,
      endDate,
      locationId,
      year,
      month,
      markers,
    } = req.body;

    if (!tcNo || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "TC No, Ad ve Soyad zorunludur",
      });
    }
    if (!locationId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: "locationId, year ve month zorunludur",
      });
    }

    const result = await withTransaction(async (client) => {
      // 1) Birim bulma
      let unitId = null;
      if (unitName) {
        const unitRes = await client.query(
          `SELECT id FROM app.units
           WHERE location_id = $1 AND LOWER(name) = LOWER($2)
           LIMIT 1`,
          [locationId, unitName.trim()],
        );
        if (unitRes.rows.length > 0) {
          unitId = unitRes.rows[0].id;
        }
      }

      // 2) Çalışan kontrolü: TC No → var mı? atla : yeni ekle
      let employeeId;
      let action;

      const existingEmp = await client.query(
        `SELECT id, unit_id FROM app.employees WHERE tc_no = $1 LIMIT 1`,
        [tcNo],
      );

      if (existingEmp.rows.length > 0) {
        // Mevcut çalışan — kayıt güncellenmez, sadece puantaj işlenir
        employeeId = existingEmp.rows[0].id;
        if (!unitId) unitId = existingEmp.rows[0].unit_id;
        action = "skipped";
      } else {
        // Yeni çalışan — unitId null olursa yerleşkedeki ilk birimi fallback olarak al
        if (!unitId) {
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
          [
            tcNo,
            firstName,
            lastName,
            ibanNo || null,
            unitId,
            startDate || null,
            endDate || null,
          ],
        );
        employeeId = insertRes.rows[0].id;
        action = "created";
      }

      // 3) Dönemi bul veya oluştur
      let periodId;
      const periodRes = await client.query(
        `SELECT id FROM app.periods
         WHERE year = $1 AND month = $2 AND is_deleted = false
         LIMIT 1`,
        [year, month],
      );
      if (periodRes.rows.length > 0) {
        periodId = periodRes.rows[0].id;
      } else {
        const newPeriod = await client.query(
          `INSERT INTO app.periods (year, month, is_deleted) VALUES ($1, $2, false)
           RETURNING id`,
          [year, month],
        );
        periodId = newPeriod.rows[0].id;
      }

      // 4) Puantajı bul veya oluştur
      let timesheetId;
      const tsRes = await client.query(
        `SELECT id FROM app.timesheets
         WHERE employee_id = $1 AND period_id = $2
         LIMIT 1`,
        [employeeId, periodId],
      );
      if (tsRes.rows.length > 0) {
        timesheetId = tsRes.rows[0].id;
        await client.query(
          `UPDATE app.timesheets SET updated_at = NOW() WHERE id = $1`,
          [timesheetId],
        );
      } else {
        const newTs = await client.query(
          `INSERT INTO app.timesheets (employee_id, period_id, unit_id)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [employeeId, periodId, unitId],
        );
        timesheetId = newTs.rows[0].id;
      }

      // 5) Mevcut günleri temizle, yenileri ekle
      await client.query(
        `DELETE FROM app.timesheet_days WHERE timesheet_id = $1`,
        [timesheetId],
      );

      const dayEntries = markers
        ? Object.entries(markers).filter(([, code]) => !!code)
        : [];
      if (dayEntries.length > 0) {
        const valuePlaceholders = [];
        const dayParams = [timesheetId];
        let pi = 2;
        for (const [day, code] of dayEntries) {
          // $::date →'YYYY-MM-DD' stringini DATE tipine dönüştür
          valuePlaceholders.push(`($1, $${pi++}::date, $${pi++})`);
          dayParams.push(day, code);
        }
        await client.query(
          `INSERT INTO app.timesheet_days (timesheet_id, day, marker_code)
           VALUES ${valuePlaceholders.join(", ")}`,
          dayParams,
        );
      }

      return { employeeId, action };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Import employee error:", error?.message || error);
    const message =
      error.code === "23505"
        ? "Bu TC No başka bir kayıtta zaten mevcut"
        : error.message || "Çalışan aktarılırken hata oluştu";
    res.status(500).json({ success: false, message });
  }
}

// ── POST /api/import/finalize ──────────────────────────────────────────────────
// Import bittikten sonra:
//   1) Günlük ücreti günceller (dailyWage geldiyse)
//   2) Detaylı audit log oluşturur
export async function finalizeImport(req, res) {
  try {
    const {
      locationName,
      year,
      month,
      createdCount = 0,
      skippedCount = 0,
      dailyWage,
      timesheetChanges = [],
    } = req.body;

    if (!locationName || !year || !month) {
      return res.status(400).json({
        success: false,
        message: "locationName, year ve month zorunludur",
      });
    }

    await withTransaction(async (client) => {
      const created = parseInt(createdCount, 10) || 0;
      const skipped = parseInt(skippedCount, 10) || 0;
      const total = created + skipped;
      const periodLabel = `${TURKISH_MONTHS[parseInt(month, 10) - 1]} ${year}`;

      // 1) Günlük ücreti güncelle (gönderildiyse ve geçerli bir sayıysa)
      let wageUpdated = false;
      let previousWage = null;
      const newWage = parseFloat(dailyWage);

      if (!isNaN(newWage) && newWage > 0) {
        const current = await client.query(
          `SELECT id, daily_wage FROM app.settings LIMIT 1`,
        );
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
          await client.query(
            `INSERT INTO app.settings (id, daily_wage) VALUES (1, $1)`,
            [newWage],
          );
          wageUpdated = true;
        }
      }

      // 2) İşlem açıklaması
      const description = `${req.user.username}, ${periodLabel} dönemi ${locationName.toUpperCase()} yerleşkesi için Excel'den dosya içe aktardı.`;

      // 3) Detaylar / Değişiklik sütunu için newData
      const newData = {};

      if (total > 0) {
        const parts = [];
        if (created > 0) parts.push(`${created} yeni çalışan eklendi`);
        if (skipped > 0) parts.push(`${skipped} mevcut çalışan atlandı`);
        newData["Çalışan Aktarımı"] =
          `${total} çalışan aktarıldı — ${parts.join(", ")}`;
      }

      if (wageUpdated) {
        if (previousWage !== null && previousWage > 0) {
          newData["Günlük Ücret"] =
            `${previousWage.toLocaleString("tr-TR")} TL → ${newWage.toLocaleString("tr-TR")} TL olarak güncellendi`;
        } else {
          newData["Günlük Ücret"] =
            `${newWage.toLocaleString("tr-TR")} TL olarak ayarlandı`;
        }
      }

      // 4) Puantaj değişikliği varsa newData'ya ekle
      const changes = Array.isArray(timesheetChanges) ? timesheetChanges : [];
      if (changes.length > 0) {
        const totalDays = changes.reduce(
          (sum, c) => sum + (c.daysCount || 0),
          0,
        );
        const employeeDetail = changes
          .map((c) => `${c.name}: ${c.daysCount} gün`)
          .join(", ");
        newData["Puantaj"] =
          `Toplam ${totalDays} gün güncellendi — ${employeeDetail}`;
      }

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.EXCEL_IMPORT,
        description,
        tableName: "employees",
        newData: Object.keys(newData).length > 0 ? newData : null,
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Finalize import error:", error?.message || error);
    res.status(500).json({
      success: false,
      message: error.message || "Kayıt oluşturulurken hata oluştu",
    });
  }
}
