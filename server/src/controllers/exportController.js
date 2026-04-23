import { pool, withTransaction } from "../config/database.js";
import {
  generateTimesheetExcel,
  generateSimpleExcel,
  generateBotExcel,
} from "../utils/excelHandler.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AUDIT_EVENT } from "../enums/auditEventTypes.js";

const TURKISH_MONTHS = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK",
];

// ── Ortak: veri çekme ─────────────────────────────────────────────────────────
// NOT: Dışa aktarım logic'i (şablon doldurma) /src/utils/excelHandler.js içerisindedir.
// excelHandler, kendi içinde projeye özel olan "customExcelHandler.js" dosyasını çağırır.
// Eğer bu özel dosya yoksa "EXCEL_NOT_IMPLEMENTED" hatası fırlatılır ve client'a 501 dönülür.
async function fetchExportData(locationId, year, month) {
  return withTransaction(async (client) => {
    // 1) Yerleşke bilgisi
    const locResult = await client.query(
      `SELECT id, name, program_no FROM app.locations WHERE id = $1`,
      [locationId],
    );
    if (locResult.rows.length === 0) return null;
    const location = locResult.rows[0];

    // 2) Dönem
    const periodResult = await client.query(
      `SELECT id, year, month, start_date, end_date, is_locked
       FROM app.periods
       WHERE year = $1 AND month = $2 AND is_deleted = false
       LIMIT 1`,
      [year, month],
    );
    const period = periodResult.rows[0] || null;

    // 3) Aktif çalışanlar (bu yerleşkedeki tüm birimler)
    const empResult = await client.query(
      `SELECT e.id, e.tc_no, e.first_name, e.last_name, e.iban_no,
              e.start_date, e.end_date,
              u.id AS unit_id, u.name AS unit_name
       FROM app.employees e
       JOIN app.units u ON u.id = e.unit_id
       WHERE u.location_id = $1 AND e.is_active = true
       ORDER BY e.first_name, e.last_name`,
      [locationId],
    );
    const employees = empResult.rows;

    // 4) Puantaj günleri (dönem varsa)
    const daysMap = new Map(); // employeeId → { 'YYYY-MM-DD': markerCode }
    if (period && employees.length > 0) {
      const empIds = employees.map((e) => e.id);
      const tsResult = await client.query(
        `SELECT t.employee_id, TO_CHAR(td.day, 'YYYY-MM-DD') AS day, td.marker_code
         FROM app.timesheets t
         JOIN app.timesheet_days td ON td.timesheet_id = t.id
         WHERE t.period_id = $1 AND t.employee_id = ANY($2)`,
        [period.id, empIds],
      );
      for (const row of tsResult.rows) {
        if (!daysMap.has(row.employee_id)) daysMap.set(row.employee_id, {});
        daysMap.get(row.employee_id)[row.day] = row.marker_code;
      }
    }

    // 5) Ayarlar: günlük ücret + program tarihleri (TO_CHAR ile timezone sorunsuz string)
    const settingsResult = await client.query(
      `SELECT daily_wage,
              TO_CHAR(program_start_date, 'YYYY-MM-DD') AS program_start_date,
              TO_CHAR(program_end_date,   'YYYY-MM-DD') AS program_end_date
       FROM app.settings LIMIT 1`,
    );
    const settings = settingsResult.rows[0] || {};
    const dailyWage = parseFloat(settings.daily_wage || 0);
    const programStartDate = settings.program_start_date || null;
    const programEndDate = settings.program_end_date || null;

    return {
      location,
      employees,
      daysMap,
      dailyWage,
      period,
      programStartDate,
      programEndDate,
    };
  });
}

