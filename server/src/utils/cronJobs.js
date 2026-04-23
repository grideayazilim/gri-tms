import cron from 'node-cron';
import { withTransaction } from '../config/database.js';

export function initCronJobs() {
    // Tüm aktif kullanıcıların bitiş tarihlerini kontrol et (Her gece 00:00'da çalışır)
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ [CRON] Checking for expired user accounts...');
        try {
            await withTransaction(async (client) => {
                const result = await client.query(`
                    UPDATE app.users
                    SET status = 'EXPIRED'
                    WHERE expiry_date < NOW() AND status = 'ACTIVE'
                    RETURNING id, username;
                `);

                if (result.rowCount > 0) {
                    console.log(`✅ [CRON] ${result.rowCount} users marked as EXPIRED.`);
                } else {
                    console.log('✅ [CRON] No expired users found.');
                }
            });
        } catch (error) {
            console.error('❌ [CRON Error]: Failed to update expired users:', error);
        }
    });

    // Bulunduğumuz ay bittiğinde, o ayın veri girişini 2 gün sonra (ayın 3'ünde) kapatır
    cron.schedule('0 0 * * *', async () => {
        console.log('⏰ [CRON] Checking for periods to lock (2 days after month end)...');
        try {
            await withTransaction(async (client) => {
                // end_date + 3 gün <= BUGÜN ise kilitler. 
                // Örneğin: end_date = 31 Mayıs. +3 gün = 3 Haziran.
                // 1 ve 2 Haziran'da açık kalır, 3 Haziran 00:00'da kilitlenir.
                const result = await client.query(`
                    UPDATE app.periods
                    SET is_locked = true
                    WHERE is_locked = false 
                      AND CURRENT_DATE >= (end_date + INTERVAL '3 days')::DATE
                    RETURNING id, year, month;
                `);

                if (result.rowCount > 0) {
                    for (const row of result.rows) {
                        console.log(`✅ [CRON] Period locked: ${row.year}-${row.month}`);
                        
                        // İsteğe bağlı olarak Audit Log da atılabilir
                        await client.query(`
                           INSERT INTO app.audit_logs (username, user_role, event_type, table_name, record_id, description)
                           VALUES ($1, $2, $3, $4, $5, $6)
                        `, [
                           'SYSTEM_CRON', 
                           'SYSTEM', 
                           'TIMESHEET', 
                           'periods', 
                           row.id, 
                           `${row.year}-${String(row.month).padStart(2, "0")} dönemi otomatik (CRON) kapatıldı.`
                        ]);
                    }
                } else {
                    console.log('✅ [CRON] No past periods to lock.');
                }
            });
        } catch (error) {
            console.error('❌ [CRON Error]: Failed to lock past periods:', error);
        }
    });

    console.log('🕒 Cron jobs initialized.');
}
