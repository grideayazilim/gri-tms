/* ========================================================================
   USER CONTROLLER (KULLANICI YÖNETİMİ)
   Kullanıcı listeleme, güncelleme, silme ve profil işlemlerini yönetir.
   ======================================================================== */
import bcrypt from "bcrypt";
import { pool, withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog, buildActor, diffEntityWithLookups } from "../utils/auditLogger.js";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_STATUS, USER_ROLE } from "@timesheet/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { notFound, conflict } from "../utils/AppError.js";
import { buildPagination } from "../utils/pagination.js";


export const getUsers = asyncHandler(async (req, res) => {
  const { role, status, unitId, locationId, search, page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const offset = (pageNum - 1) * limitNum;

  let queryStr = `
    SELECT
      u.id, u.username, u.role, u.status,
      u.expiry_date,
      u.created_at,
      un.id AS unit_id, un.name AS unit_name,
      l.id AS location_id, l.name AS location_name
    FROM app.users u
    LEFT JOIN app.units un ON u.unit_id = un.id
    LEFT JOIN app.locations l ON u.location_id = l.id
    WHERE 1=1
  `;
  // Dinamik Query Oluşturma: Filtrelere göre WHERE koşullarını ekler
  const queryParams = [];
  let paramCount = 1;


  if (role) { queryStr += ` AND u.role = $${paramCount++}`; queryParams.push(role); }
  if (status) { queryStr += ` AND u.status = $${paramCount++}`; queryParams.push(status); }
  if (unitId) { queryStr += ` AND u.unit_id = $${paramCount++}`; queryParams.push(unitId); }
  if (locationId) { queryStr += ` AND u.location_id = $${paramCount++}`; queryParams.push(locationId); }
  if (search) { queryStr += ` AND u.username ILIKE $${paramCount++}`; queryParams.push(`%${search}%`); }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM (${queryStr}) as total`,
    queryParams
  );
  const totalCount = parseInt(countResult.rows[0].count, 10);

  queryStr += ` ORDER BY u.username ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  queryParams.push(limitNum, offset);

  const dataResult = await pool.query(queryStr, queryParams);

  const users = dataResult.rows.map(row => toCamelCase({
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    expiry_date: row.expiry_date,
    created_at: row.created_at,
    unit: (row.unit_id || row.location_id) ? {
      id: row.unit_id || null,
      name: row.unit_name || null,
      location: row.location_id ? { id: row.location_id, name: row.location_name } : null,
    } : null,
  }));

  res.json({
    success: true,
    data: {
      users,
      pagination: buildPagination(pageNum, limitNum, totalCount),
    },
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role, status, unitId, locationId, expiryDate } = req.body;

  const result = await withTransaction(async (client) => {
    const userCheck = await client.query('SELECT * FROM app.users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) return null;

    const existingUser = userCheck.rows[0];

    const newRole = role !== undefined ? role : existingUser.role;
    const newUnitId = unitId !== undefined ? unitId : existingUser.unit_id;
    const newLocationId = locationId !== undefined ? locationId : existingUser.location_id;
    let newExpiryDate = expiryDate !== undefined ? expiryDate : existingUser.expiry_date;
    let newStatus = status !== undefined ? status : existingUser.status;

    if (newRole === USER_ROLE.ADMIN) newExpiryDate = null;

    // Otomatik Durum (Status) Geçişleri:
    // 1. Expiry Date geçmişse durumu EXPIRED yap.
    // 2. Durum EXPIRED ise ama yeni bir gelecek tarih seçilmişse durumu ACTIVE'e çek.
    if (newExpiryDate && new Date(newExpiryDate) < new Date()) {
      newStatus = USER_STATUS.EXPIRED;
    } else if (newStatus === USER_STATUS.EXPIRED && (!newExpiryDate || new Date(newExpiryDate) >= new Date())) {
      newStatus = USER_STATUS.ACTIVE;
    }


    const updateResult = await client.query(
      `UPDATE app.users
       SET role = $1, status = $2, unit_id = $3, location_id = $4, expiry_date = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [newRole, newStatus, newUnitId, newLocationId, newExpiryDate, userId]
    );

    const newUser = updateResult.rows[0];

    // Audit Log Lookup: UUID olan Birim/Yerleşke ID'lerini isimlere çevirerek logda okunabilir kılar.
    const idLookup = { unit_id: {}, location_id: {} };
    if (existingUser.unit_id !== newUser.unit_id) {
      const ids = [existingUser.unit_id, newUser.unit_id].filter(Boolean);
      if (ids.length > 0) {
        const res = await client.query('SELECT id, name FROM app.units WHERE id = ANY($1)', [ids]);
        res.rows.forEach(u => { idLookup.unit_id[u.id] = u.name; });
      }
    }
    if (existingUser.location_id !== newUser.location_id) {
      const ids = [existingUser.location_id, newUser.location_id].filter(Boolean);
      if (ids.length > 0) {
        const res = await client.query('SELECT id, name FROM app.locations WHERE id = ANY($1)', [ids]);
        res.rows.forEach(l => { idLookup.location_id[l.id] = l.name; });
      }
    }

    const changes = diffEntityWithLookups(AUDIT_ENTITY_TYPE.USER, existingUser, newUser, idLookup);

    await createAuditLog(client, {
      action: AUDIT_ACTION.USER_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      summary: changes.length > 0
        ? `${existingUser.username} adlı kullanıcı güncellendi (${changes.length} alan değişti).`
        : `${existingUser.username} adlı kullanıcı güncellendi.`,
      changes,
    });

    return updateResult;
  });

  if (!result) throw notFound('Kullanıcı bulunamadı.');

  res.json({ success: true, data: toCamelCase(result.rows[0]) });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const result = await withTransaction(async (client) => {
    const oldRes = await client.query('SELECT * FROM app.users WHERE id = $1', [userId]);
    const { rows, rowCount } = await client.query(
      'DELETE FROM app.users WHERE id = $1 RETURNING id, username',
      [userId]
    );

    if (rowCount === 0) return null;

    const oldUser = oldRes.rows[0];
    await createAuditLog(client, {
      action: AUDIT_ACTION.USER_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.USER,
      entityId: userId,
      summary: `${rows[0].username} adlı kullanıcı silindi.`,
      metadata: oldUser ? {
        role: oldUser.role,
        status: oldUser.status,
        unitId: oldUser.unit_id || null,
        locationId: oldUser.location_id || null,
      } : {},
    });

    return rows[0];
  });

  if (!result) throw notFound('Silinecek kullanıcı bulunamadı.');

  res.json({ success: true, message: 'Kullanıcı başarıyla silindi.' });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { username, newPassword } = req.body;

  let updatedUser;
  let usernameChanged = false;
  let oldUsername = null;
  let passwordChanged = false;

  try {
    updatedUser = await withTransaction(async (client) => {
      const currUser = await client.query(
        'SELECT id, username, password_hash FROM app.users WHERE id = $1',
        [userId]
      );

      if (currUser.rows.length === 0) throw notFound('Kullanıcı bulunamadı.');

      const user = currUser.rows[0];
      oldUsername = user.username;
      const newPasswordHash = newPassword
        ? await bcrypt.hash(newPassword, 10)
        : user.password_hash;
      passwordChanged = !!newPassword;
      usernameChanged = !!username && username !== user.username;

      const updateResult = await client.query(
        `UPDATE app.users
         SET
           username = COALESCE($1, username),
           password_hash = $2,
           updated_at = NOW()
         WHERE id = $3
         RETURNING id, username, role, status, unit_id, location_id, created_at, updated_at`,
        [username || null, newPasswordHash, userId]
      );

      const newUser = updateResult.rows[0];
      const actor = { username: oldUsername, role: req.user.role };

      if (usernameChanged) {
        await createAuditLog(client, {
          action: AUDIT_ACTION.USER_PROFILE_UPDATE,
          actor,
          entityType: AUDIT_ENTITY_TYPE.USER,
          entityId: userId,
          summary: `${oldUsername} kullanıcı adını "${newUser.username}" olarak değiştirdi.`,
          changes: [`Kullanıcı Adı: ${oldUsername} → ${newUser.username}`],
        });
      }

      if (passwordChanged) {
        await createAuditLog(client, {
          action: AUDIT_ACTION.USER_PASSWORD_CHANGE,
          actor: { username: newUser.username, role: req.user.role },
          entityType: AUDIT_ENTITY_TYPE.USER,
          entityId: userId,
          summary: `${newUser.username} kendi şifresini değiştirdi.`,
        });
      }

      return newUser;
    });
  } catch (err) {
    if (err.code === '23505') throw conflict('Bu kullanıcı adı zaten kullanımda.');
    throw err;
  }

  res.json({
    success: true,
    data: toCamelCase(updatedUser),
    message: 'Profil başarıyla güncellendi.'
  });
});
