export const EMPLOYEE_STATUS = {
  ACTIVE:   { code: 'active',   label: 'Devam ediyor',    bg: 'rgba(34,197,94,0.12)',  color: '#16a34a' },
  INACTIVE: { code: 'inactive', label: 'İşten çıkarıldı', bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
} as const;

// Yardımcı liste
export const EMPLOYEE_STATUS_LIST = Object.values(EMPLOYEE_STATUS);

/** isActive boolean'ından doğru config'i döndürür */
export const getEmployeeStatusConfig = (isActive: boolean | null | undefined) =>
  isActive ? EMPLOYEE_STATUS.ACTIVE : EMPLOYEE_STATUS.INACTIVE;
