'use strict';

/**
 * Excel Parser
 * Gerçek Excel formatı:
 * - Satır 1: Header [IBAN, "Tc", "Ad Soyad", "1", "2", ... "31"]
 * - Satır 2+: Veri [IBAN, TC(11hane), Ad Soyad, 1/0, 1/0, ...]
 * - TC: index 1
 * - Ad Soyad: index 2
 * - Günler: index 3'ten itibaren
 */

const XLSX = require('xlsx');

/**
 * Excel dosyasını parse et
 * @param {Buffer|string} filePathOrBuffer
 * @param {number} month - Ay (1-12)
 * @param {number} year  - Yıl
 * @returns {Array} [{ adSoyad, tc, dayFlags, hasAnyDay, rowIndex }]
 */
function parseExcel(filePathOrBuffer, month, year) {
  let workbook;
  if (Buffer.isBuffer(filePathOrBuffer)) {
    workbook = XLSX.read(filePathOrBuffer, { type: 'buffer' });
  } else {
    workbook = XLSX.readFile(filePathOrBuffer);
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: 0 });

  if (!rows || rows.length < 2) {
    throw new Error('Excel dosyası boş veya geçersiz format');
  }

  const daysInMonth = new Date(year, month, 0).getDate();

  // Sabit sütun konumları (gerçek Excel formatına göre)
  const TC_COL = 1;        // B sütunu
  const NAME_COL = 2;      // C sütunu
  const FIRST_DAY_COL = 3; // D sütununda başlıyor (1. gün)

  console.log(`[ExcelParser] TC sütunu: ${TC_COL}, Ad Soyad: ${NAME_COL}, İlk gün: ${FIRST_DAY_COL}`);
  console.log(`[ExcelParser] Ay: ${month}, Yıl: ${year}, Gün sayısı: ${daysInMonth}`);

  const result = [];

  // Satır 2'den itibaren (index 1) veri satırları
  for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    if (!row || row.length === 0) continue;

    // TC
    const tc = String(row[TC_COL] || '').trim();

    // TC geçerli değilse satırı atla (boş satır)
    if (!/^\d{11}$/.test(tc)) continue;

    // Ad Soyad
    const adSoyad = String(row[NAME_COL] || '').trim();
    if (!adSoyad) continue;

    // Gün flag'leri
    const dayFlags = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const colIdx = FIRST_DAY_COL + (day - 1);
      const val = row[colIdx];
      dayFlags[day] = (val === 1 || val === '1' || val === true) ? 1 : 0;
    }

    const hasAnyDay = Object.values(dayFlags).some(v => v === 1);

    result.push({
      adSoyad,
      tc,
      dayFlags,
      hasAnyDay,
      rowIndex: rowIdx + 1,
    });
  }

  console.log(`[ExcelParser] ${result.length} kişi parse edildi`);
  console.log(`[ExcelParser] İşlenecek: ${result.filter(p => p.hasAnyDay).length} kişi`);
  return result;
}

/**
 * TC'si olan ve en az 1 günü seçili kişileri döndür
 */
function getPersonsToProcess(persons) {
  return persons.filter(p => p.tc && /^\d{11}$/.test(p.tc) && p.hasAnyDay);
}

module.exports = { parseExcel, getPersonsToProcess };