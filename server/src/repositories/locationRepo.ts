/* ========================================================================
   LOCATION & UNIT REPOSITORY (YERLEŞKE VE BİRİM VERİ ERİŞİM KATMANI)
   Yerleşke ve birimlerin tüm veritabanı sorgularını barındırır.
   ======================================================================== */
import { eq, sql, inArray } from 'drizzle-orm';

import type { DbExecutor } from '../types/db.js';
import { locations, units, employees } from '../../database/schema.js';
import type { LocationRow, UnitRow } from '../../database/schema.js';

// ============================================================
// Location fonksiyonları
// ============================================================

export async function findAllLocations(executor: DbExecutor): Promise<LocationRow[]> {
  return executor
    .select()
    .from(locations)
    .orderBy(locations.name);
}

export async function findLocationById(
  executor: DbExecutor,
  id: string,
): Promise<LocationRow | undefined> {
  const rows = await executor
    .select()
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  return rows[0];
}

export async function createLocation(
  executor: DbExecutor,
  data: { name: string; programNo: string },
): Promise<LocationRow> {
  const rows = await executor
    .insert(locations)
    .values(data)
    .returning();
  const row = rows[0];
  if (!row) throw new Error('Location insert returned no rows');
  return row;
}

export async function updateLocation(
  executor: DbExecutor,
  id: string,
  data: { name: string; programNo: string },
): Promise<LocationRow | undefined> {
  const rows = await executor
    .update(locations)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(locations.id, id))
    .returning();
  return rows[0];
}

export async function deleteLocation(
  executor: DbExecutor,
  id: string,
): Promise<void> {
  await executor.delete(locations).where(eq(locations.id, id));
}

export async function lookupLocationNames(
  executor: DbExecutor,
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const rows = await executor
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(inArray(locations.id, ids));
  const map: Record<string, string> = {};
  for (const r of rows) map[r.id] = r.name;
  return map;
}

// ============================================================
// Unit fonksiyonları
// ============================================================

interface UnitWithCount {
  readonly id: string;
  readonly locationId: string;
  readonly name: string;
  readonly employeeCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export async function findAllUnits(executor: DbExecutor): Promise<UnitWithCount[]> {
  return executor
    .select({
      id: units.id,
      locationId: units.locationId,
      name: units.name,
      employeeCount: sql<number>`COUNT(${employees.id})::int`,
      createdAt: units.createdAt,
      updatedAt: units.updatedAt,
    })
    .from(units)
    .leftJoin(employees, eq(units.id, employees.unitId))
    .groupBy(units.id)
    .orderBy(units.name);
}

export async function findUnitsByLocation(
  executor: DbExecutor,
  locationId: string,
): Promise<UnitWithCount[]> {
  return executor
    .select({
      id: units.id,
      locationId: units.locationId,
      name: units.name,
      employeeCount: sql<number>`COUNT(${employees.id})::int`,
      createdAt: units.createdAt,
      updatedAt: units.updatedAt,
    })
    .from(units)
    .leftJoin(employees, eq(units.id, employees.unitId))
    .where(eq(units.locationId, locationId))
    .groupBy(units.id)
    .orderBy(units.name);
}

export async function findUnitById(
  executor: DbExecutor,
  id: string,
): Promise<UnitRow | undefined> {
  const rows = await executor
    .select()
    .from(units)
    .where(eq(units.id, id))
    .limit(1);
  return rows[0];
}

export async function findUnitsByLocationFlat(
  executor: DbExecutor,
  locationId: string,
): Promise<{ id: string; name: string }[]> {
  return executor
    .select({ id: units.id, name: units.name })
    .from(units)
    .where(eq(units.locationId, locationId));
}

export async function createUnit(
  executor: DbExecutor,
  data: { locationId: string; name: string },
): Promise<UnitRow> {
  const rows = await executor
    .insert(units)
    .values(data)
    .returning();
  const row = rows[0];
  if (!row) throw new Error('Unit insert returned no rows');
  return row;
}

export async function updateUnit(
  executor: DbExecutor,
  id: string,
  data: Partial<Pick<UnitRow, 'locationId' | 'name'>>,
): Promise<UnitRow | undefined> {
  const rows = await executor
    .update(units)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(units.id, id))
    .returning();
  return rows[0];
}

export async function updateUnitNameByIdAndLocation(
  executor: DbExecutor,
  id: string,
  locationId: string,
  name: string,
): Promise<void> {
  await executor
    .update(units)
    .set({ name, updatedAt: new Date() })
    .where(eq(units.id, id));
}

export async function deleteUnit(
  executor: DbExecutor,
  id: string,
): Promise<void> {
  await executor.delete(units).where(eq(units.id, id));
}

export async function locationExists(
  executor: DbExecutor,
  id: string,
): Promise<boolean> {
  const rows = await executor
    .select({ id: locations.id })
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  return rows.length > 0;
}

/** Birimde çalışan var mı kontrolü */
export async function unitHasEmployees(
  executor: DbExecutor,
  unitId: string,
): Promise<boolean> {
  const rows = await executor
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.unitId, unitId))
    .limit(1);
  return rows.length > 0;
}

export async function getLocationName(
  executor: DbExecutor,
  id: string,
): Promise<string | null> {
  const rows = await executor
    .select({ name: locations.name })
    .from(locations)
    .where(eq(locations.id, id))
    .limit(1);
  return rows[0]?.name ?? null;
}
