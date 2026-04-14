import { z } from 'zod';

export const userEditSchema = z.object({
    role: z.string().min(1, 'Rol seçimi zorunludur'),
    validityDate: z.string().min(1, 'Geçerlilik tarihi zorunludur'),
    locationId: z.string().optional().nullable(),
    unitId: z.string().optional().nullable(),
});
