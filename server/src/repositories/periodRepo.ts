import { eq, and, desc } from 'drizzle-orm';
import { db } from '../config/database.js';
import { periods } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';
import type { PeriodRow } from '../../database/schema.js';

export const periodRepo = {
  /**
   * En son aktif dönemi veya belirli ay/yıla ait aktif dönemi bulur.
   */
  async findActive(executor: DbExecutor, filters: { month?: string; year?: string }): Promise<PeriodRow | undefined> {
    if (filters.month) {
      const [y, m] = filters.month.split('-');
      if (!y || !m) return undefined;
      
      const res = await executor.select().from(periods)
        .where(and(eq(periods.year, parseInt(y, 10)), eq(periods.month, parseInt(m, 10)), eq(periods.isDeleted, false)))
        .limit(1);
      return res[0];
    }

    if (filters.year) {
      const res = await executor.select().from(periods)
        .where(and(eq(periods.year, parseInt(filters.year, 10)), eq(periods.isDeleted, false)))
        .orderBy(desc(periods.month))
        .limit(1);
      return res[0];
    }

    const res = await executor.select().from(periods)
      .where(eq(periods.isDeleted, false))
      .orderBy(desc(periods.year), desc(periods.month))
      .limit(1);
    return res[0];
  },

  /**
   * Tüm aktif dönemleri (isDeleted = false) getirir.
   */
  async findActivePeriods(executor: DbExecutor): Promise<PeriodRow[]> {
    return await executor.select().from(periods)
      .where(eq(periods.isDeleted, false))
      .orderBy(desc(periods.year), desc(periods.month));
  },

  /**
   * ID ile dönemi getirir.
   */
  async findById(executor: DbExecutor, id: string): Promise<PeriodRow | undefined> {
    const res = await executor.select().from(periods)
      .where(eq(periods.id, id))
      .limit(1);
    return res[0];
  },

  /**
   * Dönem kilit durumunu günceller.
   */
  async updateLockStatus(executor: DbExecutor, id: string, isLocked: boolean): Promise<void> {
    await executor.update(periods)
      .set({ isLocked })
      .where(eq(periods.id, id));
  }
};
