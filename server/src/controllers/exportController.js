/* ========================================================================
   EXPORT CONTROLLER (DIŞA AKTARIM KONTROLCÜSÜ)
   Puantaj verilerini farklı formatlarda (Maaş, Liste, Bot) Excel'e aktarır.
   ======================================================================== */
import { withTransaction, pool } from "../config/database.js";
import {
  generateTimesheetExcel,
  generateSimpleExcel,
  generateBotExcel,
} from "../utils/excelHandler.js";
import { createAuditLog, buildActor } from "../utils/auditLogger.js";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, TURKISH_MONTHS_UPPER as TURKISH_MONTHS } from "@timesheet/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { AppError, notFound } from "../utils/AppError.js";


async function fetchExportData(locationId, year, month) {
  return withTransaction(async (client) => {
    const locResult = await client.query(
      `SELECT id, name, program_no FROM app.locations WHERE id = $1`,
      [locationId],
    );
    if (locResult.rows.length === 0) return null;
    const location = locResult.rows[0];

    // 1. Dönem Bilgisi: Excel başlığı ve tarih sınırları için gerekli
    const periodResult = await client.query(
      `SELECT id, year, month, start_date, end_date, is_locked
       FROM app.periods
       WHERE year = $1 AND month = $2 AND is_deleted = false
       LIMIT 1`,
      [year, month],
    );
    const period = periodResult.rows[0] || null;

    // 2. Çalışan Listesi: Sadece aktif ve bu yerleşkeye bağlı olanlar
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


    const daysMap = new Map();
    // 3. Puantaj Verileri: Seçili çalışanların bu dönemdeki tüm günlerini toplu olarak çek
    if (period && employees.length > 0) {
      const empIds = employees.map((e) => e.id);
      const tsResult = await client.query(
        `SELECT t.employee_id, TO_CHAR(td.day, 'YYYY-MM-DD') AS day, td.marker_code
         FROM app.timesheets t
         JOIN app.timesheet_days td ON td.timesheet_id = t.id
         WHERE t.period_id = $1 AND t.employee_id = ANY($2)`,
        [period.id, empIds],
      );
      // daysMap: excelHandler'ın hızlı erişmesi için { employeeId: { 'YYYY-MM-DD': 'X' } } formatında grupla
      for (const row of tsResult.rows) {
        if (!daysMap.has(row.employee_id)) daysMap.set(row.employee_id, {});
        daysMap.get(row.employee_id)[row.day] = row.marker_code;
      }
    }


    const settingsResult = await client.query(
      `SELECT daily_wage,
              TO_CHAR(program_start_date, 'YYYY-MM-DD') AS program_start_date,
              TO_CHAR(program_end_date,   'YYYY-MM-DD') AS program_end_date
       FROM app.settings LIMIT 1`,
    );
    const settings = settingsResult.rows[0] || {};

    return {
      location,
      employees,
      daysMap,
      dailyWage: parseFloat(settings.daily_wage || 0),
      period,
      programStartDate: settings.program_start_date || null,
      programEndDate: settings.program_end_date || null,
    };
  });
}

function sendExcelResponse(res, buffer, filename) {
  // Excel indirme için gerekli HTTP Header ayarları
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(Buffer.from(buffer));
}


async function fireExportAuditLog(req, { exportType, locationName, year, month, locationId }) {
  const periodLabel = `${TURKISH_MONTHS[month - 1]} ${year}`;
  const typeLabels = {
    timesheet: 'Maaş Tablosu',
    simple: 'Liste',
    bot: 'Bot Girdisi',
  };
  const typeLabel = typeLabels[exportType] || 'Excel';

  try {
    await createAuditLog(pool, {
      action: AUDIT_ACTION.EXCEL_EXPORT,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.LOCATION,
      entityId: locationId || null,
      summary: `${locationName.toUpperCase()} yerleşkesi ${periodLabel} dönemi ${typeLabel} olarak dışa aktarıldı.`,
      metadata: {
        exportType,
        locationName,
        periodLabel,
        year: parseInt(year, 10),
        month: parseInt(month, 10),
      },
    });
  } catch (err) {
    console.error('[AUDIT] Export audit log kaydedilemedi:', err);
  }
}

export const exportTimesheet = asyncHandler(async (req, res) => {
  const { locationId, year, month } = req.query;

  const data = await fetchExportData(locationId, year, month);
  if (!data) throw notFound('Yerleşke bulunamadı');

  let buffer;
  try {
    // excelHandler: Dinamik import kullanarak yerel şablon script'ini çağırır
    buffer = await generateTimesheetExcel({
      employees: data.employees,
      daysMap: data.daysMap,
      dailyWage: data.dailyWage,
      year,
      month,
      locationName: data.location.name,
      programNo: data.location.program_no,
      periodStartDate: data.programStartDate,
      periodEndDate: data.programEndDate,
    });
  } catch (err) {
    // EXCEL_NOT_IMPLEMENTED: Eğer customExcelHandler.js dosyası yoksa kullanıcıya dostane hata döner
    if (err.message === "EXCEL_NOT_IMPLEMENTED") {
      throw new AppError("Bu sistemin excel çıktı şablonu ve script'i henüz yazılmadı.", 501);
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

export const exportSimple = asyncHandler(async (req, res) => {
  const { locationId, year, month } = req.query;

  const data = await fetchExportData(locationId, year, month);
  if (!data) throw notFound('Yerleşke bulunamadı');

  let buffer;
  try {
    buffer = await generateSimpleExcel({
      employees: data.employees,
      daysMap: data.daysMap,
      dailyWage: data.dailyWage,
      year,
      month,
      locationName: data.location.name,
    });
  } catch (err) {
    if (err.message === "EXCEL_NOT_IMPLEMENTED") {
      throw new AppError("Bu sistemin excel çıktı şablonu ve script'i henüz yazılmadı.", 501);
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

export const exportBot = asyncHandler(async (req, res) => {
  const { locationId, year, month } = req.query;

  const data = await fetchExportData(locationId, year, month);
  if (!data) throw notFound('Yerleşke bulunamadı');

  let buffer;
  try {
    buffer = await generateBotExcel({
      employees: data.employees,
      daysMap: data.daysMap,
      year,
      month,
      locationName: data.location.name,
      programNo: data.location.program_no,
      periodStartDate: data.period?.start_date,
      periodEndDate: data.period?.end_date,
    });
  } catch (err) {
    if (err.message === "EXCEL_NOT_IMPLEMENTED") {
      throw new AppError("Bu sistemin excel çıktı şablonu ve script'i henüz yazılmadı.", 501);
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
