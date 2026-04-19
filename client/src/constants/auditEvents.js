/** İşlem kaydı kategorileri — tabloda pill olarak gösterilir, filtrelerde kullanılır */
export const AUDIT_EVENTS = {
  LOGIN:         { code: 'LOGIN',         label: 'Giriş',          bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
  USER:          { code: 'USER',          label: 'Kullanıcı',      bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
  EMPLOYEE:      { code: 'EMPLOYEE',      label: 'Çalışan',        bg: 'rgba(34,197,94,0.12)',  color: '#16a34a' },
  TIMESHEET:     { code: 'TIMESHEET',     label: 'Puantaj',        bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  ANNOUNCEMENT:  { code: 'ANNOUNCEMENT',  label: 'Duyuru',         bg: 'rgba(236,72,153,0.12)', color: '#be185d' },
  LOCATION_UNIT: { code: 'LOCATION_UNIT', label: 'Yerleşke/Birim', bg: 'rgba(20,184,166,0.12)', color: '#0f766e' },
  SETTINGS:      { code: 'SETTINGS',      label: 'Ayarlar',        bg: 'rgba(107,114,128,0.12)',color: '#4b5563' },
  SECURITY:      { code: 'SECURITY',      label: 'Güvenlik',       bg: 'rgba(239,68,68,0.12)',  color: '#dc2626' },
  EXCEL_EXPORT:  { code: 'EXCEL_EXPORT',  label: 'Excel/Export',   bg: 'rgba(30,126,52,0.12)',  color: '#1e7e34' },
  EXCEL_IMPORT:  { code: 'EXCEL_IMPORT',  label: 'Excel/Import',   bg: 'rgba(124,179,66,0.15)', color: '#7cb342' },
};

// Yardımcı liste (filtre select'lerinde kullanılır)
export const AUDIT_EVENT_LIST = Object.values(AUDIT_EVENTS);

/** eventType kodundan doğru config'i döndürür */
export const getAuditEventConfig = (eventType) =>
  AUDIT_EVENTS[eventType] ?? { code: eventType, label: eventType ?? '-', bg: 'rgba(107,114,128,0.12)', color: '#4b5563' };
