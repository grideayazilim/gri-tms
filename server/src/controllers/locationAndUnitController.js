/* ========================================================================
   LOCATION & UNIT CONTROLLER (YERLEŞKE VE BİRİM YÖNETİMİ)
   Yerleşke ve Birimlerin oluşturulması, güncellenmesi ve senkronizasyonu.
   ======================================================================== */
import { withTransaction, pool } from "../config/database.js";
import { toCamelCase } from "../utils/caseMapper.js";
import { createAuditLog, buildActor, diffEntity, diffEntityWithLookups } from "../utils/auditLogger.js";
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from "@timesheet/shared";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { notFound, badRequest } from "../utils/AppError.js";


// ==================== OKUMA (GET) İŞLEMLERİ ====================

export const getLocations = asyncHandler(async (req, res) => {
  // Tarihleri UTC formatında ve Frontend'in beklediği ISO string yapısında getirir
  const result = await pool.query(
    `SELECT
      id, name, program_no,
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
     FROM app.locations
     ORDER BY name`
  );


  res.json({ success: true, data: { locations: toCamelCase(result.rows) } });
});

export const getUnits = asyncHandler(async (req, res) => {
  // Birime bağlı aktif/pasif tüm çalışanların sayısını hesaplar
  const result = await pool.query(
    `SELECT
      u.id, u.location_id, u.name,
      COUNT(e.id)::int AS employee_count,
      to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      to_char(u.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
     FROM app.units u
     LEFT JOIN app.employees e ON u.id = e.unit_id
     GROUP BY u.id
     ORDER BY u.name`
  );


  res.json({ success: true, data: { units: toCamelCase(result.rows) } });
});

export const getUnitsByLocation = asyncHandler(async (req, res) => {
  const { locationId } = req.params;

  const result = await pool.query(
    `SELECT
      u.id, u.location_id, u.name,
      COUNT(e.id)::int AS employee_count,
      to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
      to_char(u.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at
     FROM app.units u
     LEFT JOIN app.employees e ON u.id = e.unit_id
     WHERE u.location_id = $1
     GROUP BY u.id
     ORDER BY u.name`,
    [locationId]
  );

  res.json({ success: true, data: { units: toCamelCase(result.rows) } });
});

// ==================== YAZMA (POST) İŞLEMLERİ ====================

