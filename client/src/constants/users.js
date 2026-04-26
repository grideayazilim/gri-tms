import { USER_ROLE, USER_STATUS } from '@timesheet/shared';

/** Rol görsel konfigürasyonu — pill renkleri ve etiketleri */
export const USER_ROLES = {
    [USER_ROLE.ADMIN]: { 
        code: USER_ROLE.ADMIN, 
        label: 'Admin', 
        bg: 'rgba(139,92,246,0.12)', 
        color: '#7c3aed' 
    },
    [USER_ROLE.RESPONSIBLE]: { 
        code: USER_ROLE.RESPONSIBLE, 
        label: 'Birim Sorumlusu', 
        bg: 'rgba(59,130,246,0.12)', 
        color: '#2563eb' 
    },
};

/** Durum görsel konfigürasyonu — pill renkleri ve etiketleri */
export const USER_STATUS_CONFIG = {
    [USER_STATUS.ACTIVE]: { 
        code: USER_STATUS.ACTIVE, 
        label: 'Aktif', 
        bg: 'rgba(34,197,94,0.12)', 
        color: '#16a34a' 
    },
    [USER_STATUS.EXPIRED]: { 
        code: USER_STATUS.EXPIRED, 
        label: 'Süresi Dolmuş', 
        bg: 'rgba(239,68,68,0.12)', 
        color: '#dc2626' 
    },
    [USER_STATUS.PENDING]: { 
        code: USER_STATUS.PENDING, 
        label: 'Onay Bekliyor', 
        bg: 'rgba(245,158,11,0.12)', 
        color: '#d97706' 
    },
};

/** Yardımcı listeler */
export const USER_ROLE_LIST = Object.values(USER_ROLES);
export const USER_STATUS_LIST = Object.values(USER_STATUS_CONFIG);

/** Rol kodundan doğru konfigürasyonu döndürür */
export const getRoleConfig = (role) =>
    USER_ROLES[role] ?? { 
        code: role, 
        label: role ?? '-', 
        bg: 'rgba(107,114,128,0.12)', 
        color: '#4b5563' 
    };

/** Durum koduna göre görsel konfigürasyonu döndürür */
export const getUserStatusConfig = (status, expiryDate) => {
    // Statü EXPIRED değilse ama tarih geçmişse, dinamik olarak EXPIRED konfigürasyonu döndür
    if (status !== USER_STATUS.EXPIRED && expiryDate && new Date(expiryDate) < new Date()) {
        return USER_STATUS_CONFIG[USER_STATUS.EXPIRED];
    }
    return USER_STATUS_CONFIG[status] ?? { 
        code: status, 
        label: status ?? '-', 
        bg: 'rgba(107,114,128,0.12)', 
        color: '#4b5563' 
    };
};
