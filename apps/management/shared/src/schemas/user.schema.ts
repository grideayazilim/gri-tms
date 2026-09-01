/* ============================================
   KULLANICI (USER) ŞEMALARI
   Admin paneli düzenleme ve profil güncellemeleri
   ============================================ */
import { z } from 'zod';

import { USER_ROLE_LIST, USER_ROLE, USER_STATUS_LIST } from '../constants/userConstants';
import { passwordPolicy } from './auth.schema';

// Admin Panelinden Kullanıcı Güncelleme: Rol, Tarih ve Yerleşke/Birim kontrolleri

export const userEditSchema = z.object({
    role: z.enum(USER_ROLE_LIST, {
        message: 'Rol seçimi zorunludur',
    }).optional(),
    // USER_STATUS_LIST enum'u kullanıldı — herhangi bir string artık geçmiyor
    status: z.enum(USER_STATUS_LIST).optional(),
    expiryDate: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
    unitId: z.string().optional().nullable(),
    // Admin tarafından kullanıcının şifresini sıfırlamak için opsiyonel alan
    // max(128): bcrypt DoS koruması. Kural gövdesi ortak passwordPolicy'den gelir.
    forceNewPassword: passwordPolicy.optional(),
}).superRefine((val, ctx) => {
    // Birim Sorumlusu (RESPONSIBLE) için ek kısıtlamalar:
    // Hesap süresi (expiryDate), Yerleşke ve Birim tanımlı olmalıdır.
    if (val.role === USER_ROLE.RESPONSIBLE) {

        if (!val.expiryDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Birim sorumlusu için geçerlilik tarihi zorunludur',
                path: ['expiryDate'],
            });
        }
        if (!val.locationId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Birim sorumlusu için yerleşke seçimi zorunludur',
                path: ['locationId'],
            });
        }
        if (!val.unitId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Birim sorumlusu için birim seçimi zorunludur',
                path: ['unitId'],
            });
        }
    }
});

export type UserEditType = z.infer<typeof userEditSchema>;

// Kullanıcı Profil Güncelleme: Kullanıcı adı ve şifre değişim kontrolleri

export const profileUpdateSchema = z.object({
    username: z
        .string()
        .trim()
        .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
        .regex(/^\S+$/, 'Kullanıcı adında boşluk olamaz')
        .optional(),
    oldPassword: z.string().optional(),          // şifreler trim edilmez
    newPassword: passwordPolicy.optional(),
}).superRefine((val, ctx) => {
    // Şifre güncelleme mantığı: Eğer eski şifre veya yeni şifre alanlarından biri doluysa,
    // diğeri de dolu olmak zorundadır. Sadece birini doldurmak hata döndürür.
    if ((val.oldPassword && !val.newPassword) || (!val.oldPassword && val.newPassword)) {

        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Şifre değiştirmek için hem eski hem yeni şifre gereklidir',
            path: ['newPassword'],
        });
    }
});

export type ProfileUpdateType = z.infer<typeof profileUpdateSchema>;
