/* ============================================
   KULLANICI SABİTLERİ
   Roller ve durum tanımlamaları
   ============================================ */

export const USER_ROLE = Object.freeze({
    ADMIN: 'ADMIN',
    RESPONSIBLE: 'RESPONSIBLE',
} as const);

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

export const USER_ROLE_LIST = Object.values(USER_ROLE) as [UserRole, ...UserRole[]];

// Kullanıcı Durumları

export const USER_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    PENDING: 'PENDING',
} as const);

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

export const USER_STATUS_LIST = Object.values(USER_STATUS) as [UserStatus, ...UserStatus[]];
