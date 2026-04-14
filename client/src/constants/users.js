export const USER_ROLES = {
  ADMIN: { code: 'ADMIN', label: 'Admin', bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
  RESPONSIBLE: { code: 'RESPONSIBLE', label: 'Birim Sorumlusu', bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
};

// Süresi dolmuş kullanıcılar PASSIVE olarak backend tarafından zaten işaretlenir
export const USER_STATUS = {
  ACTIVE: { code: 'ACTIVE', label: 'Aktif', bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
  PENDING: { code: 'PENDING', label: 'Onay Bekliyor', bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  PASSIVE: { code: 'PASSIVE', label: 'Pasif', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
};

// Yardımcı listeler
export const USER_ROLE_LIST = Object.values(USER_ROLES);
export const USER_STATUS_LIST = Object.values(USER_STATUS);

/** Rol kodundan doğru config'i döndürür */
export const getRoleConfig = (role) =>
  USER_ROLES[role] ?? { code: role, label: role ?? '-', bg: 'rgba(107,114,128,0.12)', color: '#4b5563' };

/** Status + expiryDate'ten doğru config'i döndürür */
export const getUserStatusConfig = (status, expiryDate) => {
  if (status !== 'PASSIVE' && expiryDate && new Date(expiryDate) < new Date()) {
    return USER_STATUS.PASSIVE;
  }
  return USER_STATUS[status] ?? { code: status, label: status ?? '-', bg: 'rgba(107,114,128,0.12)', color: '#4b5563' };
};
