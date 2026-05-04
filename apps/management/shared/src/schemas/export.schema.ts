/* ============================================
   DIŞA AKTARMA (EXPORT) ŞEMALARI
   Excel çıktı taleplerinin validasyonu
   ============================================ */
import { z } from 'zod';

export const exportQuerySchema = z.object({
    locationId: z.string().min(1, 'Yerleşke seçimi zorunludur'),
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
