/* ========================================================================
   TARİH YARDIMCI FONKSİYONLARI (SERVER)
   Tüm tarih işlemleri bu dosyadan yönetilir; date-fns üzerine kurulmuştur.
   ======================================================================== */
import { format, isValid, startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval, parseISO, getISOWeek, getISOWeekYear } from 'date-fns';




// ─── Formatlama ───────────────────────────────────────────────────────────────

/**
 * Timezone kayması önler — toLocaleDateString('en-CA') yerine deterministik dönüşüm.
 */
export function toISODateString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return null;
  return format(parsed, 'yyyy-MM-dd');
}

/**
 * Timezone kayması önler — new Date('2026-04-01') UTC yorumlar, bu fonksiyon yerel Date döner.
 */
export function parseLocalDate(dateInput: Date | string | null | undefined): Date | null {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-').map(Number);
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (y === undefined || m === undefined || d === undefined) return null;
    const dt = new Date(y, m - 1, d);
    return isValid(dt) ? dt : null;
  }
  if (dateInput instanceof Date) {
    const dt = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
    return isValid(dt) ? dt : null;
  }
  return null;
}

/**
 * Verilen tarihin hafta sonu olup olmadığını kontrol eder.
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// ─── date-fns re-exports ──────────────────────────────────────────────────────

export { startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval };

// ─── Dönem formatlama ─────────────────────────────────────────────────────────

export function formatPeriodLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// ─── ISO hafta anahtarı ───────────────────────────────────────────────────────

export function getISOWeekKey(date: Date): string {
  const week = getISOWeek(date);
  const year = getISOWeekYear(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
