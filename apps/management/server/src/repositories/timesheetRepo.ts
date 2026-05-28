import { eq, and, or, inArray, ilike, sql, asc } from 'drizzle-orm';
import { employees, units, locations, timesheets, timesheetDays } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';
import type { TimesheetDayInsert, TimesheetInsert, TimesheetRow } from '../../database/schema.js';
import { USER_ROLE } from '@timesheet/shared';
import type { TimesheetListFilters } from './types.js';

export type { TimesheetListFilters } from './types.js';


export const timesheetRepo = {
  /**
   * Çalışan listesi ve onlara ait dönem puantaj verilerini getirir.
   */
  async listWithEmployees(executor: DbExecutor, filters: TimesheetListFilters) {
    const conditions = [eq(employees.isActive, true)];

    // Scope (Sorumlu) yetki filtresi
    if (filters.scope) {
      if (filters.scope.unitId) conditions.push(eq(employees.unitId, filters.scope.unitId));
      if (filters.scope.locationId) conditions.push(eq(units.locationId, filters.scope.locationId));
    } else if (filters.role === USER_ROLE.ADMIN) {
      if (filters.unitId) conditions.push(eq(employees.unitId, filters.unitId));
      if (filters.locationId) conditions.push(eq(units.locationId, filters.locationId));
    }

    if (filters.search) {
      const s = filters.search.trim();
      const isNumeric = /^\d+$/.test(s);

      if (isNumeric) {
        // Sayısal ise TC No ile başlangıç kontrolü (prefix match)
        conditions.push(ilike(employees.tcNo, `${s}%`));
      } else {
        // Metin ise isim/soyad içerisinde substring kontrolü
        const pattern = `%${s}%`;
        const searchCondition = or(
          ilike(employees.firstName, pattern),
          ilike(employees.lastName, pattern),
          ilike(sql`${employees.firstName} || ' ' || ${employees.lastName}`, pattern)
        );
        if (searchCondition) conditions.push(searchCondition);
      }
    }

    const validConditions = conditions.filter(c => c !== undefined) as import('drizzle-orm').SQL<unknown>[];
    const whereClause = validConditions.length > 0 ? and(...validConditions) : undefined;

    // Total Count
    const countResult = await executor.select({ count: sql<number>`COUNT(*)::int` })
      .from(employees)
      .innerJoin(units, eq(units.id, employees.unitId))
      .where(whereClause);
    const totalRecords = countResult[0]?.count || 0;

    // Data Fetch
    const data = await executor.select({
      timesheetId: timesheets.id,
      timesheetCreatedAt: timesheets.createdAt,
      timesheetUpdatedAt: timesheets.updatedAt,
      employeeId: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      tcNo: employees.tcNo,
      ibanNo: employees.ibanNo,
      unitId: units.id,
      unitName: units.name,
      locationId: locations.id,
      locationName: locations.name,
      programNo: locations.programNo,
    })
    .from(employees)
    .innerJoin(units, eq(units.id, employees.unitId))
    .innerJoin(locations, eq(locations.id, units.locationId))
    .leftJoin(timesheets, and(
      eq(timesheets.employeeId, employees.id),
      eq(timesheets.periodId, filters.periodId)
    ))
    .where(whereClause)
    .orderBy(asc(employees.firstName), asc(employees.lastName))
    .limit(filters.limit)
    .offset(filters.offset);

    return { data, totalRecords };
  },

  /**
   * Verilen timesheet ID'leri için gün detaylarını getirir
   */
  async getTimesheetDays(executor: DbExecutor, timesheetIds: string[]) {
    if (timesheetIds.length === 0) return [];
    
    // We return dates as Date objects or strings based on Drizzle's pg date mapping.
    // Drizzle maps 'date' to string.
    return await executor.select()
      .from(timesheetDays)
      .where(inArray(timesheetDays.timesheetId, timesheetIds))
      .orderBy(asc(timesheetDays.day));
  },

  /**
   * Toplu kaydetme öncesi çalışan bilgilerini (unitId, locationId vb.) alır
   */
  async getEmployeeInfoForBulk(executor: DbExecutor, employeeIds: string[]) {
    if (employeeIds.length === 0) return [];

    return await executor.select({
      id: employees.id,
      unitId: employees.unitId,
      firstName: employees.firstName,
      lastName: employees.lastName,
      locationId: units.locationId,
    })
    .from(employees)
    .innerJoin(units, eq(units.id, employees.unitId))
    .where(and(
      inArray(employees.id, employeeIds),
      eq(employees.isActive, true)
    ));
  },

  /**
   * Çalışanların belirli döneme ait mevcut puantaj ID'lerini getirir
   */
  async getExistingTimesheets(executor: DbExecutor, employeeIds: string[], periodId: string) {
    if (employeeIds.length === 0) return [];

    return await executor.select({
      id: timesheets.id,
      employeeId: timesheets.employeeId,
    })
    .from(timesheets)
    .where(and(
      inArray(timesheets.employeeId, employeeIds),
      eq(timesheets.periodId, periodId)
    ));
  },

  /**
   * Puantaj satırını günceller (updated_at)
   */
  async touchTimesheet(executor: DbExecutor, id: string): Promise<void> {
    await executor.update(timesheets)
      .set({ updatedAt: new Date() })
      .where(eq(timesheets.id, id));
  },

  /**
   * Yeni puantaj satırı ekler
   */
  async insertTimesheet(executor: DbExecutor, data: TimesheetInsert): Promise<string> {
    const res = await executor.insert(timesheets)
      .values(data)
      .returning({ id: timesheets.id });
    return res[0]!.id;
  },

  /**
   * Mevcut gün detaylarını temizler
   */
  async deleteDays(executor: DbExecutor, timesheetIds: string[]): Promise<void> {
    if (timesheetIds.length === 0) return;
    await executor.delete(timesheetDays)
      .where(inArray(timesheetDays.timesheetId, timesheetIds));
  },

  /**
   * Yeni gün detaylarını topluca ekler
   */
  async insertDays(executor: DbExecutor, rows: TimesheetDayInsert[]): Promise<void> {
    if (rows.length === 0) return;
    
    // Chunking to avoid parameter limits (Postgres max 65535 parameters)
    const chunkSize = 5000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await executor.insert(timesheetDays).values(rows.slice(i, i + chunkSize));
    }
  },

  /**
   * Belirli gün detaylarını siler
   */
  async deleteSpecificDays(executor: DbExecutor, timesheetId: string, days: string[]): Promise<void> {
    if (days.length === 0) return;
    await executor.delete(timesheetDays)
      .where(and(
        eq(timesheetDays.timesheetId, timesheetId),
        inArray(timesheetDays.day, days)
      ));
  },

  /**
   * Gün detaylarını ekler veya günceller (upsert)
   */
  async upsertDays(executor: DbExecutor, rows: TimesheetDayInsert[]): Promise<void> {
    if (rows.length === 0) return;
    
    // Chunking to avoid parameter limits (Postgres max 65535 parameters)
    const chunkSize = 5000;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await executor.insert(timesheetDays)
        .values(rows.slice(i, i + chunkSize))
        .onConflictDoUpdate({
          target: [timesheetDays.timesheetId, timesheetDays.day],
          set: {
            markerCode: sql`excluded.marker_code`,
            note: sql`excluded.note`,
          },
        });
    }
  }
};
