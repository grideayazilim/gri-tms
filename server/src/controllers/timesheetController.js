/* ========================================================================
   TIMESHEET CONTROLLER (PUANTAJ YÖNETİMİ)
   Puantaj listeleme, toplu kaydetme, dönem kilitleme ve dönem yönetimi.
   ======================================================================== */
import { pool, withTransaction } from "../config/database.js";
// findPeriod, pool veya transaction client'ı alabilir (her ikisi de .query() arayüzünü destekler)
import { toCamelCase } from "../utils/caseMapper.js";
import { getISOWeekKey, parseLocalDate, formatPeriodLabel } from "../utils/dateUtils.js";
import { createAuditLog, buildActor, truncateChanges } from "../utils/auditLogger.js";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, PAID_CODES, USER_ROLE } from "@timesheet/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { badRequest, forbidden, notFound, locked } from "../utils/AppError.js";
import { buildPagination } from "../utils/pagination.js";


// ======================== GET /timesheets ========================
export const getTimesheets = asyncHandler(async (req, res) => {
  const { role } = req.user;
  const { scope } = req;

  // Yetki Kontrolü: RESPONSIBLE sadece kendi birimine/yerleşkesine erişebilir
  if (role === USER_ROLE.RESPONSIBLE) {

    const { unitId, locationId } = req.query;
    if (
      (unitId && unitId !== req.user.unitId) ||
      (locationId && locationId !== req.user.locationId)
    ) {
      throw forbidden('Bu birim veya yerleşkeye erişim yetkiniz yok');
    }
  }

  const { month, year, status, search, page = 1, limit = 50 } = req.query;

  // Sayfalama (Pagination) ayarları: 1'den küçük sayfa ve 100'den büyük limit kabul edilmez
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  // Dönem Bilgisi: Ay/Yıl bazlı veya varsayılan aktif dönemi bulur
  const period = await findPeriod(pool, { month, year });


  if (!period) {
    return res.json({ success: true, data: { timesheets: [], pagination: buildPagination(pageNum, limitNum, 0) } });
  }
  // Durum Filtresi: Dönemin kilitli olup olmamasına göre boş sonuç döner
  if (status === "locked" && !period.is_locked) {
    return res.json({ success: true, data: { timesheets: [], pagination: buildPagination(pageNum, limitNum, 0) } });
  }
  if (status === "unlocked" && period.is_locked) {
    return res.json({ success: true, data: { timesheets: [], pagination: buildPagination(pageNum, limitNum, 0) } });
  }

  // Çalışan Sorgusu Filtreleri: Sadece aktif çalışanlar ve yetki alanındakiler
  const empConditions = ['e.is_active = true'];
  const empParams = [];
  let pi = 1;


  if (scope) {
    if (scope.unitId) { empConditions.push(`e.unit_id = $${pi++}`); empParams.push(scope.unitId); }
    if (scope.locationId) { empConditions.push(`u.location_id = $${pi++}`); empParams.push(scope.locationId); }
  }

  if (!scope && role === USER_ROLE.ADMIN) {
    const { unitId, locationId } = req.query;
    if (unitId) { empConditions.push(`e.unit_id = $${pi++}`); empParams.push(unitId); }
    if (locationId) { empConditions.push(`u.location_id = $${pi++}`); empParams.push(locationId); }
  }

  if (search) {
    // Arama: Ad, Soyad veya TC No üzerinden ILIKE (case-insensitive) ile filtreleme yapar
    empConditions.push(`(e.first_name ILIKE $${pi} OR e.last_name ILIKE $${pi} OR e.tc_no ILIKE $${pi})`);
    empParams.push(`%${search}%`);
    pi++;
  }

  const whereClause = "WHERE " + empConditions.join(" AND ");

  // Toplam kayıt sayısını bul (Pagination için gerekli)
  const countResult = await pool.query(
    `SELECT COUNT(*) AS total FROM app.employees e JOIN app.units u ON u.id = e.unit_id ${whereClause}`,
    empParams
  );

  const totalRecords = parseInt(countResult.rows[0].total, 10);

  const periodParamIdx = pi++;
  const limitParamIdx = pi++;
  const offsetParamIdx = pi++;
  const yearParamIdx = pi++;
  const monthParamIdx = pi++;
  const startDateParamIdx = pi++;
  const endDateParamIdx = pi++;
  const isLockedParamIdx = pi++;

  // Ana Veri Sorgusu: Çalışan bilgileri ve ilgili dönemdeki Puantaj (LEFT JOIN) kayıtlarını çeker
  const dataResult = await pool.query(
    `SELECT
      t.id              AS timesheet_id,
      t.created_at      AS timesheet_created_at,
      t.updated_at      AS timesheet_updated_at,
      e.id              AS employee_id,
      e.first_name, e.last_name, e.tc_no, e.iban_no,
      $${periodParamIdx}::uuid              AS period_id,
      $${yearParamIdx}::int                 AS year,
      $${monthParamIdx}::int                AS month,
      $${startDateParamIdx}::text           AS period_start_date,
      $${endDateParamIdx}::text             AS period_end_date,
      $${isLockedParamIdx}::boolean         AS is_locked,
      u.id AS unit_id, u.name AS unit_name,
      l.id AS location_id, l.name AS location_name, l.program_no
     FROM app.employees e
     JOIN app.units     u ON u.id = e.unit_id
     JOIN app.locations l ON l.id = u.location_id
     LEFT JOIN app.timesheets t ON t.employee_id = e.id AND t.period_id = $${periodParamIdx}::uuid
     ${whereClause}
     ORDER BY e.first_name, e.last_name
     LIMIT  $${limitParamIdx}
     OFFSET $${offsetParamIdx}`,
    [
      ...empParams,
      period.id,
      limitNum,
      offset,
      period.year,
      period.month,
      period.start_date,
      period.end_date,
      period.is_locked,
    ]
  );


  const timesheetIds = dataResult.rows.map((r) => r.timesheet_id).filter(Boolean);

  // Günlük Günlerin Alınması: Bulunan tüm puantajların (Timesheet) detaylı günlerini (Days) tek seferde çeker
  let daysMap = {};
  if (timesheetIds.length > 0) {
    const daysResult = await pool.query(
      `SELECT td.id, td.timesheet_id,
              TO_CHAR(td.day, 'YYYY-MM-DD') AS day,
              td.marker_code, td.note
       FROM app.timesheet_days td
       WHERE td.timesheet_id = ANY($1)
       ORDER BY td.day`,
      [timesheetIds],
    );
    // Veriyi Timesheet ID'sine göre grupla (O(N) erişim için)
    for (const d of daysResult.rows) {
      if (!daysMap[d.timesheet_id]) daysMap[d.timesheet_id] = [];
      const { timesheet_id, ...dayData } = d;
      daysMap[d.timesheet_id].push(toCamelCase(dayData));
    }
  }

  // Maaş Ayarları: Toplam ücret hesaplaması için mevcut günlük yevmiyeyi alır
  const settingsResult = await pool.query(`SELECT daily_wage FROM app.settings LIMIT 1`);
  const dailyWage = parseFloat(settingsResult.rows[0]?.daily_wage || 0);


  // Veri Transformasyonu: DB satırlarını Frontend uyumlu objelere dönüştürür
  const timesheets = dataResult.rows.map((row) => {
    const days = row.timesheet_id ? daysMap[row.timesheet_id] || [] : [];
    // Ücretli Gün Hesabı: PAID_CODES setinde bulunan marker'ları sayar
    const totalWorkDays = days.filter((d) => PAID_CODES.has(d.markerCode)).length;

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
        location: { id: row.location_id, name: row.location_name, program_no: row.program_no },
      },
      days,
      total_work_days: totalWorkDays,
      total_paid_amount: totalWorkDays * dailyWage, // Toplam tutar = Gün Sayısı * Yevmiye
      created_at: row.timesheet_created_at?.toISOString?.() ?? null,
      updated_at: row.timesheet_updated_at?.toISOString?.() ?? null,
    });
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
export const createOrUpdateTimesheets = asyncHandler(async (req, res) => {
  const { periodId, timesheets } = req.body;

  await withTransaction(async (client) => {
    const periodResult = await client.query(
      `SELECT id, year, month, start_date, end_date, is_locked FROM app.periods WHERE id = $1`,
      [periodId],
    );

    if (periodResult.rows.length === 0) throw badRequest('Geçersiz dönem');

    const period = periodResult.rows[0];

    if (period.is_locked) throw locked('Bu dönem kilitlenmiş. Puantaj girişi yapılamaz');

    // Çalışan Bilgilerini Çek: Yetki ve mevcudiyet kontrolü için
    const employeeIds = timesheets.map((t) => t.employeeId);
    const empInfoResult = await client.query(
      `SELECT e.id, e.unit_id, e.first_name, e.last_name, u.location_id
       FROM app.employees e
       JOIN app.units u ON u.id = e.unit_id
       WHERE e.id = ANY($1) AND e.is_active = true`,
      [employeeIds],
    );

    const employeeMap = new Map();
    for (const row of empInfoResult.rows) {
      employeeMap.set(row.id, {
        unitId: row.unit_id,
        locationId: row.location_id,
        firstName: row.first_name,
        lastName: row.last_name,
      });
    }


    const missingIds = employeeIds.filter((id) => !employeeMap.has(id));
    if (missingIds.length > 0) {
      throw badRequest(`Geçersiz çalışan ID'leri: ${missingIds.join(', ')}`);
    }

    const scope = req.scope;
    if (scope) {
      const unauthorizedEmps = empInfoResult.rows.filter(
        (r) => r.unit_id !== scope.unitId || (scope.locationId && r.location_id !== scope.locationId),
      );
      if (unauthorizedEmps.length > 0) throw forbidden('Bu çalışanlar üzerinde işlem yetkiniz yok');
    }

    const settingsResult = await client.query(`SELECT max_weekly_days FROM app.settings LIMIT 1`);
    const maxWeeklyDays = settingsResult.rows[0]?.max_weekly_days || 6;

    // Haftalık Çalışma Sınırı Kontrolü:
    // Dönem içindeki ISO haftalarını belirler ve her hafta için ücretli gün sayısını (PAID_CODES) sayar.
    const periodISOWeeks = [];

    const startDt = parseLocalDate(period.start_date);
    const endDt = parseLocalDate(period.end_date);
    
    if (startDt && endDt) {
      let curr = new Date(startDt);
      while (curr <= endDt) {
        const w = getISOWeekKey(curr);
        if (!periodISOWeeks.includes(w)) periodISOWeeks.push(w);
        curr.setDate(curr.getDate() + 1);
      }
    }
    periodISOWeeks.sort();

    // Haftalık Kural Kontrolü: Bir ISO haftası içinde girilen ücretli gün sayısı sınırı (maxWeeklyDays)
    for (const ts of timesheets) {
      const weekMap = {};
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
          const weekLabel = idx !== -1 ? `${idx + 1}. hafta` : weekKey.split("-W")[1] + ". hafta";
          
          throw badRequest(`${empName} için seçili dönemin ${weekLabel}sında ${count} ücretli gün girilmiş (maks: ${maxWeeklyDays})`);
        }
      }
    }


    const existingResult = await client.query(
      `SELECT id, employee_id FROM app.timesheets WHERE employee_id = ANY($1) AND period_id = $2`,
      [employeeIds, periodId],
    );

    const existingTimesheetMap = new Map();
    for (const row of existingResult.rows) {
      existingTimesheetMap.set(row.employee_id, row.id);
    }

    let totalDaysChanged = 0;
    const affectedEmployees = [];
    const allTimesheetIds = [];
    const allDayValues = [];
    const allDayParams = [];
    let dayParamIndex = 1;

    for (const ts of timesheets) {
      const emp = employeeMap.get(ts.employeeId);
      let timesheetId = existingTimesheetMap.get(ts.employeeId);

      if (timesheetId) {
        await client.query(`UPDATE app.timesheets SET updated_at = NOW() WHERE id = $1`, [timesheetId]);
      } else {
        const insertResult = await client.query(
          `INSERT INTO app.timesheets (employee_id, period_id, unit_id) VALUES ($1, $2, $3) RETURNING id`,
          [ts.employeeId, periodId, emp.unitId],
        );
        timesheetId = insertResult.rows[0].id;
      }

      allTimesheetIds.push(timesheetId);

      if (ts.days && ts.days.length > 0) {
        for (const dayEntry of ts.days) {
          allDayValues.push(`($${dayParamIndex++}, $${dayParamIndex++}, $${dayParamIndex++}, $${dayParamIndex++})`);
          allDayParams.push(timesheetId, dayEntry.day, dayEntry.markerCode, dayEntry.note || null);
        }
        totalDaysChanged += ts.days.length;
      }

      affectedEmployees.push({
        name: emp ? `${emp.firstName} ${emp.lastName}` : ts.employeeId,
        daysCount: ts.days?.length || 0,
      });
    }

    // Eski gün kayıtlarını temizle ve yenilerini toplu olarak ekle (Replace logic)
    if (allTimesheetIds.length > 0) {
      await client.query(`DELETE FROM app.timesheet_days WHERE timesheet_id = ANY($1)`, [allTimesheetIds]);
    }


    // Yeni gün detaylarını toplu olarak ekle (Performance için tek INSERT query)
    if (allDayValues.length > 0) {
      await client.query(
        `INSERT INTO app.timesheet_days (timesheet_id, day, marker_code, note) VALUES ${allDayValues.join(", ")}`,
        allDayParams,
      );
    }


    const periodLabel = formatPeriodLabel(period.year, period.month);
    const empCount = affectedEmployees.length;
    const allChanges = affectedEmployees.map((e) => `${e.name}: ${e.daysCount} gün güncellendi`);

    await createAuditLog(client, {
      action: AUDIT_ACTION.TIMESHEET_SAVE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.TIMESHEET,
      entityId: period.id,
      summary: `${periodLabel} dönemi — ${empCount} çalışan için toplam ${totalDaysChanged} gün güncellendi.`,
      changes: truncateChanges(allChanges, 50),
      metadata: {
        periodLabel,
        periodId: period.id,
        employeeCount: empCount,
        totalDaysChanged,
      },
    });

  });

  res.json({ success: true, message: "Puantaj kaydedildi" });
});

