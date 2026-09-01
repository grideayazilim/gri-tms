/* ============================================
   SİSTEM SIFIRLAMA ŞEMASI
   POST /settings/reset endpoint validasyonu
   ============================================ */
import { z } from 'zod';

export const systemResetSchema = z.object({
  backup: z.boolean(),
  deleteLocationsAndUnits: z.boolean(),
  newSettings: z.object({
    dailyWage: z.number().positive('Günlük ücret 0\'dan büyük olmalıdır'),
    maxWeeklyDays: z.number().int().positive('Haftalık gün sınırı 0\'dan büyük olmalıdır'),
    programStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir başlangıç tarihi giriniz (YYYY-MM-DD)'),
    programEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Geçerli bir bitiş tarihi giriniz (YYYY-MM-DD)'),
  }).refine(
    // ISO string karşılaştırması yerine Date objesi kullanıldı — daha güvenilir
    (val) => new Date(val.programEndDate) > new Date(val.programStartDate),
    { message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır', path: ['programEndDate'] },
  ),
});

export type SystemResetType = z.infer<typeof systemResetSchema>;
