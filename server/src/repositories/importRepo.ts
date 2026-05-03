import { eq, and, ilike, inArray, asc } from 'drizzle-orm';
import { units, employees, periods, timesheets, timesheetDays, locations, settings } from '../../database/schema.js';
import type { EmployeeInsert, EmployeeRow, TimesheetDayInsert } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';

export const importRepo = {
  // --- IMPORT ---

  async findUnitByName(executor: DbExecutor, locationId: string, unitName: string) {
    const res = await executor.select().from(units)
      .where(and(eq(units.locationId, locationId), ilike(units.name, unitName)))
      .limit(1);
    return res[0];
  },

  async getFirstUnitInLocation(executor: DbExecutor, locationId: string) {
    const res = await executor.select().from(units)
      .where(eq(units.locationId, locationId))
      .orderBy(asc(units.name))
      .limit(1);
    return res[0];
  },

  async findEmployeeByTc(executor: DbExecutor, tcNo: string) {
    const res = await executor.select().from(employees).where(eq(employees.tcNo, tcNo)).limit(1);
    return res[0];
  },

  async insertEmployee(executor: DbExecutor, data: EmployeeInsert) {
    const res = await executor.insert(employees).values(data).returning();
    return res[0]!;
  },

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

  async insertPeriod(executor: DbExecutor, year: number, month: number) {
    const res = await executor.insert(periods)
      // We pass a dummy start/end date because schema requires it, but in import they only have year/month.
      // We'll calculate it safely based on month bounds.
      .values({ 
        year, 
        month, 
        startDate: `${year}-${month.toString().padStart(2, '0')}-01`, 
        endDate: `${year}-${month.toString().padStart(2, '0')}-28`, // dummy
        isDeleted: false 
      })
      .returning();
    return res[0]!;
  },

  async findTimesheet(executor: DbExecutor, employeeId: string, periodId: string) {
    const res = await executor.select().from(timesheets)
      .where(and(eq(timesheets.employeeId, employeeId), eq(timesheets.periodId, periodId)))
      .limit(1);
    return res[0];
  },

  async touchTimesheet(executor: DbExecutor, id: string) {
    await executor.update(timesheets).set({ updatedAt: new Date() }).where(eq(timesheets.id, id));
  },

  async insertTimesheet(executor: DbExecutor, employeeId: string, periodId: string, unitId: string) {
    const res = await executor.insert(timesheets).values({ employeeId, periodId, unitId }).returning();
    return res[0]!;
  },

  async deleteTimesheetDays(executor: DbExecutor, timesheetId: string) {
    await executor.delete(timesheetDays).where(eq(timesheetDays.timesheetId, timesheetId));
  },

  async insertTimesheetDays(executor: DbExecutor, rows: TimesheetDayInsert[]) {
    if (rows.length === 0) return;
    await executor.insert(timesheetDays).values(rows);
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