// ======================== PATCH /timesheets/:periodId/lock ========================
export const toggleLockPeriod = asyncHandler(async (req, res) => {
  const { periodId } = req.params;

  let newLockState;
  await withTransaction(async (client) => {
    const periodResult = await client.query(
      `SELECT id, year, month, is_locked FROM app.periods WHERE id = $1`,
      [periodId],
    );

    if (periodResult.rows.length === 0) throw notFound('Dönem bulunamadı');

    const period = periodResult.rows[0];
    // Mevcut durumun tersine çevir (Lock ise Unlock, Unlock ise Lock)
    newLockState = !period.is_locked;

    await client.query(`UPDATE app.periods SET is_locked = $1 WHERE id = $2`, [newLockState, periodId]);


    const periodLabel = formatPeriodLabel(period.year, period.month);
    await createAuditLog(client, {
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
    message: newLockState ? "Dönem kilitlendi" : "Dönem kilidi açıldı",
    data: { isLocked: newLockState },
  });
});

// ======================== GET /timesheets/periods ========================
export const getPeriods = asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `${PERIOD_SELECT} WHERE is_deleted = false ORDER BY year DESC, month DESC`,
  );

  res.json({ success: true, data: { periods: rows } });
});

// ======================== YARDIMCI FONKSİYONLAR ========================

