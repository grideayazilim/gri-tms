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
  SETTINGS: "SETTINGS",  // Periods ve Marker da buraya dahil

  // ==================== SECURITY ====================
  SECURITY: "SECURITY",
});

// Tüm işlem türlerini liste olarak döndür
export function getAllEventTypes() {
  return Object.values(AUDIT_EVENT);
}