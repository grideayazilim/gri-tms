// İşlem türleri
export const AUDIT_EVENT = Object.freeze({
  // ==================== AUTH ====================
  LOGIN: "LOGIN",

  // ==================== ENTITIES ====================
  USER: "USER",
  EMPLOYEE: "EMPLOYEE",
  TIMESHEET: "TIMESHEET",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  LOCATION_UNIT: "LOCATION_UNIT",

  // ==================== SYSTEM ====================
  SETTINGS: "SETTINGS",

  // ==================== SECURITY ====================
  SECURITY: "SECURITY",

  // ==================== EXPORT / IMPORT ====================
  EXCEL_EXPORT: "EXCEL_EXPORT",
  EXCEL_IMPORT: "EXCEL_IMPORT",
});

// Tüm işlem türlerini liste olarak döndür
export function getAllEventTypes() {
  return Object.values(AUDIT_EVENT);
}