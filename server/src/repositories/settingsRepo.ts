import { eq, and, desc, lt, gt, ne, sql, or } from 'drizzle-orm';
import { users, locations, units, settings, periods } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';
import { USER_ROLE, USER_STATUS } from '@timesheet/shared';

export const settingsRepo = {
  /**
   * Bekleyen kullanıcıları listeler
   */
  async getPendingUsers(executor: DbExecutor) {
    return await executor.select({
      id: users.id,
      username: users.username,
      role: users.role,
      status: users.status,
      createdAt: users.createdAt,
      unitId: units.id,
      unitName: units.name,
      locationId: locations.id,
      locationName: locations.name,
    })
    .from(users)
    .leftJoin(locations, eq(users.locationId, locations.id))
    .leftJoin(units, eq(users.unitId, units.id))
    .where(eq(users.status, USER_STATUS.PENDING))
    .orderBy(desc(users.createdAt));
  },

  /**
   * Bekleyen kullanıcıyı onaylar (ACTIVE yapar)
   */
  async approveUser(executor: DbExecutor, id: string) {
    const res = await executor.update(users)
      .set({ status: USER_STATUS.ACTIVE, updatedAt: new Date() })
      .where(and(eq(users.id, id), eq(users.status, USER_STATUS.PENDING)))
      .returning();
    return res[0];
  },

  /**
   * Bekleyen kullanıcıyı reddeder ve siler
   */
  async rejectUser(executor: DbExecutor, id: string) {
    const res = await executor.delete(users)
      .where(and(eq(users.id, id), eq(users.status, USER_STATUS.PENDING)))
      .returning();
    return res[0];
  },

  /**
   * Sistem ayarlarını getirir
   */
  async getSettings(executor: DbExecutor) {
    const res = await executor.select().from(settings).limit(1);
    return res[0];
  },

  /**
   * Sistem ayarlarını günceller veya ekler (Upsert)
   */
  async upsertSettings(
    executor: DbExecutor,
    data: { dailyWage?: string; maxWeeklyDays: number; programStartDate: string; programEndDate: string }
  ) {
    const current = await this.getSettings(executor);
    if (current) {
      const res = await executor.update(settings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(settings.id, current.id))
        .returning();
      const row = res[0];
      if (!row) throw new Error('Settings update returned no rows');
      return row;
    } else {
      const res = await executor.insert(settings)
        .values({ id: 1, ...data })
        .returning();
      const row = res[0];
      if (!row) throw new Error('Settings insert returned no rows');
      return row;
    }
  },

  /**
   * Verilen tarih aralığı dışındaki tüm dönemleri iptal eder (isDeleted = true)
   */
  async deletePeriodsOutside(executor: DbExecutor, start: string, end: string) {
    await executor.update(periods)
      .set({ isDeleted: true })
      .where(or(
        lt(periods.startDate, start),
        gt(periods.endDate, end)
      ));
  },

  /**
   * Tüm dönemleri iptal eder
   */
  async markAllPeriodsDeleted(executor: DbExecutor) {
    await executor.update(periods).set({ isDeleted: true });
  },

  /**
   * Belirtilen dönemi ekler veya günceller
   */
  async upsertPeriod(executor: DbExecutor, data: { year: number; month: number; startDate: string; endDate: string }) {
    await executor.insert(periods)
      .values({
        year: data.year,
        month: data.month,
        startDate: data.startDate,
        endDate: data.endDate,
        isDeleted: false,
      })
      .onConflictDoUpdate({
        target: [periods.year, periods.month],
        set: {
          startDate: data.startDate,
          endDate: data.endDate,
          isDeleted: false,
        }
      });
  },

  /**
   * Yöneticiler (ADMIN) hariç tüm kullanıcıların bitiş tarihini uzatır
   */
  async extendUsersExpiry(executor: DbExecutor, newEnd: string) {
    await executor.update(users)
      .set({ expiryDate: sql<string>`${newEnd}::date + INTERVAL '20 days'` })
      .where(ne(users.role, USER_ROLE.ADMIN));
  }
};
