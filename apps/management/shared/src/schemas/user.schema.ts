/* ============================================
   KULLANICI (USER) ŞEMALARI
   Admin paneli düzenleme ve profil güncellemeleri
   ============================================ */
import { z } from 'zod';

import { USER_ROLE_LIST, USER_ROLE } from '../constants/userConstants';

// Admin Panelinden Kullanıcı Güncelleme: Rol, Tarih ve Yerleşke/Birim kontrolleri

export const userEditSchema = z.object({
    role: z.enum(USER_ROLE_LIST, {
        message: 'Rol seçimi zorunludur',
    }).optional(),
    status: z.string().optional(),
    expiryDate: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
    unitId: z.string().optional().nullable(),
    // Admin tarafından kullanıcının şifresini sıfırlamak için opsiyonel alan
    forceNewPassword: z.string().min(6, 'Şifre en az 6 karakter olmalıdır').optional(),
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
    username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır').optional(),
    oldPassword: z.string().optional(),
    newPassword: z.string().min(3, 'Yeni şifre en az 3 karakter olmalıdır').optional(),
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
