export const AUDIT_EVENTS = {
    LOGIN: { code: 'LOGIN', label: 'Giriş' },
    USER: { code: 'USER', label: 'Kullanıcı' },
    EMPLOYEE: { code: 'EMPLOYEE', label: 'Çalışan' },
    TIMESHEET: { code: 'TIMESHEET', label: 'Puantaj' },
    ANNOUNCEMENT: { code: 'ANNOUNCEMENT', label: 'Duyuru' },
    LOCATION_UNIT: { code: 'LOCATION_UNIT', label: 'Yerleşke/Birim' },
    SETTINGS: { code: 'SETTINGS', label: 'Ayarlar' },
    SECURITY: { code: 'SECURITY', label: 'Güvenlik' }
};

// Yardımcı listeler
export const AUDIT_EVENT_LIST = Object.values(AUDIT_EVENTS);