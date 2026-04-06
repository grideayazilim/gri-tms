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
    if (!month || holidays.length === 0) return new Set();

    const days = new Set();
    for (const h of holidays) {
      const [hYear, hMonth, hDay] = h.date.split("-").map(Number);
      if (hYear === year && hMonth === month) {
        days.add(hDay);
      }
    }
    return days;
  }, [holidays, year, month]);

  // Tatil günü adları (tooltip'te göstermek için)
  const holidayNames = useMemo(() => {
    if (!month || holidays.length === 0) return new Map();

    const names = new Map();
    for (const h of holidays) {
      const [hYear, hMonth, hDay] = h.date.split("-").map(Number);
      if (hYear === year && hMonth === month) {
        names.set(hDay, h.localName);
      }
    }
    return names;
  }, [holidays, year, month]);

  const isPublicHoliday = useCallback(
    (day) => holidayDays.has(day),
    [holidayDays],
  );

  const getHolidayName = useCallback(
    (day) => holidayNames.get(day) || null,
    [holidayNames],
  );

  return { holidayDays, holidayNames, isPublicHoliday, getHolidayName };
};
