import { z } from 'zod';

export const employeeSchema = z.object({
    tcNo: z.string().length(11, 'TC No 11 haneli olmalıdır'),
    firstName: z.string().min(1, 'Ad zorunludur'),
    lastName: z.string().min(1, 'Soyad zorunludur'),
    locationId: z.string().min(1, 'Yerleşke seçimi zorunludur'),
    unitId: z.string().min(1, 'Birim seçimi zorunludur'),
    startDate: z.string().min(1, 'İşe giriş tarihi zorunludur'),
    endDate: z.string().optional().nullable(),
    ibanNo: z
        .string()
        .min(24, 'Geçerli bir IBAN giriniz')
        .max(34, 'Geçerli bir IBAN giriniz')
        .optional()
        .nullable()
        .or(z.literal('')),
    isActive: z.boolean().default(true),
});
