/* ============================================
   AUTH (KİMLİK DOĞRULAMA) ŞEMALARI
   Giriş yapma ve Kayıt olma validasyonları
   ============================================ */
import { z } from 'zod';

import { USER_ROLE_LIST, USER_ROLE } from '../constants/userConstants';

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
    password: z.string().min(8, 'Şifre en az 8 karakter olmalıdır'),
    role: z.enum(USER_ROLE_LIST, {
        message: 'Kullanıcı türü seçimi zorunludur',
    }),
    locationId: z.string().optional().nullable(),
    unitId: z.string().optional().nullable(),
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
