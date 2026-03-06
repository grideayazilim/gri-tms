import { withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog } from "../utils/auditLogger.js";
import { AUDIT_EVENT } from "../enums/auditEventTypes.js";

// ======================== GET /timesheets ========================
export async function getTimesheets(req, res) {
  try {
    const { role } = req.user;
    const scope = req.scope;

    // RESPONSIBLE kullanıcı farklı unitId/locationId gönderirse 403
    if (role === "RESPONSIBLE") {
      const { unitId, locationId } = req.query;
      if (
        (unitId && unitId !== req.user.unitId) ||
        (locationId && locationId !== req.user.locationId)
      ) {
        return res.status(403).json({
          success: false,
          message: "Bu birim veya yerleşkeye erişim yetkiniz yok",
        });
      }
    }

    // Query parametreleri
    const {
      month,
      year,
      status,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    // Dinamik WHERE koşulları
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Scope filtresi
    if (scope) {
      if (scope.unitId) {
        conditions.push(`e.unit_id = $${paramIndex++}`);
        params.push(scope.unitId);
      }
      if (scope.locationId) {
        conditions.push(`u.location_id = $${paramIndex++}`);
        params.push(scope.locationId);
      }
    }

    // ADMIN için query'den gelen filtreler (scope null ise)
    if (!scope && role === "ADMIN") {
      const { unitId, locationId } = req.query;
      if (unitId) {
        conditions.push(`e.unit_id = $${paramIndex++}`);
        params.push(unitId);
      }
      if (locationId) {
        conditions.push(`u.location_id = $${paramIndex++}`);
        params.push(locationId);
      }
    }

    // Ay filtresi (YYYY-MM)
    if (month) {
      const [y, m] = month.split("-");
      conditions.push(`p.year = $${paramIndex++}`);
      params.push(parseInt(y, 10));
      conditions.push(`p.month = $${paramIndex++}`);
      params.push(parseInt(m, 10));
    }

    // Yıl filtresi
    if (year && !month) {
      conditions.push(`p.year = $${paramIndex++}`);
      params.push(parseInt(year, 10));
    }

    // Durum filtresi
    if (status === "locked") {
      conditions.push(`p.is_locked = true`);
    } else if (status === "unlocked") {
      conditions.push(`p.is_locked = false`);
    }

    // Arama filtresi (ad, soyad, TC)
    if (search) {
      conditions.push(
        `(e.first_name ILIKE $${paramIndex} OR e.last_name ILIKE $${paramIndex} OR e.tc_no ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const result = await withTransaction(async (client) => {
      // 1) Toplam kayıt sayısı
      const countQuery = `
        SELECT COUNT(*) AS total
        FROM app.timesheets t
        JOIN app.employees e ON e.id = t.employee_id
        JOIN app.periods p ON p.id = t.period_id
        JOIN app.units u ON u.id = e.unit_id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const totalRecords = parseInt(countResult.rows[0].total, 10);

      // 2) Puantaj verilerini getir
      const dataQuery = `
        SELECT
          t.id            AS timesheet_id,
          t.created_at    AS timesheet_created_at,
          t.updated_at    AS timesheet_updated_at,
          e.id            AS employee_id,
          e.first_name,
          e.last_name,
          e.tc_no,
          e.iban_no,
          p.id            AS period_id,
          p.year,
          p.month,
          TO_CHAR(p.start_date, 'YYYY-MM-DD') AS period_start_date,
          TO_CHAR(p.end_date, 'YYYY-MM-DD')   AS period_end_date,
          p.is_locked,
          u.id            AS unit_id,
          u.name          AS unit_name,
          l.id            AS location_id,
          l.name          AS location_name,
          l.program_no
        FROM app.timesheets t
        JOIN app.employees e ON e.id = t.employee_id
        JOIN app.periods p ON p.id = t.period_id
        JOIN app.units u ON u.id = e.unit_id
        JOIN app.locations l ON l.id = u.location_id
        ${whereClause}
        ORDER BY e.last_name, e.first_name, p.year, p.month
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      const dataResult = await client.query(dataQuery, [
        ...params,
        limitNum,
        offset,
      ]);

      // Timesheet ID'leri topla
      const timesheetIds = dataResult.rows.map((r) => r.timesheet_id);

      // 3) Günleri toplu getir
      let daysMap = {};
      if (timesheetIds.length > 0) {
        const daysResult = await client.query(
          `SELECT td.id, td.timesheet_id, TO_CHAR(td.day, 'YYYY-MM-DD') AS day, td.marker_code, td.note
           FROM app.timesheet_days td
           WHERE td.timesheet_id = ANY($1)
           ORDER BY td.day`,
          [timesheetIds]
        );
        for (const d of daysResult.rows) {
          if (!daysMap[d.timesheet_id]) daysMap[d.timesheet_id] = [];
          const { timesheet_id, ...dayData } = d;
          daysMap[d.timesheet_id].push(toCamelCase(dayData));
        }
      }

      // 4) is_paid marker code'larını al
      const markerResult = await client.query(
        `SELECT code FROM app.markers WHERE is_paid = true`
      );
      const paidCodes = new Set(markerResult.rows.map((r) => r.code));

      // 5) daily_wage al
      const settingsResult = await client.query(
        `SELECT daily_wage FROM app.settings LIMIT 1`
      );
      const dailyWage = parseFloat(settingsResult.rows[0]?.daily_wage || 0);

      // 6) Response'u oluştur
      const timesheets = dataResult.rows.map((row) => {
        const days = daysMap[row.timesheet_id] || [];
        const totalWorkDays = days.filter((d) =>
          paidCodes.has(d.markerCode)
        ).length;

        return toCamelCase({
          id: row.timesheet_id,
          employee: {
            id: row.employee_id,
            first_name: row.first_name,
            last_name: row.last_name,
            tc_no: row.tc_no,
            iban_no: row.iban_no,
          },
          period: {
            id: row.period_id,
            year: row.year,
            month: row.month,
            start_date: row.period_start_date,
            end_date: row.period_end_date,
            is_locked: row.is_locked,
          },
          unit: {
            id: row.unit_id,
            name: row.unit_name,
            location: {
              id: row.location_id,
              name: row.location_name,
              program_no: row.program_no,
            },
          },
          days,
          total_work_days: totalWorkDays,
          total_paid_amount: totalWorkDays * dailyWage,
          created_at: row.timesheet_created_at?.toISOString(),
          updated_at: row.timesheet_updated_at?.toISOString(),
        });
      });

      return { timesheets, totalRecords };
    });

    const totalPages = Math.ceil(result.totalRecords / limitNum);

    res.json({
      success: true,
      data: {
        timesheets: result.timesheets,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRecords: result.totalRecords,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get timesheets error:", error);
    res.status(500).json({
      success: false,
      message: "Puantaj verileri alınırken hata oluştu",
    });
  }
}

// ======================== POST /timesheets ========================
export async function createOrUpdateTimesheets(req, res) {
  try {
    const { periodId, timesheets } = req.body;

    // Input validasyon
    if (!periodId || !Array.isArray(timesheets) || timesheets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "periodId ve en az bir timesheet verisi gerekli",
      });
    }

    const result = await withTransaction(async (client) => {
      // 1) Period kontrolü
      const periodResult = await client.query(
        `SELECT id, year, month, start_date, end_date, is_locked
         FROM app.periods WHERE id = $1`,
        [periodId]
      );

      if (periodResult.rows.length === 0) {
        return { error: true, status: 400, message: "Geçersiz dönem" };
      }

      const period = periodResult.rows[0];

      // 2) Kilitli mi?
      if (period.is_locked) {
        return {
          error: true,
          status: 423,
          message: "Bu dönem kilitlenmiş. Puantaj girişi yapılamaz",
        };
      }

      // 3) Tüm çalışan bilgilerini tek sorguda çek (batch)
      const employeeIds = timesheets.map((t) => t.employeeId);
      const empInfoResult = await client.query(
        `SELECT e.id, e.unit_id, e.first_name, e.last_name, u.location_id
         FROM app.employees e
         JOIN app.units u ON u.id = e.unit_id
         WHERE e.id = ANY($1)`,
        [employeeIds]
      );

      // Map: employeeId -> { unitId, locationId, firstName, lastName }
      const employeeMap = new Map();
      for (const row of empInfoResult.rows) {
        employeeMap.set(row.id, {
          unitId: row.unit_id,
          locationId: row.location_id,
          firstName: row.first_name,
          lastName: row.last_name,
        });
      }

      // Geçersiz ID kontrolü
      const missingIds = employeeIds.filter((id) => !employeeMap.has(id));
      if (missingIds.length > 0) {
        return {
          error: true,
          status: 400,
          message: `Geçersiz çalışan ID'leri: ${missingIds.join(", ")}`,
        };
      }

      // RESPONSIBLE — scope kontrolü
      const scope = req.scope;
      if (scope) {
        const unauthorized = empInfoResult.rows.filter(
          (r) =>
            r.unit_id !== scope.unitId ||
            (scope.locationId && r.location_id !== scope.locationId)
        );
        if (unauthorized.length > 0) {
          return {
            error: true,
            status: 403,
            message: "Bu çalışanlar üzerinde işlem yetkiniz yok",
          };
        }
      }

      // 4) settings — max_weekly_days
      const settingsResult = await client.query(
        `SELECT max_weekly_days FROM app.settings LIMIT 1`
      );
      const maxWeeklyDays = settingsResult.rows[0]?.max_weekly_days || 6;

      // is_paid marker code'ları
      const markerResult = await client.query(
        `SELECT code FROM app.markers WHERE is_paid = true`
      );
      const paidCodes = new Set(markerResult.rows.map((r) => r.code));

      // 5) Haftalık limit kontrolü (ISO hafta: Pazartesi–Pazar)
      for (const ts of timesheets) {
        const weekMap = {};
        for (const dayEntry of ts.days) {
          if (paidCodes.has(dayEntry.markerCode)) {
            const date = new Date(dayEntry.day + "T00:00:00Z");
            const isoWeek = getISOWeekKey(date);
            weekMap[isoWeek] = (weekMap[isoWeek] || 0) + 1;
          }
        }

        for (const [weekKey, count] of Object.entries(weekMap)) {
          if (count > maxWeeklyDays) {
            const emp = employeeMap.get(ts.employeeId);
            const empName = emp
              ? `${emp.firstName} ${emp.lastName}`
              : ts.employeeId;

            return {
              error: true,
              status: 400,
              message: `Haftalık limit aşımı: ${empName} için ${weekKey} haftasında ${count} ücretli gün girilmiş (maks: ${maxWeeklyDays})`,
            };
          }
        }
      }

      // 6) Mevcut timesheet'leri tek sorguda çek (batch)
      const existingResult = await client.query(
        `SELECT id, employee_id FROM app.timesheets
         WHERE employee_id = ANY($1) AND period_id = $2`,
        [employeeIds, periodId]
      );

      // Map: employeeId -> timesheetId
      const existingTimesheetMap = new Map();
      for (const row of existingResult.rows) {
        existingTimesheetMap.set(row.employee_id, row.id);
      }

      // 7) Timesheet kayıtlarını oluştur/güncelle (replace stratejisi)
      let totalDaysChanged = 0;
      const affectedEmployees = [];
      const allTimesheetIds = [];  // batch DELETE için tüm timesheet ID'leri
      const allDayValues = [];    // batch INSERT için tüm günler
      const allDayParams = [];    // batch INSERT parametre listesi
      let dayParamIndex = 1;

      for (const ts of timesheets) {
        const emp = employeeMap.get(ts.employeeId);
        let timesheetId = existingTimesheetMap.get(ts.employeeId);

        if (timesheetId) {
          // Mevcut — updated_at güncelle
          await client.query(
            `UPDATE app.timesheets SET updated_at = NOW() WHERE id = $1`,
            [timesheetId]
          );
        } else {
          // Yeni — oluştur
          const insertResult = await client.query(
            `INSERT INTO app.timesheets (employee_id, period_id, unit_id)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [ts.employeeId, periodId, emp.unitId]
          );
          timesheetId = insertResult.rows[0].id;
        }

        allTimesheetIds.push(timesheetId);

        // Günleri batch INSERT için biriktir
        if (ts.days && ts.days.length > 0) {
          for (const dayEntry of ts.days) {
            allDayValues.push(
              `($${dayParamIndex++}, $${dayParamIndex++}, $${dayParamIndex++}, $${dayParamIndex++})`
            );
            allDayParams.push(
              timesheetId,
              dayEntry.day,
              dayEntry.markerCode,
              dayEntry.note || null
            );
          }
          totalDaysChanged += ts.days.length;
        }

        // Audit log için çalışan bilgisi (Map'ten, DB'ye gitmeden)
        const empName = emp
          ? `${emp.firstName} ${emp.lastName}`
          : ts.employeeId;
        affectedEmployees.push({
          name: empName,
          daysCount: ts.days?.length || 0,
        });
      }

      // Replace stratejisi: mevcut tüm günleri toplu sil
      if (allTimesheetIds.length > 0) {
        await client.query(
          `DELETE FROM app.timesheet_days WHERE timesheet_id = ANY($1)`,
          [allTimesheetIds]
        );
      }

      // Tüm günleri tek batch INSERT ile ekle
      if (allDayValues.length > 0) {
        await client.query(
          `INSERT INTO app.timesheet_days (timesheet_id, day, marker_code, note)
           VALUES ${allDayValues.join(", ")}`,
          allDayParams
        );
      }

      // 8) Audit log
      const employeeDetail = affectedEmployees
        .map((e) => `${e.name}: ${e.daysCount} gün`)
        .join(", ");

      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.TIMESHEET,
        description: `Toplam ${totalDaysChanged} gün güncellendi — ${employeeDetail}`,
        tableName: "timesheets",
      });

      return { error: false };
    });

    // Transaction dışında response
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: "Puantaj kaydedildi",
    });
  } catch (error) {
    console.error("Create/update timesheets error:", error);
    res.status(500).json({
      success: false,
      message: "Puantaj kaydedilirken hata oluştu",
    });
  }
}

// ======================== PATCH /timesheets/:periodId/lock ========================
export async function lockPeriod(req, res) {
  try {
    const { periodId } = req.params;

    const result = await withTransaction(async (client) => {
      // Period var mı?
      const periodResult = await client.query(
        `SELECT id, year, month FROM app.periods WHERE id = $1`,
        [periodId]
      );

      if (periodResult.rows.length === 0) {
        return { error: true, status: 404, message: "Dönem bulunamadı" };
      }

      const period = periodResult.rows[0];

      // Kilitle
      await client.query(
        `UPDATE app.periods SET is_locked = true WHERE id = $1`,
        [periodId]
      );

      // Audit log
      await createAuditLog(client, {
        username: req.user.username,
        userRole: req.user.role,
        eventType: AUDIT_EVENT.TIMESHEET,
        description: `${period.year}-${String(period.month).padStart(2, "0")} dönemi kilitlendi`,
        tableName: "periods",
        recordId: periodId,
      });

      return { error: false };
    });

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.json({
      success: true,
      message: "Dönem kilitlendi",
    });
  } catch (error) {
    console.error("Lock period error:", error);
    res.status(500).json({
      success: false,
      message: "Dönem kilitlenirken hata oluştu",
    });
  }
}

// ======================== YARDIMCI FONKSİYONLAR ========================

/**
 * ISO 8601 hafta numarasını döndürür (Pazartesi–Pazar).
 * Format: "YYYY-Whh" (örn: "2024-W03")
 */
function getISOWeekKey(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  // Perşembe'ye kaydır (ISO hafta kuralı)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
