/* ========================================================================
   CRON JOBS (ZAMANLANMIŞ GÖREVLER)
   Sistem bakımı, süresi dolan kullanıcıların kapatılması ve dönem kilitleme
   ======================================================================== */
import cron from 'node-cron';

import { withTransaction } from '../config/database.js';
import { formatPeriodLabel } from './dateUtils.js';
import { createAuditLog, SYSTEM_CRON_ACTOR, truncateChanges } from './auditLogger.js';
import { AUDIT_ACTION, AUDIT_ENTITY_TYPE, USER_STATUS } from '@timesheet/shared';

export function initCronJobs() {
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Nightly maintenance başladı...');

        try {
            await withTransaction(async (client) => {
                // Süresi (expiry_date) bugün itibariyle dolmuş olan ACTIVE kullanıcılar için durum güncellemesi
                const expiredUsers = await client.query(`
                    UPDATE app.users
                    SET status = '${USER_STATUS.EXPIRED}'
                    WHERE expiry_date < NOW() AND status = '${USER_STATUS.ACTIVE}'
                    RETURNING id, username;
                `);


                if (expiredUsers.rowCount > 0) {
                    console.log(`[CRON] ${expiredUsers.rowCount} kullanıcı EXPIRED olarak işaretlendi.`);

                    const changes = truncateChanges(
                        expiredUsers.rows.map((u) => `${u.username}`),
                        50,
                    );

                    await createAuditLog(client, {
                        action: AUDIT_ACTION.USER_AUTO_EXPIRE,
                        actor: SYSTEM_CRON_ACTOR,
                        entityType: AUDIT_ENTITY_TYPE.USER,
                        summary: `${expiredUsers.rowCount} kullanıcının süresi doldu ve EXPIRED olarak işaretlendi.`,
                        changes,
                        metadata: {
                            expiredCount: expiredUsers.rowCount,
                            usernames: expiredUsers.rows.slice(0, 50).map((u) => u.username),
                        },
                    });
                }

                // Dönem bitişinden (end_date) 3 gün sonra otomatik kilitleme yapar
                const lockedPeriods = await client.query(`
                    UPDATE app.periods
                    SET is_locked = true
                    WHERE is_locked = false
                      AND CURRENT_DATE >= (end_date + INTERVAL '3 days')::DATE
                    RETURNING id, year, month;
                `);


                for (const row of lockedPeriods.rows) {
                    const periodLabel = formatPeriodLabel(row.year, row.month);
                    console.log(`[CRON] Dönem kapatıldı: ${row.year}-${row.month}`);

                    await createAuditLog(client, {
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
        } catch (error) {
            console.error('[CRON] Nightly maintenance başarısız:', error);
        }

        console.log('[CRON] Nightly maintenance tamamlandı.');
    });

    console.log('Cron jobs initialized.');
}