const PERIOD_SELECT = `
  SELECT id, year, month,
         TO_CHAR(start_date,'YYYY-MM-DD') AS start_date,
         TO_CHAR(end_date,  'YYYY-MM-DD') AS end_date,
         is_locked
  FROM app.periods`;

// findPeriod: Verilen parametrelere göre en uygun dönemi döndüren yardımcı fonksiyon
async function findPeriod(db, { month, year }) {
  // 1. Belirli bir ay seçilmişse (örn: '2026-04')
  if (month) {
    const [y, m] = month.split("-");
    const { rows } = await db.query(
      `${PERIOD_SELECT} WHERE year = $1 AND month = $2 AND is_deleted = false LIMIT 1`,
      [parseInt(y, 10), parseInt(m, 10)],
    );
    return rows[0] || null;
  }

  // 2. Sadece yıl seçilmişse, o yılın en son ayını getirir
  if (year) {
    const { rows } = await db.query(
      `${PERIOD_SELECT} WHERE year = $1 AND is_deleted = false ORDER BY month DESC LIMIT 1`,
      [parseInt(year, 10)],
    );
    return rows[0] || null;
  }

  // 3. Hiçbir parametre yoksa, sistemdeki en son aktif dönemi getirir
  const { rows } = await db.query(
    `${PERIOD_SELECT} WHERE is_deleted = false ORDER BY year DESC, month DESC LIMIT 1`,
  );
  return rows[0] || null;
}

