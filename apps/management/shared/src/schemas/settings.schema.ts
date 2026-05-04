/* ============================================
   AYARLAR (SETTINGS) ŞEMALARI
   Sistem ayarları ve kullanıcı giriş ayarları
   ============================================ */
import { z } from 'zod';

export const loginSettingsSchema = z.object({
    username: z.string().min(1, 'Kullanıcı adı gereklidir'),
    currentPassword: z.string().optional().or(z.literal('')),
    password: z.string().min(3, 'Yeni şifre en az 3 karakter olmalıdır').optional().or(z.literal('')),
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
    // Boş string veya geçerli sayı kabul edilir; tip kasıtlı olarak number | ''
    dailyWage: z.union([z.coerce.number().min(0, 'Geçerli bir ödenek giriniz'), z.literal('')]),
    maxWeeklyDays: z.union([z.coerce.number().min(0, 'Geçerli bir limit giriniz'), z.literal('')]),
    programStartDate: z.string().optional().or(z.literal('')),
    programEndDate: z.string().optional().or(z.literal('')),
});

export type SystemSettingsType = z.infer<typeof systemSettingsSchema>;
