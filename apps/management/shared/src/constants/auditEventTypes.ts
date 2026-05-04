/* ========================================================================
   AUDIT LOG (DENETİM İZİ) SABİTLERİ
   Sistemdeki tüm aksiyonların, varlıkların ve kategorilerin tanımları
   ======================================================================== */


// Action Kodları: Log kaydında 'action' kolonuna yazılan değerler


export const AUDIT_ACTION = Object.freeze({
  // Auth
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_REGISTER: 'USER_REGISTER',
  USER_PASSWORD_CHANGE: 'USER_PASSWORD_CHANGE',
  USER_PROFILE_UPDATE: 'USER_PROFILE_UPDATE',
  // User management
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_APPROVE: 'USER_APPROVE',
  USER_REJECT: 'USER_REJECT',
  USER_AUTO_EXPIRE: 'USER_AUTO_EXPIRE',
  // Employee
  EMPLOYEE_CREATE: 'EMPLOYEE_CREATE',
  EMPLOYEE_UPDATE: 'EMPLOYEE_UPDATE',
  EMPLOYEE_DELETE: 'EMPLOYEE_DELETE',
  // Timesheet & periods
  TIMESHEET_SAVE: 'TIMESHEET_SAVE',
  PERIOD_LOCK: 'PERIOD_LOCK',
  PERIOD_UNLOCK: 'PERIOD_UNLOCK',
  PERIOD_AUTO_LOCK: 'PERIOD_AUTO_LOCK',
  // Announcement
  ANNOUNCEMENT_CREATE: 'ANNOUNCEMENT_CREATE',
  ANNOUNCEMENT_UPDATE: 'ANNOUNCEMENT_UPDATE',
  ANNOUNCEMENT_DELETE: 'ANNOUNCEMENT_DELETE',
  // Location / Unit
  LOCATION_CREATE: 'LOCATION_CREATE',
  LOCATION_UPDATE: 'LOCATION_UPDATE',
  LOCATION_DELETE: 'LOCATION_DELETE',
  LOCATION_SYNC: 'LOCATION_SYNC',
  UNIT_CREATE: 'UNIT_CREATE',
  UNIT_UPDATE: 'UNIT_UPDATE',
  UNIT_DELETE: 'UNIT_DELETE',
  // Settings
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  SYSTEM_RESET: 'SYSTEM_RESET',
  // Excel
  EXCEL_IMPORT: 'EXCEL_IMPORT',
  EXCEL_EXPORT: 'EXCEL_EXPORT',
  BULK_EMPLOYEE_IMPORT: 'BULK_EMPLOYEE_IMPORT',
} as const);

export type AuditAction = typeof AUDIT_ACTION[keyof typeof AUDIT_ACTION];

// Entity Tipleri: Log kaydında 'entity_type' kolonuna yazılan değerler

export const AUDIT_ENTITY_TYPE = Object.freeze({
  USER: 'users',
  EMPLOYEE: 'employees',
  TIMESHEET: 'timesheets',
  PERIOD: 'periods',
  ANNOUNCEMENT: 'announcements',
  LOCATION: 'locations',
  UNIT: 'units',
  SETTINGS: 'settings',
} as const);

export type AuditEntityType = typeof AUDIT_ENTITY_TYPE[keyof typeof AUDIT_ENTITY_TYPE];

// Genel Kategoriler: Arayüzdeki renkler, etiketler ve filtreleme grupları için

