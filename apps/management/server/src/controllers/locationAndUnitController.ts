/* ========================================================================
   LOCATION & UNIT CONTROLLER (YERLEŞKE VE BİRİM YÖNETİMİ)
   Yerleşke ve Birimlerin oluşturulması, güncellenmesi ve senkronizasyonu.
   ======================================================================== */
import { z } from 'zod';

import { db, withDrizzleTransaction } from '../config/database.js';
import { createAuditLog, buildActor, diffEntity, diffEntityWithLookups } from '../utils/auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE } from '@timesheet/shared';
import type { LocationType, UnitType, SyncLocationType } from '@timesheet/shared';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { notFound, badRequest, rethrowIfNotUniqueViolation } from '../utils/AppError.js';
import { ok, created } from '../utils/responses.js';
import * as locationRepo from '../repositories/locationRepo.js';


// ==================== OKUMA (GET) İŞLEMLERİ ====================

export const getLocations = asyncHandler(async (_req, res) => {
  const rows = await locationRepo.findAllLocations(db);

  const locations = rows.map((row) => ({
    id: row.id,
    name: row.name,
    programNo: row.programNo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return ok(res, { locations });
});

export const getUnits = asyncHandler(async (_req, res) => {
  const rows = await locationRepo.findAllUnits(db);

  const units = rows.map((row) => ({
    id: row.id,
    locationId: row.locationId,
    name: row.name,
    employeeCount: row.employeeCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return ok(res, { units });
});

export const getUnitsByLocation = asyncHandler<{ locationId: string }>(async (req, res) => {
  const { locationId } = req.params;

  const rows = await locationRepo.findUnitsByLocation(db, locationId);

  const units = rows.map((row) => ({
    id: row.id,
    locationId: row.locationId,
    name: row.name,
    employeeCount: row.employeeCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return ok(res, { units });
});

// ==================== YAZMA (POST) İŞLEMLERİ ====================

export const createLocation = asyncHandler<Record<string, string>, unknown, LocationType>(async (req, res) => {
  const { name, programNo } = req.body;

  let newLocation;
  try {
    newLocation = await withDrizzleTransaction(async (tx) => {
      const loc = await locationRepo.createLocation(tx, { name, programNo });

      await createAuditLog(tx, {
        action: AUDIT_ACTION.LOCATION_CREATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.LOCATION,
        entityId: loc.id,
        summary: `${name} adlı yeni yerleşke oluşturuldu.`,
        metadata: { programNo: loc.programNo ?? null },
      });

      return loc;
    });
  } catch (err: unknown) {
    rethrowIfNotUniqueViolation(err, 'Program no (veya yerleşke adı) sistemde zaten kayıtlı. Lütfen eşsiz bir değer giriniz.');
  }

  return created(res, {
    location: {
      id: newLocation.id,
      name: newLocation.name,
      programNo: newLocation.programNo,
      createdAt: newLocation.createdAt.toISOString(),
      updatedAt: newLocation.updatedAt.toISOString(),
    },
  });
});

export const createUnit = asyncHandler<Record<string, string>, unknown, UnitType>(async (req, res) => {
  const { locationId, name } = req.body;

  const newUnit = await withDrizzleTransaction(async (tx) => {
    const locExists = await locationRepo.locationExists(tx, locationId);
    if (!locExists) throw notFound('Belirtilen yerleşke bulunamadı.');

    const unit = await locationRepo.createUnit(tx, { locationId, name });

    // Audit Log için Yerleşke adını al (Kullanıcı dostu log mesajı için)
    const locName = await locationRepo.getLocationName(tx, locationId);

    await createAuditLog(tx, {
      action: AUDIT_ACTION.UNIT_CREATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.UNIT,
      entityId: unit.id,
      summary: `${locName ?? ''} yerleşkesinde "${name}" adlı yeni birim oluşturuldu.`,
      metadata: { locationId, locationName: locName },
    });

    return unit;
  });

  return created(res, {
    unit: {
      id: newUnit.id,
      locationId: newUnit.locationId,
      name: newUnit.name,
      createdAt: newUnit.createdAt.toISOString(),
      updatedAt: newUnit.updatedAt.toISOString(),
    },
  });
});

// ==================== GÜNCELLEME (PUT) İŞLEMLERİ ====================

export const updateLocation = asyncHandler<{ locationId: string }, unknown, LocationType>(async (req, res) => {
  const { locationId } = req.params;
  const { name, programNo } = req.body;

  let updatedLocation;
  try {
    updatedLocation = await withDrizzleTransaction(async (tx) => {
      const oldLoc = await locationRepo.findLocationById(tx, locationId);
      if (!oldLoc) throw notFound('Yerleşke bulunamadı.');

      const loc = await locationRepo.updateLocation(tx, locationId, { name, programNo });
      if (!loc) throw notFound('Yerleşke bulunamadı.');

      const changes = diffEntity(
        AUDIT_ENTITY_TYPE.LOCATION,
        oldLoc,
        loc,
      );

      await createAuditLog(tx, {
        action: AUDIT_ACTION.LOCATION_UPDATE,
        actor: buildActor(req),
        entityType: AUDIT_ENTITY_TYPE.LOCATION,
        entityId: locationId,
        summary: changes.length > 0
          ? `${loc.name} adlı yerleşke güncellendi (${changes.length} alan değişti).`
          : `${loc.name} adlı yerleşke güncellendi.`,
        changes,
      });

      return loc;
    });
  } catch (err: unknown) {
    rethrowIfNotUniqueViolation(err, 'Program no (veya yerleşke adı) sistemde zaten kayıtlı. Lütfen eşsiz bir değer giriniz.');
  }

  return ok(res, {
    location: {
      id: updatedLocation.id,
      name: updatedLocation.name,
      programNo: updatedLocation.programNo,
      createdAt: updatedLocation.createdAt.toISOString(),
      updatedAt: updatedLocation.updatedAt.toISOString(),
    },
  });
});

export const updateUnit = asyncHandler<{ unitId: string }, unknown, UnitType>(async (req, res) => {
  const { unitId } = req.params;
  const { locationId, name } = req.body;

  const updatedUnit = await withDrizzleTransaction(async (tx) => {
    const oldUnit = await locationRepo.findUnitById(tx, unitId);
    if (!oldUnit) throw notFound('Birim bulunamadı.');

    const locExists = await locationRepo.locationExists(tx, locationId);
    if (!locExists) throw notFound('Belirtilen yerleşke bulunamadı.');

    const unit = await locationRepo.updateUnit(tx, unitId, { locationId, name });
    if (!unit) throw notFound('Birim bulunamadı.');

    const locationLookup: Record<string, string> = {};
    if (oldUnit.locationId !== unit.locationId) {
      // Birim başka bir yerleşkeye transfer edildiyse, eski ve yeni yerleşke isimlerini log için al
      const ids = [oldUnit.locationId, unit.locationId].filter((v): v is string => v != null);
      Object.assign(locationLookup, await locationRepo.lookupLocationNames(tx, ids));
    }
    const changes = diffEntityWithLookups(
      AUDIT_ENTITY_TYPE.UNIT,
      oldUnit,
      unit,
      { locationId: locationLookup },
    );

    await createAuditLog(tx, {
      action: AUDIT_ACTION.UNIT_UPDATE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.UNIT,
      entityId: unitId,
      summary: changes.length > 0
        ? `${unit.name} adlı birim güncellendi (${changes.length} alan değişti).`
        : `${unit.name} adlı birim güncellendi.`,
      changes,
    });

    return unit;
  });

  return ok(res, {
    unit: {
      id: updatedUnit.id,
      locationId: updatedUnit.locationId,
      name: updatedUnit.name,
      createdAt: updatedUnit.createdAt.toISOString(),
      updatedAt: updatedUnit.updatedAt.toISOString(),
    },
  });
});

export const syncLocationWithUnits = asyncHandler<{ locationId: string }, unknown, SyncLocationType>(async (req, res) => {
  const { locationId } = req.params;
  const { name, programNo, units } = req.body;

  let result;
  try {
    result = await withDrizzleTransaction(async (tx) => {
      // Fetch existing data before any changes for accurate diffing
      const oldLoc = await locationRepo.findLocationById(tx, locationId);
      if (!oldLoc) throw notFound('Yerleşke bulunamadı.');

      const oldUnits = await locationRepo.findUnitsByLocationFlat(tx, locationId);
      const dbUnitIds = oldUnits.map((u) => u.id); // Mevcut Birim ID'leri (Silinecekleri bulmak için)

      // 1. Yerleşke bilgilerini güncelle
      await locationRepo.updateLocation(tx, locationId, { name, programNo });

      const renamedUnits: Array<{ old: string; new: string }> = [];
      const processedUnitIds: string[] = [];
      const addedUnits: string[] = [];

      // 2. Birimleri İşle (Ekle veya Güncelle)
      for (const unit of units) {
        if (!unit.name || !unit.name.trim()) throw badRequest('Birim adı boş bırakılamaz.');

        // UUID kontrolü: regex yerine zod .uuid() parse
        const isUuid = unit.id != null && z.string().uuid().safeParse(unit.id).success;

        if (isUuid && dbUnitIds.includes(unit.id!)) {
          // Birim zaten varsa: İsmi değiştiyse log listesine ekle ve UPDATE et
          const oldUnit = oldUnits.find((u) => u.id === unit.id);
          if (oldUnit && oldUnit.name !== unit.name) {
            renamedUnits.push({ old: oldUnit.name, new: unit.name });
          }
          await locationRepo.updateUnitNameByIdAndLocation(tx, unit.id!, locationId, unit.name);
          processedUnitIds.push(unit.id!);
        } else {
          // Birim yeniyse (id geçersizse veya listede yoksa): INSERT et
          const newUnit = await locationRepo.createUnit(tx, { locationId, name: unit.name });
          addedUnits.push(unit.name);
          processedUnitIds.push(newUnit.id);
        }
      }

      // 3. Eksik Birimleri Sil (Gelen listede olmayan mevcut birimler)
      const unitsToDelete = dbUnitIds.filter((id) => !processedUnitIds.includes(id));
      const deletedUnitNames: string[] = [];

      for (const unitIdToDelete of unitsToDelete) {
        // Güvenlik Kontrolü: Birimin içinde çalışan varsa silme işlemine izin verilmez
        const hasEmployees = await locationRepo.unitHasEmployees(tx, unitIdToDelete);
        if (hasEmployees) {
          throw badRequest('Bazı birimler silinemedi çünkü içlerinde kayıtlı çalışanlar var. Lütfen önce çalışanları transfer edin.');
        }
        const oldUnit = oldUnits.find((u) => u.id === unitIdToDelete);
        if (oldUnit) deletedUnitNames.push(oldUnit.name);
        await locationRepo.deleteUnit(tx, unitIdToDelete);
      }

      // Build detailed changes array
      const locFieldChanges = diffEntity(
        AUDIT_ENTITY_TYPE.LOCATION,
        oldLoc,
        { name, programNo },
      );
      const unitChanges = [
        ...addedUnits.map((n) => `Birim eklendi: "${n}"`),
        ...renamedUnits.map((r) => `Birim yeniden adlandırıldı: "${r.old}" → "${r.new}"`),
        ...deletedUnitNames.map((n) => `Birim silindi: "${n}"`),
      ];
      const allChanges = [...locFieldChanges, ...unitChanges];

      // Only create log entry when something actually changed
      if (allChanges.length > 0) {
        const summaryParts: string[] = [];
        if (locFieldChanges.length > 0) summaryParts.push(`${locFieldChanges.length} alan güncellendi`);
        if (addedUnits.length > 0) summaryParts.push(`${addedUnits.length} birim eklendi`);
        if (renamedUnits.length > 0) summaryParts.push(`${renamedUnits.length} birim yeniden adlandırıldı`);
        if (deletedUnitNames.length > 0) summaryParts.push(`${deletedUnitNames.length} birim silindi`);

        await createAuditLog(tx, {
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
  } catch (err: unknown) {
    rethrowIfNotUniqueViolation(err, 'Program no (veya yerleşke adı) sistemde zaten kayıtlı. Lütfen eşsiz bir değer giriniz.');
  }

  return ok(res, result, 'Yerleşke ve birimler başarıyla senkronize edildi.');
});

// ==================== SİLME (DELETE) İŞLEMLERİ ====================

export const deleteLocation = asyncHandler<{ locationId: string }>(async (req, res) => {
  const { locationId } = req.params;

  await withDrizzleTransaction(async (tx) => {
    const oldLoc = await locationRepo.findLocationById(tx, locationId);
    if (!oldLoc) throw notFound('Yerleşke bulunamadı.');

    await locationRepo.deleteLocation(tx, locationId);

    await createAuditLog(tx, {
      action: AUDIT_ACTION.LOCATION_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.LOCATION,
      entityId: locationId,
      summary: `${oldLoc.name} adlı yerleşke ve bağlı tüm alt veriler silindi.`,
      metadata: { programNo: oldLoc.programNo ?? null },
    });
  });

  return ok(res, undefined, 'Yerleşke ve bağlı tüm alt veriler başarıyla silindi.');
});

export const deleteUnit = asyncHandler<{ unitId: string }>(async (req, res) => {
  const { unitId } = req.params;

  await withDrizzleTransaction(async (tx) => {
    const oldUnit = await locationRepo.findUnitById(tx, unitId);
    if (!oldUnit) throw notFound('Birim bulunamadı.');

    await locationRepo.deleteUnit(tx, unitId);

    await createAuditLog(tx, {
      action: AUDIT_ACTION.UNIT_DELETE,
      actor: buildActor(req),
      entityType: AUDIT_ENTITY_TYPE.UNIT,
      entityId: unitId,
      summary: `${oldUnit.name} adlı birim ve bağlı tüm veriler silindi.`,
      metadata: { locationId: oldUnit.locationId ?? null },
    });
  });

  return ok(res, undefined, 'Birim ve bağlı tüm veriler başarıyla silindi.');
});
