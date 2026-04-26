import { pool, withTransaction } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog, buildActor, diffEntityWithLookups } from "../utils/auditLogger.js";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "@timesheet/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { notFound, conflict } from "../utils/AppError.js";
import { buildPagination } from "../utils/pagination.js";

async function getUnitWithLocation(client, unitId) {
  const { rows } = await client.query(
    `SELECT u.id, u.name, l.id AS location_id, l.name AS location_name
     FROM app.units u JOIN app.locations l ON u.location_id = l.id
     WHERE u.id = $1`,
    [unitId]
  );
  return rows[0];
}

function buildEmployeeResponse(row, unit) {
  return toCamelCase({
    id: row.id,
    tc_no: row.tc_no,
    first_name: row.first_name,
    last_name: row.last_name,
    iban_no: row.iban_no,
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    unit: {
      id: unit.id,
      name: unit.name,
      location: { id: unit.location_id, name: unit.location_name },
    },
  });
}

export const getEmployees = asyncHandler(async (req, res) => {
  const { unitId, locationId, search, status, page = 1, limit = 50 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  const params = [];

  if (unitId) {
    params.push(unitId);
    conditions.push(`e.unit_id = $${params.length}`);
  }
  if (locationId) {
    params.push(locationId);
    conditions.push(`u.location_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(
      e.first_name ILIKE $${params.length} OR
      e.last_name ILIKE $${params.length} OR
      e.tc_no ILIKE $${params.length}
    )`);
  }
  if (status === "active") conditions.push(`e.is_active = true`);
  else if (status === "inactive") conditions.push(`e.is_active = false`);

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM app.employees e JOIN app.units u ON e.unit_id = u.id ${whereClause}`,
    params
  );
  const totalRecords = parseInt(countResult.rows[0].count, 10);

  const dataResult = await pool.query(
    `SELECT
      e.id, e.tc_no, e.first_name, e.last_name, e.iban_no,
      e.start_date, e.end_date, e.created_at, e.updated_at, e.is_active,
      u.id AS unit_id, u.name AS unit_name,
      l.id AS location_id, l.name AS location_name
     FROM app.employees e
     JOIN app.units u ON e.unit_id = u.id
     JOIN app.locations l ON u.location_id = l.id
     ${whereClause}
     ORDER BY e.first_name, e.last_name
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  );

  const employees = dataResult.rows.map((row) => toCamelCase({
    id: row.id,
    tc_no: row.tc_no,
    first_name: row.first_name,
    last_name: row.last_name,
    iban_no: row.iban_no,
    start_date: row.start_date,
    end_date: row.end_date,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    unit: {
      id: row.unit_id,
      name: row.unit_name,
      location: { id: row.location_id, name: row.location_name },
    },
  }));

  res.json({
    success: true,
    data: {
      employees,
      pagination: buildPagination(pageNum, limitNum, totalRecords),
    },
  });
});

