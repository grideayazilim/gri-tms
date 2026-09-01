/* ========================================================================
   HOLIDAY CONTROLLER (TATİL GÜNLERİ KONTROLCÜSÜ)
   Resmi tatil günlerini dış API (Nager.Date) üzerinden çeker.

   Dış bağımlılık sertleştirmesi:
     - fetch 5 saniyede zaman aşımına uğrar; okul ağında dış erişim kapalıysa
       istek asılı kalmaz
     - Başarısızlıkta 502 yerine boş liste + kısa ömürlü negatif cache; puantaj
       sayfası her açılışta bu ucu çağırdığı için sayfa çalışmaya devam eder
   ======================================================================== */
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { ok } from '../utils/responses.js';
import logger from '../utils/logger.js';

interface HolidayData {
  readonly date: string;
  readonly localName: string;
  readonly name: string;
}

interface CacheEntry {
  readonly data: HolidayData[];
  readonly timestamp: number;
  readonly negative: boolean;
}

// Bellek içi cache (yıl bazlı saklar) + TTL
const holidayCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;      // 24 saat (başarılı yanıt)
const NEGATIVE_TTL_MS = 15 * 60 * 1000;        // 15 dakika (başarısız yanıt)
const FETCH_TIMEOUT_MS = 5000;

export const getPublicHolidays = asyncHandler(async (req, res) => {
  const year = req.query.year as string;

  // Cache Kontrolü: TTL dolmamışsa API'ye gitmez
  const cached = holidayCache.get(year);
  if (cached) {
    const ttl = cached.negative ? NEGATIVE_TTL_MS : CACHE_TTL_MS;
    if (Date.now() - cached.timestamp < ttl) {
      return ok(res, { holidays: cached.data });
    }
  }

  const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/TR`;

  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

    if (!response.ok) {
      throw new Error(`upstream ${response.status}`);
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

    holidayCache.set(year, { data: holidays, timestamp: Date.now(), negative: false });

    return ok(res, { holidays });
  } catch (err: unknown) {
    /* Tatil servisi ulaşılamadıysa sayfayı kırma: boş liste dön ve 15 dakika
       boyunca tekrar deneme (negatif cache). Aksi halde 70 sorumlu sabah
       girdiğinde 70 ayrı asılı outbound istek oluşuyordu. */
    logger.warn('Tatil servisi yanıt vermedi', {
      year,
      error: err instanceof Error ? err.message : String(err),
    });

    holidayCache.set(year, { data: [], timestamp: Date.now(), negative: true });

    return ok(res, { holidays: [] });
  }
});

/** Testler için cache'i temizler. */
export function __clearHolidayCache(): void {
  holidayCache.clear();
}
