/* ========================================================================
   HOLIDAY CONTROLLER (TATİL GÜNLERİ KONTROLCÜSÜ)
   Resmi tatil günlerini dış API (Nager.Date) üzerinden çeker.
   ======================================================================== */
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

// Basit bir bellek içi cache (yıl bazlı saklar)
const holidayCache = new Map();


export const getPublicHolidays = asyncHandler(async (req, res) => {
  const year = req.query.year;

  // Cache Kontrolü: Eğer bu yıl için daha önce istek atıldıysa API'ye gitmez
  if (holidayCache.has(year)) {
    return res.json({ success: true, data: { holidays: holidayCache.get(year) } });
  }


  const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/TR`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    throw new AppError('Resmi tatil verileri alınamadı', 502);
  }

  const rawHolidays = await response.json();
  // Gereksiz alanları temizleyip sadece ihtiyacımız olanları haritalıyoruz
  const holidays = rawHolidays.map((h) => ({
    date: h.date,
    localName: h.localName,
    name: h.name,
  }));


  holidayCache.set(year, holidays);

  res.json({ success: true, data: { holidays } });
});
