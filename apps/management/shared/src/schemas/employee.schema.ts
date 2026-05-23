/* ============================================
   ÇALIŞAN (EMPLOYEE) ŞEMASI
   Yeni çalışan ekleme ve bilgi güncelleme
   ============================================ */
import { z } from 'zod';

export const employeeSchema = z.object({
    tcNo: z
        .string()
        .trim()
        .regex(/^\d{11}$/, 'TC No 11 haneli rakamlardan oluşmalıdır'),
    firstName: z.string().trim().min(1, 'Ad zorunludur').transform(v => v.toLocaleUpperCase('tr-TR')),
    lastName: z.string().trim().min(1, 'Soyad zorunludur').transform(v => v.toLocaleUpperCase('tr-TR')),
    locationId: z.string().min(1, 'Yerleşke seçimi zorunludur'),
    unitId: z.string().min(1, 'Birim seçimi zorunludur'),
    startDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'İşe giriş tarihi YYYY-MM-DD formatında olmalıdır'),
    // İşten çıkış tarihi (endDate) opsiyoneldir, aktif çalışanlar için boş bırakılır.
    endDate: z
        .string()
        .optional()
        .nullable()
        .transform(v => (v === '' ? null : v)),

    // IBAN: TR ile başlayan, ardından 24 rakam gelen, boşluksuz 26 karakter.
    ibanNo: z
        .string()
        .trim()
        .length(26, 'IBAN TR dahil 26 hane olmalıdır')
        .regex(/^TR\d{24}$/, 'IBAN "TR" ile başlamalı ve ardından 24 rakam içermelidir'),

    isActive: z.boolean().default(true),
});

export type EmployeeType = z.infer<typeof employeeSchema>;
