import { z } from 'zod';

export const employeeSchema = z.object({
    tc: z.string().length(11, 'TC No 11 haneli olmalıdır'),
    name: z.string().min(2, 'Ad Soyad en az 2 karakter olmalıdır'),
    location: z.string().min(1, 'Yerleşke seçimi zorunludur'),
    unit: z.string().min(1, 'Birim seçimi zorunludur'),
    startDate: z.string().min(1, 'İşe giriş tarihi zorunludur'),
    endDate: z.string().optional().nullable(),
    iban: z.string().min(24, 'Geçerli bir IBAN giriniz').max(34, 'Geçerli bir IBAN giriniz').optional().nullable(),
});
