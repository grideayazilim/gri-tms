import { eq, and, desc, sql, ilike, inArray, gte, lte } from 'drizzle-orm';
import { auditLogs } from '../../database/schema.js';
import type { DbExecutor } from '../types/db.js';
import { AUDIT_ACTION_META } from '@timesheet/shared';
import type { AuditLogFilters } from './types.js';

export type { AuditLogFilters } from './types.js';


export const auditLogRepo = {
  /**
   * Audit logları filtrelenmiş şekilde getirir.
   */
  async getLogs(executor: DbExecutor, filters: AuditLogFilters) {
    const conditions = [];

    if (filters.actor) {
      conditions.push(ilike(auditLogs.actorUsername, `%${filters.actor.trim()}%`));
    }
    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.category) {
      const actionsInCategory = Object.entries(AUDIT_ACTION_META)
        .filter(([, meta]) => meta.category === filters.category)
        .map(([code]) => code);
      if (actionsInCategory.length > 0) {
        conditions.push(inArray(auditLogs.action, actionsInCategory));
      } else {
        conditions.push(sql`1=0`);
      }
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.startDate) {
      // Local time as expected from frontend YYYY-MM-DD
      const startDt = new Date(`${filters.startDate}T00:00:00`);
      conditions.push(gte(auditLogs.createdAt, startDt));
    }
    if (filters.endDate) {
      const endDt = new Date(`${filters.endDate}T23:59:59`);
      conditions.push(lte(auditLogs.createdAt, endDt));
    }

    const validConditions = conditions.filter(c => c !== undefined) as import('drizzle-orm').SQL<unknown>[];
    const whereClause = validConditions.length > 0 ? and(...validConditions) : undefined;

    const countResult = await executor.select({ count: sql<number>`COUNT(*)::int` })
      .from(auditLogs)
      .where(whereClause);
    
    const logs = await executor.select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);

    return { logs, totalRecords: countResult[0]?.count || 0 };
  }
};