// ── GET /api/export/timesheet?locationId=&year=&month= ─────────────────────────
// Şablon tabanlı export (bot için değil, timesheet için)
export async function exportTimesheet(req, res) {
  try {
    const { locationId, year, month } = req.query;

    if (!locationId || !year || !month) {
      return res
        .status(400)
        .json({
          success: false,
          message: "locationId, year ve month zorunludur",
        });
    }

    const data = await fetchExportData(
      locationId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Yerleşke bulunamadı" });
    }

    const buffer = await generateTimesheetExcel({
      employees: data.employees,
      daysMap: data.daysMap,
      dailyWage: data.dailyWage,
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      locationName: data.location.name,
      programNo: data.location.program_no,
      periodStartDate: data.programStartDate,
      periodEndDate: data.programEndDate,
    });

    const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${TURKISH_MONTHS[month - 1]} ${year} MAAŞLAR.xlsm`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(Buffer.from(buffer));

    // Audit log (response gönderildikten sonra, hata ana akışı etkilemesin)
    const periodLabel = `${TURKISH_MONTHS[parseInt(month, 10) - 1]} ${year}`;
    withTransaction(async (client) => {
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.EXCEL_EXPORT,
        description: `${req.user.username}, ${periodLabel} dönemi ${data.location.name} yerleşkesi tablosunu Excel olarak dışa aktardı.`,
        tableName: "timesheets",
      });
    }).catch((err) => console.error("Export audit log error:", err));
  } catch (error) {
    // Özel script henüz yazılmamışsa, bu durumu client'a kibar bir mesajla ilet
    if (error.message === "EXCEL_NOT_IMPLEMENTED") {
      return res.status(501).json({
        success: false,
        message: "Bu sistemin excel çıktı şablonu ve script'i henüz yazılmadı."
      });
    }
    console.error("Export timesheet error:", error?.message || error);
    console.error(error?.stack);
    res
      .status(500)
      .json({
        success: false,
        message: error?.message || "Excel oluşturulurken hata oluştu",
      });
  }
}

// ── GET /api/export/simple?locationId=&year=&month= ──────────────────────────
// Bot tablo export
export async function exportSimple(req, res) {
  try {
    const { locationId, year, month } = req.query;

    if (!locationId || !year || !month) {
      return res
        .status(400)
        .json({
          success: false,
          message: "locationId, year ve month zorunludur",
        });
    }

    const data = await fetchExportData(
      locationId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Yerleşke bulunamadı" });
    }

    const buffer = await generateSimpleExcel({
      employees: data.employees,
      daysMap: data.daysMap,
      dailyWage: data.dailyWage,
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      locationName: data.location.name,
    });

    const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${TURKISH_MONTHS[month - 1]} ${year} LİSTE.xlsm`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(Buffer.from(buffer));

    const periodLabel = `${TURKISH_MONTHS[parseInt(month, 10) - 1]} ${year}`;
    withTransaction(async (client) => {
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.EXCEL_EXPORT,
        description: `${req.user.username}, ${periodLabel} dönemi ${data.location.name} yerleşkesi tablosunu Excel olarak dışa aktardı.`,
        tableName: "timesheets",
      });
    }).catch((err) => console.error("Export audit log error:", err));
  } catch (error) {
    // Özel script henüz yazılmamışsa, bu durumu client'a kibar bir mesajla ilet
    if (error.message === "EXCEL_NOT_IMPLEMENTED") {
      return res.status(501).json({
        success: false,
        message: "Bu sistemin excel çıktı şablonu ve script'i henüz yazılmadı."
      });
    }
    console.error("Export simple error:", error?.message || error);
    console.error(error?.stack);
    res
      .status(500)
      .json({
        success: false,
        message: error?.message || "Excel oluşturulurken hata oluştu",
      });
  }
}

// ── GET /api/export/bot?locationId=&year=&month= ─────────────────────────────
// Bot tablosu: çalışılan gün=1, çalışılmayan gün=0
export async function exportBot(req, res) {
  try {
    const { locationId, year, month } = req.query;

    if (!locationId || !year || !month) {
      return res
        .status(400)
        .json({
          success: false,
          message: "locationId, year ve month zorunludur",
        });
    }

    const data = await fetchExportData(
      locationId,
      parseInt(year, 10),
      parseInt(month, 10),
    );
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Yerleşke bulunamadı" });
    }

    const buffer = await generateBotExcel({
      employees: data.employees,
      daysMap: data.daysMap,
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      locationName: data.location.name,
      programNo: data.location.program_no,
      periodStartDate: data.period?.start_date,
      periodEndDate: data.period?.end_date,
    });

    const filename = `${data.location.name.toLocaleUpperCase('tr-TR')} - ${TURKISH_MONTHS[month - 1]} ${year} BOT GİRDİSİ.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(Buffer.from(buffer));

    const periodLabel = `${TURKISH_MONTHS[parseInt(month, 10) - 1]} ${year}`;
    withTransaction(async (client) => {
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.EXCEL_EXPORT,
        description: `${req.user.username}, ${periodLabel} dönemi ${data.location.name} yerleşkesi bot tablosunu dışa aktardı.`,
        tableName: "timesheets",
      });
    }).catch((err) => console.error("Bot export audit log error:", err));
  } catch (error) {
    // Özel script henüz yazılmamışsa, bu durumu client'a kibar bir mesajla ilet
    if (error.message === "EXCEL_NOT_IMPLEMENTED") {
      return res.status(501).json({
        success: false,
        message: "Bu sistemin excel çıktı şablonu ve script'i henüz yazılmadı."
      });
    }
    console.error("Export bot error:", error?.message || error);
    console.error(error?.stack);
    res
      .status(500)
      .json({
        success: false,
        message: error?.message || "Bot Excel oluşturulurken hata oluştu",
      });
  }
}
