/* ============================================
   İÇE AKTARMA (IMPORT) ŞEMALARI
   Excel verilerinin validasyonu
   ============================================ */
import { z } from 'zod';

export const importEmployeeSchema = z.object({
    // employee.schema.ts ile aynı validasyon uygulandı
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
    // employeeSchema ile aynı IBAN format validasyonu (opsiyonel)
    ibanNo: z
        .string()
        .trim()
        .length(26, 'IBAN TR dahil 26 hane olmalıdır')
        .regex(/^TR\d{24}$/, 'IBAN "TR" ile başlamalı ve ardından 24 rakam içermelidir')
        .optional()
        .nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    phoneNo: z.string().optional().nullable(),
    markers: z.record(z.string(), z.string()).optional().nullable(),
});

export const importFinalizeSchema = z.object({
    locationName: z.string().min(1, 'Yerleşke adı zorunludur'),
    year: z.coerce.number().int().min(2000, 'Geçerli bir yıl giriniz'),
    month: z.coerce.number().int().min(1).max(12, 'Ay 1-12 arasında olmalıdır'),
    createdCount: z.coerce.number().optional().default(0),
    skippedCount: z.coerce.number().optional().default(0),
    dailyWage: z.coerce.number().optional().nullable(),
    // Bilinen yapı tanımlandı — name (çalışan adı) + daysCount (çalışılan gün sayısı)
    timesheetChanges: z
        .array(z.object({ name: z.string(), daysCount: z.number() }))
        .optional()
        .default([]),
});

/* Tarih formatı doğrulanmıyordu — bozuk tarih Postgres'e ulaşıp 22007 ile
   tüm transaction'ı ABORT ediyordu. Hataların çoğunu DB'ye ulaşmadan yakala. */
const isoDate = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-MM-DD formatında olmalıdır');

export const bulkImportEmployeeSchema = z
    .object({
        tcNo: z.string().trim().regex(/^\d{11}$/, 'TC No 11 haneli rakam olmalıdır'),
        fullName: z.string().trim().min(1, 'Ad Soyad zorunludur').max(120, 'Ad Soyad en fazla 120 karakter olabilir'),
        locationName: z.string().trim().min(1, 'Yerleşke adı zorunludur').max(120, 'Yerleşke adı en fazla 120 karakter olabilir'),
        unitName: z.string().trim().max(120, 'Birim adı en fazla 120 karakter olabilir').optional().nullable(),
        ibanNo: z
            .string()
            .trim()
            .regex(/^TR\d{24}$/, 'IBAN "TR" ile başlamalı ve ardından 24 rakam içermelidir')
            .optional()
            .nullable(),
        phoneNo: z.string().trim().max(30, 'Telefon en fazla 30 karakter olabilir').optional().nullable(),
        startDate: isoDate.optional().nullable(),
        endDate: isoDate.optional().nullable(),
    })
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
        message: 'İşten çıkış tarihi, işe giriş tarihinden önce olamaz',
        path: ['endDate'],
    });

export const bulkImportEmployeesSchema = z.object({
    // Sınırsız dizi — tek istekte 100k kayıt tek transaction'a giriyordu
    employees: z
        .array(bulkImportEmployeeSchema)
        .min(1, 'En az bir çalışan kaydı gereklidir')
        .max(500, 'Tek seferde en fazla 500 çalışan aktarılabilir'),
});

/* Tüm diziyi tek parça doğrulamak, tek hatalı satır yüzünden 500 geçerli
   satırı da 400 ile reddediyordu. Zarf yalnızca dizi sınırlarını kontrol eder;
   satırlar controller içinde tek tek doğrulanır ve hatalı olanlar rapora yazılır. */
export const bulkImportEnvelopeSchema = z.object({
    employees: z
        .array(z.unknown())
        .min(1, 'En az bir çalışan kaydı gereklidir')
        .max(500, 'Tek seferde en fazla 500 çalışan aktarılabilir'),
});

export type ImportEmployeeType = z.infer<typeof importEmployeeSchema>;
export type ImportFinalizeType = z.infer<typeof importFinalizeSchema>;
export type BulkImportEmployeeType = z.infer<typeof bulkImportEmployeeSchema>;
export type BulkImportEmployeesType = z.infer<typeof bulkImportEmployeesSchema>;
export type BulkImportEnvelopeType = z.infer<typeof bulkImportEnvelopeSchema>;
