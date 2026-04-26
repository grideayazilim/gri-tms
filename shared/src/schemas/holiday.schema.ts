/* ============================================
   TATİL (HOLIDAY) ŞEMASI
   Resmi tatil tanımlamaları
   ============================================ */
import { z } from 'zod';

export const holidayQuerySchema = z.object({
    year: z.coerce
        .number({ invalid_type_error: 'Yıl sayısal olmalıdır' })
        .int('Yıl tam sayı olmalıdır')
        .min(2000, 'Yıl en az 2000 olmalıdır')
        .max(2100, 'Yıl en fazla 2100 olabilir'),
});

export type HolidayQueryType = z.infer<typeof holidayQuerySchema>;
