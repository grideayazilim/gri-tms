export const USER_ROLES = {
    ADMIN: { code: 'ADMIN', label: 'Admin' },
    RESPONSIBLE: { code: 'RESPONSIBLE', label: 'Sorumlu' }
};

export const USER_STATUS = {
    ACTIVE: { code: 'ACTIVE', label: 'Aktif' },
    PENDING: { code: 'PENDING', label: 'Onay Bekliyor' },
    DEACTIVE: { code: 'DEACTIVE', label: 'Pasif' }
};

// Yardımcı listeler
export const USER_ROLE_LIST = Object.values(USER_ROLES);
export const USER_STATUS_LIST = Object.values(USER_STATUS);
