import { useState, useCallback } from "react";
import { timesheetService } from "../../api";
import { TURKISH_MONTHS } from "../../utils/dateUtils";

// ─────────────────────────────────────────────────────────────────
// DATA MAPPING — API ↔ UI dönüşümleri
// ─────────────────────────────────────────────────────────────────

// Dönem bilgisini Dropdown (Select) bileşeninin beklediği { value, label } formatına sokar
const mapPeriod = (p) => ({
  value: `${p.year}-${String(p.month).padStart(2, "0")}`,
  label: `${p.year} ${TURKISH_MONTHS[p.month - 1]}`,
  startDate: p.start_date,
  endDate: p.end_date,
});


// API'den gelen iç içe geçmiş (nested) puantaj verisini UI tablosunun hızlıca 
// okuyabileceği düz (flat) bir objeye dönüştürür.
const mapTimesheetToUI = (ts) => {
  const timesheet_days = {};
  // Günleri 'YYYY-MM-DD': 'X' şeklinde bir Map objesine çeviriyoruz (O(1) erişim için)
  (ts.days || []).forEach(({ day, markerCode }) => {
    if (day && markerCode) {
      timesheet_days[day] = markerCode;
    }
  });

  return {
    id: ts.id ?? `new-${ts.employee.id}`,
    timesheetId: ts.id,
    employeeId: ts.employee.id,
    tc: ts.employee.tcNo,
    name: `${ts.employee.firstName} ${ts.employee.lastName}`,
    unit: ts.unit.name,
    unitId: ts.unit.id,
    location: ts.unit.location.name,
    locationId: ts.unit.location.id,
    periodId: ts.period.id,
    isLocked: ts.period.isLocked,
    timesheet_days, // Artık tablo bu objeden tarihle veri çekebilir
    workDaysCount: ts.totalWorkDays,
  };
};


// Tablodaki düz veriyi tekrar API'nin beklediği { employeeId, days: [] } formatına sokar
const mapUIToSavePayload = (uiRows) =>
  uiRows.map((row) => ({
    employeeId: row.employeeId,
    days: Object.entries(row.timesheet_days || {}).map(([day, markerCode]) => ({
      day,
      markerCode,
    })),
  }));


// ─────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────

export const useTimesheets = () => {
  const [timesheets, setTimesheets] = useState([]); // Tabloda gösterilen puantaj satırları
  const [pagination, setPagination] = useState(null);
  const [periods, setPeriods] = useState([]); // Filtre menüsündeki dönem listesi
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocking, setIsLocking] = useState(false);
  const [error, setError] = useState(null);


  const fetchTimesheets = useCallback(async (apiParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await timesheetService.getTimesheets(apiParams);

      if (response?.data) {
        const mapped = (response.data.timesheets || []).map(mapTimesheetToUI);
        setTimesheets(mapped);
        setPagination(response.data.pagination || null);
        return { success: true, rows: mapped };
      } else {
        setTimesheets([]);
        setPagination(null);
        return { success: true, rows: [] };
      }
    } catch (err) {
      setError(err.message || "Puantaj verileri alınırken hata oluştu");
      setTimesheets([]);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPeriods = useCallback(async () => {
    try {
      const res = await timesheetService.getPeriods();
      if (res?.data?.periods) {
        setPeriods(res.data.periods.map(mapPeriod));
      }
    } catch {
      // Dönemler alınamadı — filtre dropdown'ı boş kalır
    }
  }, []);

  const saveTimesheets = useCallback(async (periodId, changedUIRows) => {
    if (!periodId || !changedUIRows?.length) {
      return { success: false, error: "Kaydedilecek değişiklik bulunamadı" };
    }

    setIsSaving(true);
    try {
      const payload = mapUIToSavePayload(changedUIRows);
      const response = await timesheetService.saveTimesheets(periodId, payload);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message || "Puantaj kaydedilemedi" };
    } finally {
      setIsSaving(false);
    }
  }, []);

  const toggleLockPeriod = useCallback(async (periodId) => {
    setIsLocking(true);
    try {
      const response = await timesheetService.toggleLockPeriod(periodId);
      return { success: true, data: response.data };
    } catch (err) {
      return { success: false, error: err.message || "Kilit durumu değiştirilemedi" };
    } finally {
      setIsLocking(false);
    }
  }, []);

  return {
    timesheets,
    setTimesheets,
    pagination,
    periods,
    isLoading,
    isSaving,
    isLocking,
    error,
    fetchTimesheets,
    fetchPeriods,
    saveTimesheets,
    toggleLockPeriod,
  };
};
