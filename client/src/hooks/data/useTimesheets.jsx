import { useState, useCallback } from "react";
import { timesheetService } from "../../api";

// ─────────────────────────────────────────────────────────────────
// DATA MAPPING — API ↔ UI dönüşümleri
// ─────────────────────────────────────────────────────────────────

const mapTimesheetToUI = (ts) => {
  const timesheet_days = {};
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
    timesheet_days,
    work_days_count: ts.totalWorkDays,
  };
};

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
  const [timesheets, setTimesheets] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
      console.error("[useTimesheets] Fetch hatası:", err);
      setError(err.message || "Puantaj verileri alınırken hata oluştu");
      setTimesheets([]);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
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

  return {
    timesheets,
    setTimesheets,
    pagination,
    isLoading,
    isSaving,
    error,
    fetchTimesheets,
    saveTimesheets,
  };
};
