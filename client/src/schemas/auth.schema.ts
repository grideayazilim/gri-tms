import { z } from 'zod';

export const signInSchema = z.object({
    username: z.string().min(1, 'Kullanıcı adı gereklidir'),
    password: z.string().min(3, 'Şifre en az 3 karakter olmalıdır'),
    rememberMe: z.boolean().optional().default(false),
});

export type SignInType = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
    username: z.string().min(3, 'Kullanıcı adı en az 3 karakter olmalıdır'),
    password: z.string().min(3, 'Şifre en az 3 karakter olmalıdır'),
    role: z.enum(['ADMIN', 'RESPONSIBLE'], {
        message: 'Kullanıcı türü seçimi zorunludur',
    }),
    locationId: z.string().optional(),
    unitId: z.string().optional(),
}).superRefine((val, ctx) => {
    if (val.role === 'RESPONSIBLE') {
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
