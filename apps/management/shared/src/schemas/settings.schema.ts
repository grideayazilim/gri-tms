/* ============================================
   AYARLAR (SETTINGS) ŞEMALARI
   Sistem ayarları ve kullanıcı giriş ayarları
   ============================================ */
import { z } from 'zod';

export const loginSettingsSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, 'Kullanıcı adı gereklidir')
        .regex(/^\S+$/, 'Kullanıcı adında boşluk olamaz'),
    currentPassword: z.string().optional().or(z.literal('')),
    // #13: optional + transform — boş string undefined'a çevrilir, or(literal('')) kaldırıldı
    password: z.preprocess(
        v => (v === '' ? undefined : v),
        z.string().min(8, 'Yeni şifre en az 8 karakter olmalıdır').optional(),
    ),
}).superRefine((val, ctx) => {
    // Yeni şifre girilmişse mevcut şifre de zorunludur
    if (val.password && !val.currentPassword) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Yeni şifre için mevcut şifrenizi giriniz',
            path: ['currentPassword'],
        });
    }
});

export type LoginSettingsType = z.infer<typeof loginSettingsSchema>;

export const systemSettingsSchema = z.object({
    // #10: Boş string null'a çevrilir; tip number | null (artık "" yok)
    dailyWage: z.preprocess(
        v => (v === '' ? null : v),
        z.coerce.number().min(0, 'Geçerli bir ödenek giriniz').nullable(),
    ),
    // #10 + #11: Aynı preprocess pattern; .int() eklendi (reset.schema.ts ile tutarlı)
    maxWeeklyDays: z.preprocess(
        v => (v === '' ? null : v),
        z.coerce.number().int().min(0, 'Geçerli bir limit giriniz').nullable(),
    ),
    // #12: YYYY-MM-DD format validasyonu eklendi (reset.schema.ts ile tutarlı)
    programStartDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Başlangıç tarihi YYYY-MM-DD formatında olmalıdır')
        .optional()
        .or(z.literal('')),
    programEndDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Bitiş tarihi YYYY-MM-DD formatında olmalıdır')
        .optional()
        .or(z.literal('')),
});

export type SystemSettingsType = z.infer<typeof systemSettingsSchema>;
