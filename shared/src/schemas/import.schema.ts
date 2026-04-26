/* ============================================
   İÇE AKTARMA (IMPORT) ŞEMALARI
   Excel verilerinin validasyonu
   ============================================ */
import { z } from 'zod';

export const importEmployeeSchema = z.object({
    tcNo: z.string().min(1, 'TC No zorunludur'),
    firstName: z.string().min(1, 'Ad zorunludur'),
    lastName: z.string().min(1, 'Soyad zorunludur'),
    locationId: z.string().min(1, 'Yerleşke zorunludur'),
    year: z.coerce.number().int().min(2000, 'Geçerli bir yıl giriniz'),
    month: z.coerce.number().int().min(1).max(12, 'Ay 1-12 arasında olmalıdır'),
    unitName: z.string().optional().nullable(),
    ibanNo: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    markers: z.record(z.string(), z.string()).optional().nullable(),
});

export const importFinalizeSchema = z.object({
    locationName: z.string().min(1, 'Yerleşke adı zorunludur'),
    year: z.coerce.number().int().min(2000, 'Geçerli bir yıl giriniz'),
    month: z.coerce.number().int().min(1).max(12, 'Ay 1-12 arasında olmalıdır'),
    createdCount: z.coerce.number().optional().default(0),
    skippedCount: z.coerce.number().optional().default(0),
    dailyWage: z.coerce.number().optional().nullable(),
    timesheetChanges: z.array(z.record(z.string(), z.unknown())).optional().default([]),
});

export type ImportEmployeeType = z.infer<typeof importEmployeeSchema>;
export type ImportFinalizeType = z.infer<typeof importFinalizeSchema>;
