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

    console.log('🕒 Cron jobs initialized.');
}
