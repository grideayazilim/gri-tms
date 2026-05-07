/* ============================================
   KULLANICI SABİTLERİ
   Roller ve durum tanımlamaları
   ============================================ */

export const USER_ROLE = Object.freeze({
    ADMIN: 'ADMIN',
    RESPONSIBLE: 'RESPONSIBLE',
} as const);

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

// #25: Object.values() string[] döndürdüğünden as cast gerekiyordu.
// Tuple elle tanımlandı; satisfies ile UserRole[] uyumluluğu derleme zamanında doğrulanır.
export const USER_ROLE_LIST = ['ADMIN', 'RESPONSIBLE'] as const satisfies readonly UserRole[];

// Kullanıcı Durumları

export const USER_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    PENDING: 'PENDING',
} as const);

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// #25: Aynı pattern — as cast kaldırıldı, satisfies ile tip güvenliği sağlandı.
export const USER_STATUS_LIST = ['ACTIVE', 'EXPIRED', 'PENDING'] as const satisfies readonly UserStatus[];
