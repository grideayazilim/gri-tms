/* ========================================================================
   CRON JOBS (ZAMANLANMIŞ GÖREVLER)
   Sistem bakımı, süresi dolan kullanıcıların kapatılması ve dönem kilitleme
   ======================================================================== */
import cron from 'node-cron';
import { eq, and, lt, sql } from 'drizzle-orm';

import { db } from '../config/database.js';
import { users, periods } from '../../database/schema.js';
import { formatPeriodLabel } from './dateUtils.js';
import { createAuditLog, SYSTEM_CRON_ACTOR, truncateChanges } from './auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_STATUS } from '@timesheet/shared';

export function initCronJobs(): void {
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Nightly maintenance başladı...');

        try {
            // Envanter E kapatıldı: raw SQL injection riski ortadan kalktı — Drizzle parametrize
            await db.transaction(async (tx) => {
                // Süresi (expiry_date) bugün itibariyle dolmuş olan ACTIVE kullanıcılar için durum güncellemesi
                const expiredUsers = await tx.update(users)
                    .set({ status: USER_STATUS.EXPIRED })
                    .where(and(
                        lt(users.expiryDate, sql`NOW()::date`),
                        eq(users.status, USER_STATUS.ACTIVE),
                    ))
                    .returning({ id: users.id, username: users.username });

                if (expiredUsers.length > 0) {
                    console.log(`[CRON] ${expiredUsers.length} kullanıcı EXPIRED olarak işaretlendi.`);

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

                // Dönem bitişinden (end_date) 3 gün sonra otomatik kilitleme yapar
                const lockedPeriods = await tx.update(periods)
                    .set({ isLocked: true })
                    .where(and(
                        eq(periods.isLocked, false),
                        sql`CURRENT_DATE >= (${periods.endDate}::date + INTERVAL '3 days')::DATE`,
                    ))
                    .returning({ id: periods.id, year: periods.year, month: periods.month });

                for (const row of lockedPeriods) {
                    const periodLabel = formatPeriodLabel(row.year, row.month);
                    console.log(`[CRON] Dönem kapatıldı: ${row.year}-${row.month}`);

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
            });
        } catch (error: unknown) {
            console.error('[CRON] Nightly maintenance başarısız:', error);
        }

        console.log('[CRON] Nightly maintenance tamamlandı.');
    });

    console.log('Cron jobs initialized.');
}
