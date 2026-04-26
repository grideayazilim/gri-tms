/* ========================================================================
   TIMESHEET SERVICE (PUANTAJ SERVİSİ)
   Çalışanların puantaj girişleri ve dönem kilitleri.
   ======================================================================== */
import { api } from "./httpClient";

// Puantaj listesini getir (Ay/Yıl, Birim, Yerleşke filtreleri ile)
export const getTimesheets = async (params = {}) => {
  return api.get("/timesheets", { params });
};

// Puantajları toplu olarak kaydet veya güncelle
export const saveTimesheets = async (periodId, timesheets) => {
  return api.post("/timesheets", { periodId, timesheets });
};

// Bir dönemi kilitle veya kilidini aç
export const toggleLockPeriod = async (periodId) => {
  return api.patch(`/timesheets/${periodId}/lock`);
};

export const getPeriods = () => api.get("/timesheets/periods");
