/* ========================================================================
   TARİH YARDIMCI FONKSİYONLARI (CLIENT)
   Tüm tarih işlemleri bu dosyadan yönetilmeli; date-fns üzerine kurulmuştur.
   ======================================================================== */
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

import { TURKISH_MONTHS, TURKISH_MONTHS_UPPER } from '@timesheet/shared';

export { TURKISH_MONTHS, TURKISH_MONTHS_UPPER };

// ─── Formatlama ───────────────────────────────────────────────────────────────

export function formatDate(date: Date | string | null | undefined, pattern = 'dd.MM.yyyy'): string {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, pattern, { locale: tr });
}

/* Timezone kaymasını önlemek için tarih kısmı doğrudan alınır:
   new Date('2026-04-01') UTC yorumlar ve timezone'a göre 31 Mart gösterebilir. */
export function toISODateString(date: Date | string | null | undefined): string {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';
  return format(parsed, 'yyyy-MM-dd');
}

/* 'YYYY-MM-DD' gibi bir ISO string'ini timezone kayması olmadan yerel Date'e çevirir. */
export function parseLocalDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (y === undefined || m === undefined || d === undefined) return null;
  const date = new Date(y, m - 1, d);
  return isValid(date) ? date : null;
}

export function formatPeriod(year: number, month: number): string {
  return `${TURKISH_MONTHS[month - 1] ?? ''} ${year}`;
}

export function formatPeriodUpper(year: number, month: number): string {
  return formatPeriod(year, month).toLocaleUpperCase('tr-TR');
}

// ─── Excel Tarih Dönüşümü ─────────────────────────────────────────────────────

export function parseExcelDate(val: number | Date | string | null | undefined): string {
  if (!val) return '';
  if (val instanceof Date) {
    return toISODateString(val);
  }
  if (typeof val === 'number') {
    // xlsx serial number → JS Date (UTC epoch başlangıcı: 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30) + val * 86400000);
    const y = epoch.getUTCFullYear();
    const mo = String(epoch.getUTCMonth() + 1).padStart(2, '0');
    const d = String(epoch.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  return '';
}