export const AUDIT_CATEGORIES = {
  AUTH: { code: 'AUTH', label: 'Kimlik Doğrulama', bg: 'rgba(139,92,246,0.12)', color: '#7c3aed' },
  USER: { code: 'USER', label: 'Kullanıcı', bg: 'rgba(59,130,246,0.12)', color: '#2563eb' },
  EMPLOYEE: { code: 'EMPLOYEE', label: 'Çalışan', bg: 'rgba(34,197,94,0.12)', color: '#16a34a' },
  TIMESHEET: { code: 'TIMESHEET', label: 'Puantaj', bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
  ANNOUNCEMENT: { code: 'ANNOUNCEMENT', label: 'Duyuru', bg: 'rgba(236,72,153,0.12)', color: '#be185d' },
  LOCATION_UNIT: { code: 'LOCATION_UNIT', label: 'Yerleşke/Birim', bg: 'rgba(20,184,166,0.12)', color: '#0f766e' },
  SETTINGS: { code: 'SETTINGS', label: 'Ayarlar', bg: 'rgba(107,114,128,0.12)', color: '#4b5563' },
  EXCEL_IMPORT: { code: 'EXCEL_IMPORT', label: 'Excel İçe Aktarma', bg: 'rgba(124,179,66,0.15)', color: '#7cb342' },
  EXCEL_EXPORT: { code: 'EXCEL_EXPORT', label: 'Excel Dışa Aktarma', bg: 'rgba(30,126,52,0.12)', color: '#1e7e34' },
} as const;

export type AuditCategory = keyof typeof AUDIT_CATEGORIES;

export const AUDIT_CATEGORY_LIST = Object.values(AUDIT_CATEGORIES);

// Action Metadataları: Action -> Kategori eşleşmesi ve okunabilir Türkçe isimler

export const AUDIT_ACTION_META: Record<AuditAction, { category: AuditCategory; label: string }> = {
  USER_LOGIN: { category: 'AUTH', label: 'Giriş Yapma' },
  USER_LOGOUT: { category: 'AUTH', label: 'Çıkış Yapma' },
  USER_REGISTER: { category: 'AUTH', label: 'Kayıt Olma' },
  USER_PASSWORD_CHANGE: { category: 'AUTH', label: 'Şifre Değişimi' },
  USER_PROFILE_UPDATE: { category: 'AUTH', label: 'Profil Güncelleme' },

  USER_CREATE: { category: 'USER', label: 'Kullanıcı Oluşturma' },
  USER_UPDATE: { category: 'USER', label: 'Kullanıcı Güncelleme' },
  USER_DELETE: { category: 'USER', label: 'Kullanıcı Silme' },
  USER_APPROVE: { category: 'USER', label: 'Kullanıcı Onaylama' },
  USER_REJECT: { category: 'USER', label: 'Kullanıcı Reddetme' },
  USER_AUTO_EXPIRE: { category: 'USER', label: 'Kullanıcı Süresi Doldu' },

  EMPLOYEE_CREATE: { category: 'EMPLOYEE', label: 'Çalışan Ekleme' },
  EMPLOYEE_UPDATE: { category: 'EMPLOYEE', label: 'Çalışan Güncelleme' },
  EMPLOYEE_DELETE: { category: 'EMPLOYEE', label: 'Çalışan Silme' },

  TIMESHEET_SAVE: { category: 'TIMESHEET', label: 'Puantaj Kaydetme' },
  PERIOD_LOCK: { category: 'TIMESHEET', label: 'Dönem Kilitleme' },
  PERIOD_UNLOCK: { category: 'TIMESHEET', label: 'Dönem Kilit Açma' },
  PERIOD_AUTO_LOCK: { category: 'TIMESHEET', label: 'Otomatik Dönem Kilitleme' },

  ANNOUNCEMENT_CREATE: { category: 'ANNOUNCEMENT', label: 'Duyuru Oluşturma' },
  ANNOUNCEMENT_UPDATE: { category: 'ANNOUNCEMENT', label: 'Duyuru Güncelleme' },
  ANNOUNCEMENT_DELETE: { category: 'ANNOUNCEMENT', label: 'Duyuru Silme' },

  LOCATION_CREATE: { category: 'LOCATION_UNIT', label: 'Yerleşke Ekleme' },
  LOCATION_UPDATE: { category: 'LOCATION_UNIT', label: 'Yerleşke Güncelleme' },
  LOCATION_DELETE: { category: 'LOCATION_UNIT', label: 'Yerleşke Silme' },
  LOCATION_SYNC: { category: 'LOCATION_UNIT', label: 'Yerleşke Senkronizasyonu' },
  UNIT_CREATE: { category: 'LOCATION_UNIT', label: 'Birim Ekleme' },
  UNIT_UPDATE: { category: 'LOCATION_UNIT', label: 'Birim Güncelleme' },
  UNIT_DELETE: { category: 'LOCATION_UNIT', label: 'Birim Silme' },

  SETTINGS_UPDATE: { category: 'SETTINGS', label: 'Ayarlar Güncelleme' },
  SYSTEM_RESET: { category: 'SETTINGS', label: 'Sistem Sıfırlama' },

  EXCEL_IMPORT: { category: 'EXCEL_IMPORT', label: 'Excel İçe Aktarma' },
  BULK_EMPLOYEE_IMPORT: { category: 'EXCEL_IMPORT', label: 'Toplu Çalışan Aktarma' },
  EXCEL_EXPORT: { category: 'EXCEL_EXPORT', label: 'Excel Dışa Aktarma' },
};

export const AUDIT_ACTION_LIST = Object.entries(AUDIT_ACTION_META).map(([code, meta]) => ({
  code,
  ...meta,
}));

export const getAuditActionMeta = (action: AuditAction) => AUDIT_ACTION_META[action];

export const getAuditCategoryConfig = (category: AuditCategory) => AUDIT_CATEGORIES[category];

/** Action'dan doğrudan kategori display config'i — pill için */
export const getAuditActionCategoryConfig = (action: AuditAction) =>
  getAuditCategoryConfig(getAuditActionMeta(action).category);
