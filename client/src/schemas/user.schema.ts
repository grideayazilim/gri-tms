import { z } from 'zod';

export const userEditSchema = z.object({
    role: z.string().min(1, 'Rol seçimi zorunludur'),
    validityDate: z.string().min(1, 'Geçerlilik tarihi zorunludur'),
    location: z.string().min(1, 'Yerleşke seçimi zorunludur'),
    unit: z.string().min(1, 'Birim seçimi zorunludur'),
});
