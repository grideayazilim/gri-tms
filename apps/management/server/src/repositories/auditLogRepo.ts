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

    /* Filtre yokken COUNT(*) tam tablo taramasıdır ve tablo büyüdükçe her
       sayfa yüklemesini yavaşlatır; bu durumda planner'ın satır tahmini
       sayfalama için yeterince doğrudur. Filtreliyken gerçek sayım yapılır,
       sonuç kümesi zaten küçüktür. */
    let totalRecords: number;
    if (whereClause === undefined) {
      const estimate = await executor.execute<{ estimate: number }>(sql`
        SELECT GREATEST(reltuples, 0)::int AS estimate
        FROM pg_class
        WHERE oid = 'app.audit_logs'::regclass
      `);
      const estimated = estimate.rows[0]?.estimate ?? 0;
      // ANALYZE hiç çalışmadıysa reltuples -1/0 gelir → gerçek sayıma düş
      if (estimated > 0) {
        totalRecords = estimated;
      } else {
        const exact = await executor.select({ count: sql<number>`COUNT(*)::int` }).from(auditLogs);
        totalRecords = exact[0]?.count ?? 0;
      }
    } else {
      const countResult = await executor.select({ count: sql<number>`COUNT(*)::int` })
        .from(auditLogs)
        .where(whereClause);
      totalRecords = countResult[0]?.count ?? 0;
    }

    const logs = await executor.select({
      id: auditLogs.id,
      action: auditLogs.action,
      actorUsername: auditLogs.actorUsername,
      actorRole: auditLogs.actorRole,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      summary: auditLogs.summary,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(filters.limit)
      .offset(filters.offset);

    return { logs, totalRecords };
  },

  /**
   * Belirtilen aydan eski denetim kayıtlarını siler.
   * Gece cron'undan çağrılır; tablonun sınırsız büyümesini engeller.
   */
  async deleteOlderThan(executor: DbExecutor, months: number): Promise<number> {
    const rows = await executor.delete(auditLogs)
      .where(sql`${auditLogs.createdAt} < now() - (${months} * INTERVAL '1 month')`)
      .returning({ id: auditLogs.id });
    return rows.length;
  }
};
