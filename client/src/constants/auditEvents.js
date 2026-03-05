export const AUDIT_EVENTS = {
    LOGIN: { code: 'LOGIN', label: 'Giriş' },
    LOGOUT: { code: 'LOGOUT', label: 'Çıkış' },
    USER: { code: 'USER', label: 'Kullanıcı' },
    EMPLOYEE: { code: 'EMPLOYEE', label: 'Çalışan' },
    TIMESHEET: { code: 'TIMESHEET', label: 'Puantaj' },
    ANNOUNCEMENT: { code: 'ANNOUNCEMENT', label: 'Duyuru' },
    LOCATION: { code: 'LOCATION', label: 'Yerleşke' },
    UNIT: { code: 'UNIT', label: 'Birim' },
    SETTINGS: { code: 'SETTINGS', label: 'Ayarlar' },
    SECURITY: { code: 'SECURITY', label: 'Güvenlik' }
};

// Yardımcı listeler
export const AUDIT_EVENT_LIST = Object.values(AUDIT_EVENTS);