export const createLocation = asyncHandler(async (req, res) => {
  const { name, programNo } = req.body;

  let result;
  try {
    result = await withTransaction(async (client) => {
      const insertResult = await client.query(
        `INSERT INTO app.locations (name, program_no)
         VALUES ($1, $2)
         RETURNING id, name, program_no,
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
        [name, programNo]
      );

      const newLocation = insertResult.rows[0];

      await createAuditLog(client, {
        action: AUDIT_ACTION.LOCATION_CREATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.LOCATION,
        entityId: newLocation.id,
        summary: `${name} adlı yeni yerleşke oluşturuldu.`,
        metadata: { programNo: newLocation.program_no || null },
      });

      return newLocation;
    });
  } catch (err) {
    if (err.code === '23505') throw badRequest('Program no (veya yerleşke adı) sistemde zaten kayıtlı. Lütfen eşsiz bir değer giriniz.');
    throw err;
  }

  res.status(201).json({ success: true, data: { location: toCamelCase(result) } });
});

export const createUnit = asyncHandler(async (req, res) => {
  const { locationId, name } = req.body;

  const result = await withTransaction(async (client) => {
    const locCheck = await client.query('SELECT id FROM app.locations WHERE id = $1', [locationId]);
    if (locCheck.rows.length === 0) throw notFound('Belirtilen yerleşke bulunamadı.');

    const insertResult = await client.query(
      `INSERT INTO app.units (location_id, name)
       VALUES ($1, $2)
       RETURNING id, location_id, name,
       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
       to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
      [locationId, name]
    );

    const newUnit = insertResult.rows[0];

    // Audit Log için Yerleşke adını al (Kullanıcı dostu log mesajı için)
    const locName = await client.query('SELECT name FROM app.locations WHERE id = $1', [locationId]);


    await createAuditLog(client, {
      action: AUDIT_ACTION.UNIT_CREATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.UNIT,
      entityId: newUnit.id,
      summary: `${locName.rows[0]?.name || ''} yerleşkesinde "${name}" adlı yeni birim oluşturuldu.`,
      metadata: { locationId, locationName: locName.rows[0]?.name || null },
    });

    return newUnit;
  });

  res.status(201).json({ success: true, data: { unit: toCamelCase(result) } });
});

// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

export const updateLocation = asyncHandler(async (req, res) => {
  const { locationId } = req.params;
  const { name, programNo } = req.body;

  let result;
  try {
    result = await withTransaction(async (client) => {
      const oldResult = await client.query('SELECT * FROM app.locations WHERE id = $1', [locationId]);
      if (oldResult.rows.length === 0) throw notFound('Yerleşke bulunamadı.');

      const updateResult = await client.query(
        `UPDATE app.locations
         SET name = $1, program_no = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, program_no,
         to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
         to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
        [name, programNo, locationId]
      );

      const updatedLocation = updateResult.rows[0];

      const oldRow = oldResult.rows[0];
      const changes = diffEntity(AUDIT_ENTITY_TYPE.LOCATION, oldRow, updatedLocation);

      await createAuditLog(client, {
        action: AUDIT_ACTION.LOCATION_UPDATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.LOCATION,
        entityId: locationId,
        summary: changes.length > 0
          ? `${updatedLocation.name} adlı yerleşke güncellendi (${changes.length} alan değişti).`
          : `${updatedLocation.name} adlı yerleşke güncellendi.`,
        changes,
      });

      return updatedLocation;
    });
  } catch (err) {
    if (err.code === '23505') throw badRequest('Program no (veya yerleşke adı) sistemde zaten kayıtlı. Lütfen eşsiz bir değer giriniz.');
    throw err;
  }

  res.json({ success: true, data: { location: toCamelCase(result) } });
});

export const updateUnit = asyncHandler(async (req, res) => {
  const { unitId } = req.params;
  const { locationId, name } = req.body;

  const result = await withTransaction(async (client) => {
    const oldResult = await client.query('SELECT * FROM app.units WHERE id = $1', [unitId]);
    if (oldResult.rows.length === 0) throw notFound('Birim bulunamadı.');

    const locCheck = await client.query('SELECT id FROM app.locations WHERE id = $1', [locationId]);
    if (locCheck.rows.length === 0) throw notFound('Belirtilen yerleşke bulunamadı.');

    const updateResult = await client.query(
      `UPDATE app.units
       SET location_id = $1, name = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, location_id, name,
       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at,
       to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as updated_at`,
      [locationId, name, unitId]
    );

    const updatedUnit = updateResult.rows[0];

    const oldRow = oldResult.rows[0];

    const locationLookup = {};
    if (oldRow.location_id !== updatedUnit.location_id) {
      // Birim başka bir yerleşkeye transfer edildiyse, eski ve yeni yerleşke isimlerini log için al
      const ids = [oldRow.location_id, updatedUnit.location_id].filter(Boolean);
      const locRes = await client.query('SELECT id, name FROM app.locations WHERE id = ANY($1)', [ids]);
      locRes.rows.forEach(l => { locationLookup[l.id] = l.name; });
    }
    const changes = diffEntityWithLookups(AUDIT_ENTITY_TYPE.UNIT, oldRow, updatedUnit, { location_id: locationLookup });


    await createAuditLog(client, {
      action: AUDIT_ACTION.UNIT_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.UNIT,
      entityId: unitId,
      summary: changes.length > 0
        ? `${updatedUnit.name} adlı birim güncellendi (${changes.length} alan değişti).`
        : `${updatedUnit.name} adlı birim güncellendi.`,
      changes,
    });

    return updatedUnit;
  });

  res.json({ success: true, data: { unit: toCamelCase(result) } });
});

export const syncLocationWithUnits = asyncHandler(async (req, res) => {
  const { locationId } = req.params;
  const { name, programNo, units } = req.body;

  let result;
  try {
    result = await withTransaction(async (client) => {
      // Fetch existing data before any changes for accurate diffing
      const oldLocRes = await client.query('SELECT * FROM app.locations WHERE id = $1', [locationId]);
      if (oldLocRes.rows.length === 0) throw notFound('Yerleşke bulunamadı.');
      const oldLoc = oldLocRes.rows[0];

      const oldUnitsRes = await client.query(
        'SELECT id, name FROM app.units WHERE location_id = $1',
        [locationId]
      );
      const oldUnits = oldUnitsRes.rows;
      const dbUnitIds = oldUnits.map(u => u.id); // Mevcut Birim ID'leri (Silinecekleri bulmak için)

      // 1. Yerleşke bilgilerini güncelle
      await client.query(
        `UPDATE app.locations SET name = $1, program_no = $2, updated_at = NOW() WHERE id = $3`,
        [name, programNo, locationId]
      );

      const renamedUnits = [];
      const processedUnitIds = [];
      const addedUnits = [];

      // 2. Birimleri İşle (Ekle veya Güncelle)
      for (const unit of units) {
        if (!unit.name || !unit.name.trim()) throw badRequest('Birim adı boş bırakılamaz.');

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(unit.id);

        if (isUuid && dbUnitIds.includes(unit.id)) {
          // Birim zaten varsa: İsmi değiştiyse log listesine ekle ve UPDATE et
          const oldUnit = oldUnits.find(u => u.id === unit.id);
          if (oldUnit && oldUnit.name !== unit.name) {
            renamedUnits.push({ old: oldUnit.name, new: unit.name });
          }
          await client.query(
            'UPDATE app.units SET name = $1, updated_at = NOW() WHERE id = $2 AND location_id = $3',
            [unit.name, unit.id, locationId]
          );
          processedUnitIds.push(unit.id);
        } else {
          // Birim yeniyse (id geçersizse veya listede yoksa): INSERT et
          const insertRes = await client.query(
            'INSERT INTO app.units (location_id, name) VALUES ($1, $2) RETURNING id',
            [locationId, unit.name]
          );
          addedUnits.push(unit.name);
          processedUnitIds.push(insertRes.rows[0].id);
        }
      }


      // 3. Eksik Birimleri Sil (Gelen listede olmayan mevcut birimler)
      const unitsToDelete = dbUnitIds.filter(id => !processedUnitIds.includes(id));
      const deletedUnitNames = [];

      for (const unitIdToDelete of unitsToDelete) {
        // Güvenlik Kontrolü: Birimin içinde çalışan varsa silme işlemine izin verilmez
        const empCheck = await client.query(
          'SELECT 1 FROM app.employees WHERE unit_id = $1 LIMIT 1',
          [unitIdToDelete]
        );
        if (empCheck.rows.length > 0) {
          throw badRequest('Bazı birimler silinemedi çünkü içlerinde kayıtlı çalışanlar var. Lütfen önce çalışanları transfer edin.');
        }
        const oldUnit = oldUnits.find(u => u.id === unitIdToDelete);
        if (oldUnit) deletedUnitNames.push(oldUnit.name);
        await client.query('DELETE FROM app.units WHERE id = $1', [unitIdToDelete]);
      }


      // Build detailed changes array
      const locFieldChanges = diffEntity(AUDIT_ENTITY_TYPE.LOCATION, oldLoc, { name, program_no: programNo });
      const unitChanges = [
        ...addedUnits.map(n => `Birim eklendi: "${n}"`),
        ...renamedUnits.map(r => `Birim yeniden adlandırıldı: "${r.old}" → "${r.new}"`),
        ...deletedUnitNames.map(n => `Birim silindi: "${n}"`),
      ];
      const allChanges = [...locFieldChanges, ...unitChanges];

      // Only create log entry when something actually changed
      if (allChanges.length > 0) {
        const summaryParts = [];
        if (locFieldChanges.length > 0) summaryParts.push(`${locFieldChanges.length} alan güncellendi`);
        if (addedUnits.length > 0) summaryParts.push(`${addedUnits.length} birim eklendi`);
        if (renamedUnits.length > 0) summaryParts.push(`${renamedUnits.length} birim yeniden adlandırıldı`);
        if (deletedUnitNames.length > 0) summaryParts.push(`${deletedUnitNames.length} birim silindi`);

        await createAuditLog(client, {
          action: AUDIT_ACTION.LOCATION_SYNC,
          actor: buildActor(req),
          entityType: AUDIT_ENTITY_TYPE.LOCATION,
          entityId: locationId,
          summary: `${name} yerleşkesi güncellendi: ${summaryParts.join(', ')}.`,
          changes: allChanges,
          metadata: { programNo },
        });
      }

      return { locationId, updatedUnits: processedUnitIds.length };
    });
  } catch (err) {
    if (err.code === '23505') throw badRequest('Program no (veya yerleşke adı) sistemde zaten kayıtlı. Lütfen eşsiz bir değer giriniz.');
    throw err;
  }

  res.json({
    success: true,
    message: 'Yerleşke ve birimler başarıyla senkronize edildi.',
    data: result
  });
});

// ==================== SİLME (DELETE) İŞLEMLERİ ====================

export const deleteLocation = asyncHandler(async (req, res) => {
  const { locationId } = req.params;

  await withTransaction(async (client) => {
    const oldResult = await client.query('SELECT * FROM app.locations WHERE id = $1', [locationId]);
    if (oldResult.rows.length === 0) throw notFound('Yerleşke bulunamadı.');

    const locationName = oldResult.rows[0].name;

    await client.query('DELETE FROM app.locations WHERE id = $1', [locationId]);

    await createAuditLog(client, {
      action: AUDIT_ACTION.LOCATION_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.LOCATION,
      entityId: locationId,
      summary: `${locationName} adlı yerleşke ve bağlı tüm alt veriler silindi.`,
      metadata: { programNo: oldResult.rows[0].program_no || null },
    });
  });

  res.json({ success: true, message: 'Yerleşke ve bağlı tüm alt veriler başarıyla silindi.' });
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const { unitId } = req.params;

  await withTransaction(async (client) => {
    const oldResult = await client.query('SELECT * FROM app.units WHERE id = $1', [unitId]);
    if (oldResult.rows.length === 0) throw notFound('Birim bulunamadı.');

    const unitName = oldResult.rows[0].name;

    await client.query('DELETE FROM app.units WHERE id = $1', [unitId]);

    await createAuditLog(client, {
      action: AUDIT_ACTION.UNIT_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.UNIT,
      entityId: unitId,
      summary: `${unitName} adlı birim ve bağlı tüm veriler silindi.`,
      metadata: { locationId: oldResult.rows[0].location_id || null },
    });
  });

  res.json({ success: true, message: 'Birim ve bağlı tüm veriler başarıyla silindi.' });
});