export const createEmployee = asyncHandler(async (req, res) => {
  const { tcNo, firstName, lastName, ibanNo, unitId, startDate, endDate } =
    req.body;

  let result;
  try {
    result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO app.employees (tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date, is_active, created_at, updated_at`,
        [
          tcNo, firstName, lastName, ibanNo || null, unitId,
          startDate, endDate || null,
          req.body.isActive !== undefined ? req.body.isActive : true,
        ]
      );

      const unit = await getUnitWithLocation(client, unitId);

      await createAuditLog(client, {
        action: AUDIT_ACTION.EMPLOYEE_CREATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
        entityId: rows[0].id,
        summary: `${firstName} ${lastName} adlı çalışan eklendi.`,
        metadata: {
          tcNo: rows[0].tc_no,
          unitName: unit?.name || null,
          locationName: unit?.location_name || null,
        },
      });

      return { employee: rows[0], unit };
    });
  } catch (err) {
    if (err.code === "23505") throw conflict("Bu TC No zaten kayıtlı");
    throw err;
  }

  res.status(201).json({
    success: true,
    data: { employee: buildEmployeeResponse(result.employee, result.unit) },
  });
});

export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tcNo, firstName, lastName, ibanNo, unitId, startDate, endDate } =
    req.body;

  let result;
  try {
    result = await withTransaction(async (client) => {
      const oldRes = await client.query(
        'SELECT * FROM app.employees WHERE id = $1',
        [id]
      );

      const { rows } = await client.query(
        `UPDATE app.employees
         SET
           tc_no      = COALESCE($1, tc_no),
           first_name = COALESCE($2, first_name),
           last_name  = COALESCE($3, last_name),
           iban_no    = COALESCE($4, iban_no),
           unit_id    = COALESCE($5, unit_id),
           start_date = COALESCE($6, start_date),
           end_date   = $7,
           is_active  = COALESCE($8, is_active),
           updated_at = NOW()
         WHERE id = $9
         RETURNING id, tc_no, first_name, last_name, iban_no, unit_id, start_date, end_date, is_active, created_at, updated_at`,
        [
          tcNo || null, firstName || null, lastName || null,
          ibanNo !== undefined ? ibanNo : null,
          unitId || null, startDate || null, endDate || null,
          req.body.isActive !== undefined ? req.body.isActive : null,
          id,
        ]
      );

      if (rows.length === 0) return null;

      const unit = await getUnitWithLocation(client, rows[0].unit_id);

      const oldRow = oldRes.rows[0] || null;
      const newRow = rows[0];
      const fullName = `${newRow.first_name} ${newRow.last_name}`;

      const unitLookup = {};
      if (oldRow?.unit_id !== newRow.unit_id) {
        const ids = [oldRow?.unit_id, newRow.unit_id].filter(Boolean);
        if (ids.length > 0) {
          const unitRes = await client.query('SELECT id, name FROM app.units WHERE id = ANY($1)', [ids]);
          unitRes.rows.forEach(u => { unitLookup[u.id] = u.name; });
        }
      }
      const changes = diffEntityWithLookups(AUDIT_ENTITY_TYPE.EMPLOYEE, oldRow, newRow, { unit_id: unitLookup });

      await createAuditLog(client, {
        action: AUDIT_ACTION.EMPLOYEE_UPDATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
        entityId: id,
        summary: changes.length > 0
          ? `${fullName} adlı çalışan güncellendi (${changes.length} alan değişti).`
          : `${fullName} adlı çalışan güncellendi.`,
        changes,
        metadata: {
          unitName: unit?.name || null,
          locationName: unit?.location_name || null,
        },
      });

      return { employee: rows[0], unit };
    });
  } catch (err) {
    if (err.code === "23505") throw conflict("Bu TC No zaten kayıtlı");
    throw err;
  }

  if (!result) throw notFound('Çalışan bulunamadı');

  res.json({
    success: true,
    data: { employee: buildEmployeeResponse(result.employee, result.unit) },
  });
});

export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await withTransaction(async (client) => {
    const oldRes = await client.query(
      'SELECT * FROM app.employees WHERE id = $1',
      [id]
    );
    const { rows } = await client.query(
      "DELETE FROM app.employees WHERE id = $1 RETURNING id, first_name, last_name",
      [id]
    );

    if (rows.length === 0) return null;

    const oldRow = oldRes.rows[0] || null;
    const fullName = `${rows[0].first_name} ${rows[0].last_name}`;

    await createAuditLog(client, {
      action: AUDIT_ACTION.EMPLOYEE_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.EMPLOYEE,
      entityId: id,
      summary: `${fullName} adlı çalışan silindi.`,
      metadata: oldRow ? {
        tcNo: oldRow.tc_no,
        unitId: oldRow.unit_id,
      } : {},
    });

    return rows[0];
  });

  if (!result) throw notFound('Çalışan bulunamadı');

  res.json({ success: true, message: "Çalışan başarıyla silindi" });
});
