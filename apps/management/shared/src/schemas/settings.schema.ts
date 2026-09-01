/* ============================================
   AYARLAR (SETTINGS) ŞEMALARI
   Sistem ayarları ve kullanıcı giriş ayarları
   ============================================ */
import { z } from 'zod';
import { passwordPolicy } from './auth.schema';

export const loginSettingsSchema = z.object({
    username: z
        .string()
        .trim()
        .min(1, 'Kullanıcı adı gereklidir')
        .regex(/^\S+$/, 'Kullanıcı adında boşluk olamaz'),
    currentPassword: z.string().optional().or(z.literal('')),
    /* Boş string undefined'a çevrilir. Kural gövdesi ortak passwordPolicy'den
       gelir (min 10 + "sadece rakam olamaz" + yaygın şifre yasağı); burada ayrı
       bir kural tanımlanırsa form ile sunucu ayrışır. */
    password: z.preprocess(
        v => (v === '' ? undefined : v),
        passwordPolicy.optional(),
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
    /* Boş string null'a çevrilir; tip number | null. `null` (henüz ayarlanmamış)
       serbesttir, `0` reddedilir — 0 günlük ödenek tüm maaş çıktılarını sessizce
       0 TL yapar. reset.schema.ts ile hizalıdır. */
    dailyWage: z.preprocess(
        v => (v === '' ? null : v),
        z.coerce.number().nullable().refine(v => v === null || v > 0, 'Günlük ödenek sıfırdan büyük olmalıdır'),
    ),
    // Aynı preprocess pattern; .int() ile reset.schema.ts'e hizalı
    maxWeeklyDays: z.preprocess(
        v => (v === '' ? null : v),
        z.coerce.number().int().nullable().refine(v => v === null || v > 0, 'Haftalık gün sınırı sıfırdan büyük olmalıdır'),
    ),
    // YYYY-MM-DD format doğrulaması (reset.schema.ts ile tutarlı)
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
