// ======================== GET /holidays?year=2026 ========================
// Nager.Date API'den Türkiye resmi tatillerini proxy'ler.
// In-memory cache ile aynı yıl için tekrar harici API'ye gitmez.

const holidayCache = new Map();

export async function getPublicHolidays(req, res) {
  try {
    const year = parseInt(req.query.year, 10);

    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({
        success: false,
        message: "Geçerli bir yıl parametresi gerekli (2000-2100)",
      });
    }

    // Cache kontrolü
    if (holidayCache.has(year)) {
      return res.json({
        success: true,
        data: { holidays: holidayCache.get(year) },
      });
    }

    // Nager.Date API'den Türkiye resmi tatillerini çek
    const apiUrl = `https://date.nager.at/api/v3/PublicHolidays/${year}/TR`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.error(
        `[HolidayController] Nager.Date API hatası: ${response.status}`,
      );
      return res.status(502).json({
        success: false,
        message: "Resmi tatil verileri alınamadı",
      });
    }

    const rawHolidays = await response.json();

    // Sadece ihtiyaç duyulan alanları filtrele
    const holidays = rawHolidays.map((h) => ({
      date: h.date,
      localName: h.localName,
      name: h.name,
    }));

    // Cache'e kaydet
    holidayCache.set(year, holidays);

    res.json({
      success: true,
      data: { holidays },
    });
  } catch (error) {
    console.error("Get public holidays error:", error);
    res.status(500).json({
      success: false,
      message: "Resmi tatil verileri alınırken hata oluştu",
    });
  }
}
