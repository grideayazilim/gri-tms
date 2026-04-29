/* ========================================================================
   SETTINGS CONTROLLER (SİSTEM AYARLARI VE ONAY MEKANİZMASI)
   Sistem genel ayarları, dönem yönetimi ve bekleyen kullanıcı onayları.
   ======================================================================== */
import { withTransaction, pool } from '../config/database.js';
import { toCamelCase } from '../utils/caseMapper.js';
import { createAuditLog, buildActor, diffEntity } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_ROLE, USER_STATUS } from '@timesheet/shared';
import { toISODateString, parseLocalDate, startOfMonth, endOfMonth, eachMonthOfInterval } from '../utils/dateUtils.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound } from '../utils/AppError.js';

const SETTINGS_ID = 1; // Sistem ayarları tablosunda her zaman tek bir satır (ID=1) bulunur


// --- PENDING USERS ---

export const getPendingUsers = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT u.id, u.username, u.role, u.status, u.created_at, u.last_login_at,
            l.name as location_name, un.name as unit_name
     FROM app.users u
     LEFT JOIN app.locations l ON u.location_id = l.id
     LEFT JOIN app.units un ON u.unit_id = un.id
     WHERE u.status = $1
     ORDER BY u.created_at DESC`,
    [USER_STATUS.PENDING]
  );

  res.json({ success: true, data: { users: result.rows.map(toCamelCase) } });
});

export const approvePendingUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await withTransaction(async (client) => {
    const updateRes = await client.query(
      `UPDATE app.users
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND status = $3
       RETURNING *`,
      [USER_STATUS.ACTIVE, id, USER_STATUS.PENDING]
    );

    if (updateRes.rowCount > 0) {
      await createAuditLog(client, {
        action: AUDIT_ACTION.USER_APPROVE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: id,
        summary: `${updateRes.rows[0].username} adlı kullanıcı onaylandı.`,
        metadata: {
          role: updateRes.rows[0].role,
          unitId: updateRes.rows[0].unit_id || null,
          locationId: updateRes.rows[0].location_id || null,
        },
      });
    }
    return updateRes;
  });

  if (result.rowCount === 0) throw notFound('Onay bekleyen kullanıcı bulunamadı');

  res.json({ success: true, message: 'Kullanıcı onaylandı' });
});

export const rejectPendingUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await withTransaction(async (client) => {
    const deleteRes = await client.query(
      `DELETE FROM app.users
       WHERE id = $1 AND status = $2
       RETURNING *`,
      [id, USER_STATUS.PENDING]
    );

    if (deleteRes.rowCount > 0) {
      await createAuditLog(client, {
        action: AUDIT_ACTION.USER_REJECT,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.USER,
        entityId: id,
        summary: `${deleteRes.rows[0].username} adlı bekleyen kullanıcı reddedildi ve silindi.`,
        metadata: {
          role: deleteRes.rows[0].role,
          unitId: deleteRes.rows[0].unit_id || null,
          locationId: deleteRes.rows[0].location_id || null,
        },
      });
    }
    return deleteRes;
  });

  if (result.rowCount === 0) throw notFound('Onay bekleyen kullanıcı bulunamadı');

  res.json({ success: true, message: 'Kullanıcı reddedildi ve silindi' });
});

// --- SYSTEM SETTINGS ---

export const getSystemSettings = asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT id, daily_wage, max_weekly_days, program_start_date, program_end_date, updated_at
     FROM app.settings LIMIT 1`
  );

  const settings = result.rows[0];
  if (!settings) {
    return res.json({ success: true, data: { settings: {} } });
  }

  res.json({
    success: true,
    data: {
      settings: toCamelCase({
        daily_allowance: settings.daily_wage,
        weekly_limit: settings.max_weekly_days,
        program_start: toISODateString(settings.program_start_date),
        program_end: toISODateString(settings.program_end_date)
      })
    }
  });
});

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const { dailyAllowance, weeklyLimit, programStart, programEnd } = req.body;
  const dailyAllowanceFloat = dailyAllowance !== undefined && dailyAllowance !== '' ? parseFloat(dailyAllowance) : null;

  await withTransaction(async (client) => {
    const currentRes = await client.query(
      `SELECT id, daily_wage, max_weekly_days, program_start_date, program_end_date, updated_at
       FROM app.settings LIMIT 1`
    );
    const current = currentRes.rows[0];

    const formatDate = (d) => toISODateString(d ?? null);

    const newStart = formatDate(programStart);
    const newEnd = formatDate(programEnd);
    const oldStart = formatDate(current?.program_start_date);
    const oldEnd = formatDate(current?.program_end_date);

    const dateChanged = (newStart !== oldStart) || (newEnd !== oldEnd);


    let updatedSettings;

    if (current) {
      const updateRes = await client.query(
        `UPDATE app.settings
         SET daily_wage = $1, max_weekly_days = $2, program_start_date = $3, program_end_date = $4, updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [dailyAllowanceFloat, weeklyLimit, newStart, newEnd, current.id]
      );
      updatedSettings = updateRes.rows[0];
    } else {
      const insertRes = await client.query(
        `INSERT INTO app.settings (id, daily_wage, max_weekly_days, program_start_date, program_end_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [SETTINGS_ID, dailyAllowanceFloat, weeklyLimit, newStart, newEnd]
      );
      updatedSettings = insertRes.rows[0];
    }

    if (dateChanged) {
      if (newStart && newEnd) {
        const parsedStart = parseLocalDate(newStart);
        const parsedEnd = parseLocalDate(newEnd);

        // 1. Yeni sınırların dışındaki tüm dönemleri sil (is_deleted = true)
        await client.query(
          `UPDATE app.periods SET is_deleted = true WHERE start_date < $1 OR end_date > $2`,
          [newStart, newEnd]
        );

        // 2. Yeni tarih aralığındaki tüm ayları hesapla
        const months = eachMonthOfInterval({ start: parsedStart, end: parsedEnd });


        for (const monthDate of months) {
          const y = monthDate.getFullYear();
          const m = monthDate.getMonth() + 1;

          // Ayın başlangıcı: Eğer programın ilk ayıysa, program başlangıç tarihini baz al
          const periodStart = (y === parsedStart.getFullYear() && m === parsedStart.getMonth() + 1)
            ? parsedStart
            : startOfMonth(monthDate);

          // Ayın bitişi: Eğer programın son ayıysa, program bitiş tarihini baz al
          const periodEnd = (y === parsedEnd.getFullYear() && m === parsedEnd.getMonth() + 1)
            ? parsedEnd
            : endOfMonth(monthDate);

          // Dönemi oluştur veya varsa tarihlerini güncelle (Upsert)
          await client.query(
            `INSERT INTO app.periods (year, month, start_date, end_date, is_deleted)
             VALUES ($1, $2, $3, $4, false)
             ON CONFLICT (year, month) DO UPDATE
             SET start_date = EXCLUDED.start_date,
                 end_date = EXCLUDED.end_date,
                 is_deleted = false`,
            [y, m, toISODateString(periodStart), toISODateString(periodEnd)]
          );
        }

      } else {
        await client.query(`UPDATE app.periods SET is_deleted = true`);
      }

      if (newEnd && newEnd !== oldEnd) {
        // Otomatik Süre Uzatma: Program bitiş tarihi değiştiyse, tüm sorumluların (non-admin) 
        // expiry_date bilgilerini "Bitiş + 20 gün" kuralına göre toplu olarak günceller.
        await client.query(
          `UPDATE app.users
           SET expiry_date = $1::date + INTERVAL '20 days'
           WHERE role != $2`,
          [newEnd, USER_ROLE.ADMIN]
        );
      }
    }


    const changes = diffEntity(AUDIT_ENTITY_TYPE.SETTINGS, current || {}, updatedSettings);

    await createAuditLog(client, {
      action: AUDIT_ACTION.SETTINGS_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.SETTINGS,
      entityId: null, // Settings singleton'ı integer ID taşır, audit_logs UUID bekler
      summary: changes.length > 0
        ? `Sistem ayarları güncellendi (${changes.length} alan değişti).`
        : 'Sistem ayarları güncellendi.',
      changes,
      metadata: dateChanged ? { periodsRegenerated: true } : {},
    });
  });

  res.json({ success: true, message: 'Sistem ayarları güncellendi' });
});
