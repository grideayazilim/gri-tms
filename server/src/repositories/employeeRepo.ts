/* ========================================================================
   EMPLOYEE REPOSITORY (ÇALIŞAN VERİ ERİŞİM KATMANI)
   Çalışanlarla ilgili tüm veritabanı sorgularını barındırır.
   ======================================================================== */
import { eq, and, or, ilike, sql, inArray } from 'drizzle-orm';

import type { DbExecutor } from '../types/db.js';
import { employees, units, locations } from '../../database/schema.js';
import type { EmployeeRow } from '../../database/schema.js';
import type { EmployeeListFilters, EmployeeListRow, UnitWithLocation } from './types.js';


// ============================================================
// Repository fonksiyonları
// ============================================================

export async function findById(
  executor: DbExecutor,
  id: string,
): Promise<EmployeeRow | undefined> {
  const rows = await executor
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  return rows[0];
}

export async function list(
  executor: DbExecutor,
  filters: EmployeeListFilters,
  limit: number,
  offset: number,
): Promise<{ employees: EmployeeListRow[]; total: number }> {
  const conditions = [];

  if (filters.unitId) conditions.push(eq(employees.unitId, filters.unitId));
  if (filters.locationId) conditions.push(eq(units.locationId, filters.locationId));
  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(employees.firstName, pattern),
        ilike(employees.lastName, pattern),
        ilike(employees.tcNo, pattern),
      ),
    );
  }
  if (filters.status === 'active') conditions.push(eq(employees.isActive, true));
  else if (filters.status === 'inactive') conditions.push(eq(employees.isActive, false));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Count
  const countRows = await executor
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(employees)
    .innerJoin(units, eq(employees.unitId, units.id))
    .where(whereClause);
  const total = countRows[0]?.count ?? 0;

  // Data
  const dataRows = await executor
    .select({
      id: employees.id,
      tcNo: employees.tcNo,
      firstName: employees.firstName,
      lastName: employees.lastName,
      ibanNo: employees.ibanNo,
      startDate: employees.startDate,
      endDate: employees.endDate,
      isActive: employees.isActive,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      unitId: units.id,
      unitName: units.name,
      locationId: locations.id,
      locationName: locations.name,
    })
    .from(employees)
    .innerJoin(units, eq(employees.unitId, units.id))
    .innerJoin(locations, eq(units.locationId, locations.id))
    .where(whereClause)
    .orderBy(employees.firstName, employees.lastName)
    .limit(limit)
    .offset(offset);

  return { employees: dataRows, total };
}

export async function create(
  executor: DbExecutor,
  data: {
    tcNo: string;
    firstName: string;
    lastName: string;
    ibanNo: string | null;
    unitId: string;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
  },
): Promise<EmployeeRow> {
  const rows = await executor
    .insert(employees)
    .values(data)
    .returning();
  const row = rows[0];
  if (!row) throw new Error('Employee insert returned no rows');
  return row;
}

export async function update(
  executor: DbExecutor,
  id: string,
  data: Partial<Omit<EmployeeRow, 'id' | 'createdAt'>>,
): Promise<EmployeeRow | undefined> {
  const rows = await executor
    .update(employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();
  return rows[0];
}

export async function remove(
  executor: DbExecutor,
  id: string,
): Promise<{ id: string; firstName: string; lastName: string } | undefined> {
  const rows = await executor
    .delete(employees)
    .where(eq(employees.id, id))
    .returning({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName });
  return rows[0];
}

/** Birim + yerleşke bilgisini birlikte döner */
export async function findUnitWithLocation(
  executor: DbExecutor,
  unitId: string,
): Promise<UnitWithLocation | undefined> {
  const rows = await executor
    .select({
      id: units.id,
      name: units.name,
      locationId: locations.id,
      locationName: locations.name,
    })
    .from(units)
    .innerJoin(locations, eq(units.locationId, locations.id))
    .where(eq(units.id, unitId))
    .limit(1);
  return rows[0];
}

/** Audit diff için birim isim lookup */
export async function lookupUnitNames(
  executor: DbExecutor,
  ids: string[],
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const rows = await executor
    .select({ id: units.id, name: units.name })
    .from(units)
    .where(inArray(units.id, ids));
  const map: Record<string, string> = {};
  for (const r of rows) map[r.id] = r.name;
  return map;
}
