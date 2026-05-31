/* ========================================================================
   CRON JOBS (ZAMANLANMIŞ GÖREVLER)
   Sistem bakımı, süresi dolan kullanıcıların kapatılması ve dönem kilitleme
   ======================================================================== */
import cron from 'node-cron';
import { eq, and, lt, sql } from 'drizzle-orm';

import { db } from '../config/database.js';
import { users, periods } from '../../database/schema.js';
import { formatPeriodLabel, toISODateString } from './dateUtils.js';
import { createAuditLog, SYSTEM_CRON_ACTOR, truncateChanges } from './auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_STATUS } from '@timesheet/shared';
import logger from './logger.js';

export async function runNightlyMaintenance(): Promise<void> {
    logger.info('[CRON] Nightly maintenance başladı');

    const todayStr = toISODateString(new Date());
    if (!todayStr) {
        logger.error('[CRON] Geçerli yerel tarih alınamadı.');
        return;
    }

    try {
        await db.transaction(async (tx) => {
            const expiredUsers = await tx.update(users)
                .set({ status: USER_STATUS.EXPIRED })
                .where(and(
                    lt(users.expiryDate, sql`${todayStr}::date`),
                    eq(users.status, USER_STATUS.ACTIVE),
                ))
                .returning({ id: users.id, username: users.username });

            if (expiredUsers.length > 0) {
                logger.info('[CRON] Kullanıcılar EXPIRED olarak işaretlendi', { count: expiredUsers.length });

                const changes = truncateChanges(
                    expiredUsers.map((u) => u.username),
                    50,
                );

                await createAuditLog(tx, {
                    action: AUDIT_ACTION.USER_AUTO_EXPIRE,
                    actor: SYSTEM_CRON_ACTOR,
                    entityType: AUDIT_ENTITY_TYPE.USER,
                    summary: `${expiredUsers.length} kullanıcının süresi doldu ve EXPIRED olarak işaretlendi.`,
                    changes,
                    metadata: {
                        expiredCount: expiredUsers.length,
                        usernames: expiredUsers.slice(0, 50).map((u) => u.username),
                    },
                });
            }

            const lockedPeriods = await tx.update(periods)
                .set({ isLocked: true })
                .where(and(
                    eq(periods.isLocked, false),
                    sql`${todayStr}::date >= (${periods.endDate}::date + INTERVAL '5 days')::DATE`,
                ))
                .returning({ id: periods.id, year: periods.year, month: periods.month });

            for (const row of lockedPeriods) {
                const periodLabel = formatPeriodLabel(row.year, row.month);
                logger.info('[CRON] Dönem otomatik kilitlendi', { year: row.year, month: row.month });

                await createAuditLog(tx, {
                    action: AUDIT_ACTION.PERIOD_AUTO_LOCK,
                    actor: SYSTEM_CRON_ACTOR,
                    entityType: AUDIT_ENTITY_TYPE.PERIOD,
                    entityId: row.id,
                    summary: `${periodLabel} dönemi otomatik olarak kapatıldı.`,
                    metadata: {
                        periodLabel,
                        year: row.year,
                        month: row.month,
                    },
                });
            }

            // Yeni aya geçildiğinde veya dönemin süresi başladığında kilidi otomatik aç
            const unlockedPeriods = await tx.update(periods)
                .set({ isLocked: false })
                .where(and(
                    eq(periods.isLocked, true),
                    eq(periods.isDeleted, false),
                    sql`${todayStr}::date >= ${periods.startDate}::date`,
                    sql`${todayStr}::date < (${periods.endDate}::date + INTERVAL '5 days')::DATE`,
                ))
                .returning({ id: periods.id, year: periods.year, month: periods.month });

            for (const row of unlockedPeriods) {
                const periodLabel = formatPeriodLabel(row.year, row.month);
                logger.info('[CRON] Dönem otomatik açıldı', { year: row.year, month: row.month });

                await createAuditLog(tx, {
                    action: AUDIT_ACTION.PERIOD_UNLOCK,
                    actor: SYSTEM_CRON_ACTOR,
                    entityType: AUDIT_ENTITY_TYPE.PERIOD,
                    entityId: row.id,
                    summary: `${periodLabel} dönemi otomatik olarak açıldı.`,
                    metadata: {
                        periodLabel,
                        year: row.year,
                        month: row.month,
                    },
                });
            }
        });
    } catch (error: unknown) {
        logger.error('[CRON] Nightly maintenance başarısız', {
            error: error instanceof Error ? error.message : String(error),
        });
    }

    logger.info('[CRON] Nightly maintenance tamamlandı');
}

export function initCronJobs(): void {
    cron.schedule('0 0 * * *', async () => {
        await runNightlyMaintenance();
    });

    logger.info('Cron jobs başlatıldı');
}
