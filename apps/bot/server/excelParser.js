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

const ExcelJS = require('exceljs');

/* Zip bomb koruması: .xlsx aslında bir ZIP, o yüzden magic byte'a bakıyoruz.
   ExcelJS açılmış boyuta sınır koymadığı için satır/sütun üst sınırı veriyoruz;
   1000 öğrenci için 5000 satır fazlasıyla yeterli. */
const MAX_ROWS = 5000;
const MAX_COLS = 40;

function assertXlsxMagic(buf) {
  if (
    buf.length < 4
    || buf[0] !== 0x50 || buf[1] !== 0x4b   // 'P','K'
    || buf[2] !== 0x03 || buf[3] !== 0x04
  ) {
    throw new Error('Dosya geçerli bir Excel (.xlsx) dosyası değil');
  }
}

/**
 * Excel dosyasını parse et
 * @param {Buffer|string} filePathOrBuffer
 * @param {number} month - Ay (1-12)
 * @param {number} year  - Yıl
 * @returns {Promise<Array>} [{ adSoyad, tc, dayFlags, hasAnyDay, rowIndex }]
 */
async function parseExcel(filePathOrBuffer, month, year) {
  const workbook = new ExcelJS.Workbook();
  if (Buffer.isBuffer(filePathOrBuffer)) {
    assertXlsxMagic(filePathOrBuffer);
    await workbook.xlsx.load(filePathOrBuffer);
  } else {
    await workbook.xlsx.readFile(filePathOrBuffer);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Excel dosyası boş veya geçersiz format');
  }

  if (worksheet.rowCount > MAX_ROWS) {
    throw new Error(`Excel çok büyük: ${worksheet.rowCount} satır (üst sınır ${MAX_ROWS})`);
  }

  // Worksheet'i 0-indexed satır dizilerine dönüştür (boş hücre = 0)
  // ExcelJS satırları 1-indexed; 0-indexed diziye dönüştür, boş hücre → 0
  const rows = [];
  const minCols = 3 + 31;
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    if (rows.length >= MAX_ROWS) return;
    const rowData = [];
    // Üst sınır — sütun sayısı kadar eleman ayrılır, MAX_COLS ile sınırlanır
    const lastCol = Math.min(Math.max(row.cellCount, minCols), MAX_COLS);
    for (let i = 1; i <= lastCol; i++) {
      const cell = row.getCell(i);
      rowData.push(cell.value !== null && cell.value !== undefined ? cell.value : 0);
    }
    rows.push(rowData);
  });

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
