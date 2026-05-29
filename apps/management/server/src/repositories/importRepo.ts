import { eq, and, ilike, inArray, asc } from 'drizzle-orm';
import { units, employees, periods, timesheets, timesheetDays, locations, settings } from '../../database/schema.js';
import type { EmployeeInsert, EmployeeRow, TimesheetDayInsert } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';

export const importRepo = {
  // --- IMPORT ---

  async insertEmployeeOnConflictDoNothing(
    executor: DbExecutor,
    data: EmployeeInsert,
  ): Promise<EmployeeRow | undefined> {
    const res = await executor.insert(employees).values(data).onConflictDoNothing({ target: employees.tcNo }).returning();
    return res[0];
  },

  async findPeriod(executor: DbExecutor, year: number, month: number) {
    const res = await executor.select().from(periods)
      .where(and(eq(periods.year, year), eq(periods.month, month), eq(periods.isDeleted, false)))
      .limit(1);
    return res[0];
  },

  async getAllLocations(executor: DbExecutor) {
    return await executor.select().from(locations);
  },

  async getAllUnits(executor: DbExecutor) {
    return await executor.select().from(units);
  },

  // --- EXPORT ---

  async getLocation(executor: DbExecutor, id: string) {
    const res = await executor.select().from(locations).where(eq(locations.id, id)).limit(1);
    return res[0];
  },

  async getEmployeesByLocation(executor: DbExecutor, locationId: string) {
    return await executor.select({
      id: employees.id,
      tcNo: employees.tcNo,
      firstName: employees.firstName,
      lastName: employees.lastName,
      ibanNo: employees.ibanNo,
      startDate: employees.startDate,
      endDate: employees.endDate,
      unitId: units.id,
      unitName: units.name,
    })
    .from(employees)
    .innerJoin(units, eq(units.id, employees.unitId))
    .where(and(eq(units.locationId, locationId), eq(employees.isActive, true)))
    .orderBy(asc(employees.firstName), asc(employees.lastName));
  },

  async getTimesheetDaysForEmployees(executor: DbExecutor, periodId: string, employeeIds: string[]) {
    if (employeeIds.length === 0) return [];
    return await executor.select({
      employeeId: timesheets.employeeId,
      day: timesheetDays.day,
      markerCode: timesheetDays.markerCode,
    })
    .from(timesheets)
    .innerJoin(timesheetDays, eq(timesheetDays.timesheetId, timesheets.id))
    .where(and(eq(timesheets.periodId, periodId), inArray(timesheets.employeeId, employeeIds)));
  },

  async getSettingsData(executor: DbExecutor) {
    const res = await executor.select().from(settings).limit(1);
    return res[0];
  }
};
