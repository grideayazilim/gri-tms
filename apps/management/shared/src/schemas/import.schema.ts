/* ============================================
   İÇE AKTARMA (IMPORT) ŞEMALARI
   Excel verilerinin validasyonu
   ============================================ */
import { z } from 'zod';

export const importEmployeeSchema = z.object({
    // #7: employee.schema.ts ile aynı validasyon uygulandı
    tcNo: z
        .string()
        .length(11, 'TC No 11 haneli olmalıdır')
        .regex(/^\d{11}$/, 'TC No yalnızca rakamlardan oluşmalıdır'),
    firstName: z.string().min(1, 'Ad zorunludur'),
    lastName: z.string().min(1, 'Soyad zorunludur'),
    locationId: z.string().min(1, 'Yerleşke zorunludur'),
    year: z.coerce.number().int().min(2000, 'Geçerli bir yıl giriniz'),
    month: z.coerce.number().int().min(1).max(12, 'Ay 1-12 arasında olmalıdır'),
    unitName: z.string().optional().nullable(),
    // #8: employeeSchema ile aynı IBAN format validasyonu (opsiyonel)
    ibanNo: z
        .string()
        .trim()
        .length(26, 'IBAN TR dahil 26 hane olmalıdır')
        .regex(/^TR\d{24}$/, 'IBAN "TR" ile başlamalı ve ardından 24 rakam içermelidir')
        .optional()
        .nullable(),
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
    // #9: Bilinen yapı tanımlandı — name (çalışan adı) + daysCount (çalışılan gün sayısı)
    timesheetChanges: z
        .array(z.object({ name: z.string(), daysCount: z.number() }))
        .optional()
        .default([]),
});

export const bulkImportEmployeesSchema = z.object({
    employees: z.array(z.object({
        tcNo: z.string().min(1),
        fullName: z.string().min(1),
        locationName: z.string().min(1),
        unitName: z.string().optional().nullable(),
        ibanNo: z.string().optional().nullable(),
        startDate: z.string().optional().nullable(),
        endDate: z.string().optional().nullable(),
    })),
});

export type ImportEmployeeType = z.infer<typeof importEmployeeSchema>;
export type ImportFinalizeType = z.infer<typeof importFinalizeSchema>;
export type BulkImportEmployeesType = z.infer<typeof bulkImportEmployeesSchema>;
