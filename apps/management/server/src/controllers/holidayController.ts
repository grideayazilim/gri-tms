/* ========================================================================
   HOLIDAY CONTROLLER (TATİL GÜNLERİ KONTROLCÜSÜ)
   Resmi tatil günlerini dış API (Nager.Date) üzerinden çeker.
   ======================================================================== */
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../utils/responses.js';

interface HolidayData {
  readonly date: string;
  readonly localName: string;
  readonly name: string;
}

interface CacheEntry {
  readonly data: HolidayData[];
  readonly timestamp: number;
}

// Bellek içi cache (yıl bazlı saklar) + TTL
const holidayCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 saat

export const getPublicHolidays = asyncHandler(async (req, res) => {
  const year = req.query.year as string;

  // Cache Kontrolü: TTL dolmamışsa API'ye gitmez
  const cached = holidayCache.get(year);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return ok(res, { holidays: cached.data });
  }

  const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/TR`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new AppError('Resmi tatil verileri alınamadı', 500);
  }

  const rawHolidays = (await response.json()) as Array<{
    date: string;
    localName: string;
    name: string;
  }>;

  // Gereksiz alanları temizleyip sadece ihtiyacımız olanları haritalıyoruz
  const holidays: HolidayData[] = rawHolidays.map((h) => ({
    date: h.date,
    localName: h.localName,
    name: h.name,
  }));

  holidayCache.set(year, {
    data: holidays,
    timestamp: Date.now(),
  });

  return ok(res, { holidays });
});
