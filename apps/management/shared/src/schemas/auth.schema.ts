/* ============================================
   AUTH (KİMLİK DOĞRULAMA) ŞEMALARI
   Giriş yapma ve Kayıt olma validasyonları
   ============================================ */
import { z } from 'zod';

import { USER_ROLE_LIST, USER_ROLE } from '../constants/userConstants';

/* ── Şifre politikası ────────────────────────────────────────────────
   Minimum 10 karakter, sadece rakam olamaz, yaygın şifreler yasak.
   Tüm şifre alanları (kayıt, admin sıfırlama, profil, zorunlu değişim) bunu kullanır. */

/* Tüm şifre yardım metinleri bu sabitten okunur; politika değişirse arayüzdeki
   metin de değişir ve ikisi ayrışmaz. */
export const MIN_PASSWORD_LENGTH = 10;
export const PASSWORD_RULE_TEXT = `En az ${MIN_PASSWORD_LENGTH} karakter, yalnızca rakamlardan oluşamaz`;

const COMMON_PASSWORDS = [
    '1234567890', 'password', 'password1', 'sifre123', 'admin123', 'qwerty123',
    'qwertyuiop', '123456789', '1234512345', 'parola123',
];

export const passwordPolicy = z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır`)
    // Çok uzun şifre bcrypt DoS vektörü olabilir — max 128 karakter
    .max(128, 'Şifre en fazla 128 karakter olabilir')
    .refine((v) => !/^\d+$/.test(v), { message: 'Şifre sadece rakamlardan oluşamaz' })
    .refine((v) => !COMMON_PASSWORDS.includes(v.toLocaleLowerCase('tr-TR')), {
        message: 'Bu şifre çok yaygın, farklı bir şifre seçin',
    });

// Giriş Yapma Şeması: Kullanıcı adı ve şifre kontrolü

export const signInSchema = z.object({
    username: z.string().trim().min(1, 'Kullanıcı adı gereklidir'),
    password: z.string().min(1, 'Şifre gereklidir'),
    rememberMe: z.boolean().optional().default(false),
});

export type SignInType = z.infer<typeof signInSchema>;

// Kayıt Olma Şeması: Rol bazlı zorunlu alan kontrolleri (Yerleşke/Birim)

export const signUpSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
        .regex(/^\S+$/, 'Kullanıcı adında boşluk olamaz'),
    password: passwordPolicy,
    role: z.enum(USER_ROLE_LIST, {
        message: 'Kullanıcı türü seçimi zorunludur',
    }),
    // UUID format validasyonu — boş string geçişini engeller
    locationId: z.string().uuid('Geçersiz yerleşke ID formatı').optional().nullable(),
    unitId: z.string().uuid('Geçersiz birim ID formatı').optional().nullable(),
}).superRefine((val, ctx) => {
    // Sorumlu (RESPONSIBLE) rolü için Yerleşke ve Birim seçimi zorunludur.
    // ADMIN rolünde bu alanlar boş (null) bırakılabilir.
    if (val.role === USER_ROLE.RESPONSIBLE) {

        if (!val.locationId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Yerleşke seçimi zorunludur',
                path: ['locationId'],
            });
        }
        if (!val.unitId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Birim seçimi zorunludur',
                path: ['unitId'],
            });
        }
    }
});

export type SignUpType = z.infer<typeof signUpSchema>;

/* ── İlk giriş / zorunlu şifre değişimi ────────────────────────────────
   Kullanıcı o şifreyle zaten giriş yaptığı için eski şifre tekrar sorulmaz;
   ekranda yalnızca "yeni şifre" ve "yeni şifre (tekrar)" alanları bulunur. */

export const initialPasswordSchema = z
    .object({
        newPassword: passwordPolicy,
        newPasswordConfirm: z.string(),
    })
    .refine((val) => val.newPassword === val.newPasswordConfirm, {
        message: 'Şifreler eşleşmiyor',
        path: ['newPasswordConfirm'],
    });

export type InitialPasswordType = z.infer<typeof initialPasswordSchema>;
