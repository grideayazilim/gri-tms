import { useState, useEffect, useCallback, useMemo } from 'react';

import type { PublicHoliday } from '@timesheet/shared';

import { holidayService } from '../../api';

export interface UsePublicHolidaysReturn {
  holidayDays: Set<string>;
  holidayNames: Map<string, string>;
  isPublicHoliday: (day: string) => boolean;
  getHolidayName: (day: string) => string | null;
}

/**
 * Seçili dönemin resmi tatillerini Nager.Date API'den çeker.
 *
 * @param period - "YYYY-MM" formatında dönem
 */
export const usePublicHolidays = (period: string | null): UsePublicHolidaysReturn => {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([]);

  // Period'dan yıl ve ay bilgisini ayrıştır
  const [year] = useMemo(() => {
    if (!period) return [null, null];
    const parts = period.split('-').map(Number);
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
        if (res.success && res.data?.holidays) {
          setHolidays(res.data.holidays);
        }
      })
      .catch((err) => {
        console.error('[usePublicHolidays] Resmi tatiller alınamadı:', err);
        setHolidays([]);
      });
  }, [year]);

  // Seçili aya ait tatil günlerini Set olarak hesapla
  const holidayDays = useMemo(() => {
    if (holidays.length === 0) return new Set<string>();

    const days = new Set<string>();
    for (const h of holidays) {
      days.add(h.date);
    }
    return days;
  }, [holidays]);

  // Tatil günü adları (tooltip'te göstermek için)
  const holidayNames = useMemo(() => {
    if (holidays.length === 0) return new Map<string, string>();

    const names = new Map<string, string>();
    for (const h of holidays) {
      names.set(h.date, h.localName);
    }
    return names;
  }, [holidays]);

  const isPublicHoliday = useCallback(
    (dateStr: string) => holidayDays.has(dateStr),
    [holidayDays],
  );

  const getHolidayName = useCallback(
    (dateStr: string) => holidayNames.get(dateStr) || null,
    [holidayNames],
  );

  return { holidayDays, holidayNames, isPublicHoliday, getHolidayName };
};
