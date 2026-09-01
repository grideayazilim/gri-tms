/* ============================================
   DIŞA AKTARMA (EXPORT) ŞEMALARI
   Excel çıktı taleplerinin validasyonu
   ============================================ */
import { z } from 'zod';

export const exportQuerySchema = z.object({
    // UUID doğrulaması — geçersiz string Postgres'e ulaşıp 22P02 ile 500 üretiyordu
    locationId: z.string().uuid('Geçersiz yerleşke kimliği'),
    year: z.coerce
        .number({ invalid_type_error: 'Yıl sayısal olmalıdır' })
        .int('Yıl tam sayı olmalıdır')
        .min(2000, 'Geçerli bir yıl giriniz'),
    month: z.coerce
        .number({ invalid_type_error: 'Ay sayısal olmalıdır' })
        .int('Ay tam sayı olmalıdır')
        .min(1, 'Ay 1-12 arasında olmalıdır')
        .max(12, 'Ay 1-12 arasında olmalıdır'),
});

export type ExportQueryType = z.infer<typeof exportQuerySchema>;
