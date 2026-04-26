/* ============================================
   KULLANICI SABİTLERİ
   Roller ve durum tanımlamaları
   ============================================ */

export const USER_ROLE = Object.freeze({
    ADMIN: 'ADMIN',
    RESPONSIBLE: 'RESPONSIBLE',
});

export const USER_ROLE_LIST = Object.values(USER_ROLE);

// Kullanıcı Durumları

export const USER_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    EXPIRED: 'EXPIRED',
    PENDING: 'PENDING',
});

export const USER_STATUS_LIST = Object.values(USER_STATUS);
