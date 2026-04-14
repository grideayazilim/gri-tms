import { useState, useEffect, useCallback, useMemo } from "react";
import { holidayService } from "../../api";

/**
 * Seçili dönemin resmi tatillerini Nager.Date API'den çeker.
 *
 * @param {string} period - "YYYY-MM" formatında dönem
 * @returns {{ holidayDays: Set<number>, holidayNames: Map<number, string>, isPublicHoliday: (day: number) => boolean, getHolidayName: (day: number) => string|null }}
 */
export const usePublicHolidays = (period) => {
  const [holidays, setHolidays] = useState([]);

  // Period'dan yıl ve ay bilgisini ayrıştır
  const [year, month] = useMemo(() => {
    if (!period) return [null, null];
    const parts = period.split("-").map(Number);
    return [parts[0], parts[1]];
  }, [period]);

  useEffect(() => {
    if (!year) {
      setHolidays([]);
      return;
    }

    holidayService
      .getPublicHolidays(year)
      .then((res) => {
        if (res?.data?.holidays) {
          setHolidays(res.data.holidays);
        }
      })
      .catch((err) => {
        console.error("[usePublicHolidays] Resmi tatiller alınamadı:", err);
        setHolidays([]);
      });
  }, [year]);

  // Seçili aya ait tatil günlerini Set olarak hesapla
  const holidayDays = useMemo(() => {
    if (holidays.length === 0) return new Set();

    const days = new Set();
    for (const h of holidays) {
      days.add(h.date);
    }
    return days;
  }, [holidays]);

  // Tatil günü adları (tooltip'te göstermek için)
  const holidayNames = useMemo(() => {
    if (holidays.length === 0) return new Map();

    const names = new Map();
    for (const h of holidays) {
      names.set(h.date, h.localName);
    }
    return names;
  }, [holidays]);

  const isPublicHoliday = useCallback(
    (dateStr) => holidayDays.has(dateStr),
    [holidayDays],
  );

  const getHolidayName = useCallback(
    (dateStr) => holidayNames.get(dateStr) || null,
    [holidayNames],
  );

  return { holidayDays, holidayNames, isPublicHoliday, getHolidayName };
};
