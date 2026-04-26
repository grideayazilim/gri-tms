/* ============================================
   ÇALIŞAN (EMPLOYEE) ŞEMASI
   Yeni çalışan ekleme ve bilgi güncelleme
   ============================================ */
import { z } from 'zod';

export const employeeSchema = z.object({
    tcNo: z.string().length(11, 'TC No 11 haneli olmalıdır'),
    firstName: z.string().min(1, 'Ad zorunludur'),
    lastName: z.string().min(1, 'Soyad zorunludur'),
    locationId: z.string().min(1, 'Yerleşke seçimi zorunludur'),
    unitId: z.string().min(1, 'Birim seçimi zorunludur'),
    startDate: z.string().min(1, 'İşe giriş tarihi zorunludur'),
    // İşten çıkış tarihi (endDate) opsiyoneldir, aktif çalışanlar için boş bırakılır.
    endDate: z.string().optional().nullable().or(z.literal('')),

    // IBAN formatı TR ile başlayan 26 hane olacak şekilde valide edilir.
    ibanNo: z
        .string()
        .min(26, 'IBAN TR dahil 26 hane olmalıdır')
        .max(26, 'IBAN TR dahil 26 hane olmalıdır'),

    isActive: z.boolean().default(true),
});

export type EmployeeType = z.infer<typeof employeeSchema>;
