/* ============================================
   AYARLAR (SETTINGS) ŞEMALARI
   Sistem ayarları ve kullanıcı giriş ayarları
   ============================================ */
import { z } from 'zod';

export const loginSettingsSchema = z.object({
    username: z.string().min(1, 'Kullanıcı adı gereklidir'),
    password: z.string().min(3, 'Şifre en az 3 karakter olmalıdır').optional().or(z.literal('')),
});

export type LoginSettingsType = z.infer<typeof loginSettingsSchema>;

export const systemSettingsSchema = z.object({
    dailyAllowance: z.coerce.number().min(0, 'Geçerli bir ödenek giriniz').or(z.string().length(0)),
    weeklyLimit: z.coerce.number().min(0, 'Geçerli bir limit giriniz').or(z.string().length(0)),
    programStart: z.string().optional().or(z.literal('')),
    programEnd: z.string().optional().or(z.literal('')),
});

export type SystemSettingsType = z.infer<typeof systemSettingsSchema>;
