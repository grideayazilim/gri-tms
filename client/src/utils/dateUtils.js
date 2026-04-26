/**
 * Projenin ortak tarih yardımcı fonksiyonları (Client).
 * Tüm tarih işlemleri bu dosyadan yönetilmeli; date-fns üzerine kurulmuştur.
 */
import { format, parseISO, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';

// ─── Sabitler ─────────────────────────────────────────────────────────────────

// TODO(monorepo): server/src/utils/dateUtils.js'deki TURKISH_MONTHS_TC ile örtüşüyor; monorepo'ya geçildiğinde shared'e taşınabilir.
/** Türkçe ay isimleri (1-indexed: TURKISH_MONTHS[0] = 'Ocak') */
export const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];


// ─── Formatlama ───────────────────────────────────────────────────────────────

/**
 * Herhangi bir Date veya ISO string'i verilen pattern ile biçimlendirir.
 * Locale otomatik olarak Türkçe (tr) kullanılır.
 *
 * @param {Date|string} date
 * @param {string} pattern - date-fns format pattern (ör: 'dd.MM.yyyy', 'dd MMMM yyyy')
 * @returns {string}
 */
export function formatDate(date, pattern = 'dd.MM.yyyy') {
  if (!date) return '-';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '-';
  return format(parsed, pattern, { locale: tr });
}

/**
 * Herhangi bir Date veya string'i 'YYYY-MM-DD' formatına çevirir.
 * Timezone kaymasını önlemek için tarih kısmı doğrudan alınır.
 *
 * @param {Date|string} date
 * @returns {string} 'YYYY-MM-DD'
 */
export function toISODateString(date) {
  if (!date) return '';
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return '';
  return format(parsed, 'yyyy-MM-dd');
}

/**
 * 'YYYY-MM-DD' gibi bir ISO tarih string'ini timezone kayması olmadan
 * yerel bir Date nesnesine çevirir.
 * (new Date('2026-04-01') UTC yorumlar ve timezone'a göre 31 Mart gösterebilir!)
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {Date}
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return isValid(date) ? date : null;
}

/**
 * Dönem etiketini döndürür.
 * Örn: formatPeriod(2026, 2) → 'Şubat 2026'
 *
 * @param {number} year
 * @param {number} month - 1-indexed
 * @returns {string}
 */
export function formatPeriod(year, month) {
  return `${TURKISH_MONTHS[month - 1]} ${year}`;
}

/**
 * Dönem etiketini büyük harfle döndürür (export dosya isimlendirme için).
 * Örn: formatPeriodUpper(2026, 2) → 'ŞUBAT 2026'
 *
 * @param {number} year
 * @param {number} month - 1-indexed
 * @returns {string}
 */
export function formatPeriodUpper(year, month) {
  return formatPeriod(year, month).toLocaleUpperCase('tr-TR');
}

// ─── Excel Tarih Dönüşümü ─────────────────────────────────────────────────────

/**
 * Excel'den gelen değeri (serial number veya Date veya string) 'YYYY-MM-DD' string'e çevirir.
 * EmployeeModal'daki Excel import işlemleri için kullanılır.
 *
 * @param {number|Date|string} val
 * @returns {string} 'YYYY-MM-DD' veya ''
 */
export function parseExcelDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return toISODateString(val);
  }
  if (typeof val === 'number') {
    // xlsx serial number → JS Date (UTC epoch)
    const epoch = new Date(Date.UTC(1899, 11, 30) + val * 86400000);
    const y = epoch.getUTCFullYear();
    const m = String(epoch.getUTCMonth() + 1).padStart(2, '0');
    const d = String(epoch.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  return '';
}
