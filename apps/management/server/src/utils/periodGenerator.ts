/* ========================================================================
   PERIOD GENERATOR (DÖNEM OLUŞTURUCU YARDIMCISI)
   Verilen tarih aralığına göre ay bazlı dönemleri oluşturur veya günceller.
   Hem settingsController hem de resetController tarafından kullanılır.
   ======================================================================== */
import { toISODateString, parseLocalDate, startOfMonth, endOfMonth, eachMonthOfInterval } from './dateUtils.js';
import { settingsRepo } from '../repositories/settingsRepo.js';
import type { DbExecutor } from '../types/db.js';

/**
 * Verilen tarih aralığındaki tüm aylar için dönem kayıtlarını oluşturur veya günceller.
 * Aralık dışındaki mevcut dönemler is_deleted=true yapılır.
 */
export async function regeneratePeriodsForRange(
  tx: DbExecutor,
  newStart: string,
  newEnd: string,
): Promise<void> {
  const parsedStart = parseLocalDate(newStart);
  const parsedEnd = parseLocalDate(newEnd);

  // Yeni aralık dışındaki tüm dönemleri iptal et
  await settingsRepo.deletePeriodsOutside(tx, newStart, newEnd);

  if (!parsedStart || !parsedEnd) return;

  const months = eachMonthOfInterval({ start: parsedStart, end: parsedEnd });

  for (const monthDate of months) {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth() + 1;

    // Ayın başlangıcı: programa başlangıç ayındaki ilk ay için program başlangıç tarihini kullan
    const periodStart = (y === parsedStart.getFullYear() && m === parsedStart.getMonth() + 1)
      ? parsedStart
      : startOfMonth(monthDate);

    // Ayın bitişi: programın bitiş ayındaki son ay için program bitiş tarihini kullan
    const periodEnd = (y === parsedEnd.getFullYear() && m === parsedEnd.getMonth() + 1)
      ? parsedEnd
      : endOfMonth(monthDate);

    const startStr = toISODateString(periodStart);
    const endStr = toISODateString(periodEnd);

    if (startStr && endStr) {
      await settingsRepo.upsertPeriod(tx, {
        year: y,
        month: m,
        startDate: startStr,
        endDate: endStr,
      });
    }
  }
}
