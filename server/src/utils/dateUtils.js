/**
 * Projenin ortak tarih yardımcı fonksiyonları (Server).
 * Tüm tarih işlemleri bu dosyadan yönetilmeli; date-fns üzerine kurulmuştur.
 */
import { format, isValid, startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval, parseISO } from 'date-fns';

// ─── Sabitler ─────────────────────────────────────────────────────────────────
// TODO(monorepo): Bu sabitler client/src/utils/dateUtils.js ile örtüşüyor;
//   monorepo'ya geçildiğinde shared/constants/dateConstants.js'e taşınabilir.

/** Türkçe ay isimleri — başlık büyük harf (import açıklamaları için) */
export const TURKISH_MONTHS_TC = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

/** Türkçe ay isimleri — tam büyük harf (Excel dosya isimlendirme için) */
export const TURKISH_MONTHS = [
  'OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN',
  'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK',
];

// ─── Formatlama ───────────────────────────────────────────────────────────────

/**
 * Herhangi bir Date veya string'i 'YYYY-MM-DD' formatına çevirir.
 * Postgres'e gönderilecek tarih string'leri için kullanılmalıdır.
 * toLocaleDateString('en-CA')'nın yerine geçer — bu metod runtime locale'e bağımlıdır.
 *
 * @param {Date|string} date
 * @returns {string} 'YYYY-MM-DD' veya null
 */
export function toISODateString(date) {
  if (!date) return null;
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(parsed)) return null;
  return format(parsed, 'yyyy-MM-dd');
}

/**
 * 'YYYY-MM-DD' string'ini timezone kayması olmadan yerel Date'e çevirir.
 * new Date('2026-04-01') UTC yorumlar ve timezone kayması yaşatır — bu fonksiyon bunu önler.
 *
 * @param {string|Date} dateInput
 * @returns {Date|null}
 */
export function parseLocalDate(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === 'string') {
    const [y, m, d] = dateInput.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return isValid(dt) ? dt : null;
  }
  if (dateInput instanceof Date) {
    // Date'i sıfırlayarak timezone offset etkisini yok et
    const dt = new Date(dateInput.getFullYear(), dateInput.getMonth(), dateInput.getDate());
    return isValid(dt) ? dt : null;
  }
  return null;
}

/**
 * Verilen tarih aralığı içindeki her ayın ilk gününü döndürür.
 * settingsController'daki while döngüsünün yerine kullanılır.
 *
 * @param {Date} start
 * @param {Date} end
 * @returns {Date[]}
 */
export { startOfMonth, endOfMonth, eachMonthOfInterval, eachDayOfInterval };

/**
 * Dönem etiketini 'YYYY-MM' formatında döndürür.
 * Örn: formatPeriodLabel(2026, 4) → '2026-04'
 * cronJobs audit log açıklamalarında padStart kullanımının yerine geçer.
 *
 * @param {number} year
 * @param {number} month
 * @returns {string}
 */
export function formatPeriodLabel(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * ISO 8601 hafta anahtarını döndürür: 'YYYY-Www'.
 * Örn: getISOWeekKey(new Date('2026-01-01')) → '2026-W01'
 *
 * @param {Date} date
 * @returns {string}
 */
export function getISOWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
