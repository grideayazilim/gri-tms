// İşlem türleri
export const AUDIT_EVENT = Object.freeze({
  // ==================== AUTH ====================
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",

  // ==================== ENTITIES ====================
  USER: "USER",
  EMPLOYEE: "EMPLOYEE",
  TIMESHEET: "TIMESHEET",
  MARKER: "MARKER",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  LOCATION_UNIT: "LOCATION_UNIT",

  // ==================== SYSTEM ====================
  SETTINGS: "SETTINGS",  // Periods da buraya dahil

  // ==================== SECURITY ====================
  SECURITY: "SECURITY",
});

// Tüm işlem türlerini liste olarak döndür
export function getAllEventTypes() {
  return Object.values(AUDIT_EVENT);
}