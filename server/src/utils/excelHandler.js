import XlsxPopulate from "xlsx-populate";
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(
  __dirname,
  "../templates/puantaj_template.xlsx",
);
const BOT_TEMPLATE_PATH = path.join(
  __dirname,
  "../templates/bot_puantaj_template.xlsx",
);

/**
 * 'YYYY-MM-DD' string veya Date nesnesini yerel tarih olarak döndürür
 *
 */
function parseLocalDate(dateInput) {
  if (!dateInput) return null;
  if (typeof dateInput === "string") {
    const [y, m, d] = dateInput.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  if (dateInput instanceof Date) {
    return new Date(
      dateInput.getFullYear(),
      dateInput.getMonth(),
      dateInput.getDate(),
    );
  }
  return null;
}

/**
 * Şablon tabanlı puantaj Excel dosyası üretir.
 * xlsx-populate kullanır → tüm stiller, fontlar, birleştirilmiş hücreler,
 * satır yükseklikleri ve formüller şablondan olduğu gibi korunur.
 */
export async function generatePuantajExcel({
  employees,
  daysMap,
  dailyWage,
  year,
  month,
  locationName,
  programNo,
  periodStartDate,
  periodEndDate,
}) {
  const workbook = await XlsxPopulate.fromFileAsync(TEMPLATE_PATH);

  // ── VERİLER ──────────────────────────────────────────────────────────────
  const wsVeriler = workbook.sheet("VERİLER");
  if (wsVeriler) {
    wsVeriler.cell("C5").value(dailyWage);
  }

  // ── Puantaj ───────────────────────────────────────────────────────────────
  const wsp = workbook.sheet("Puantaj");
  if (wsp) {
    // C3 → Yıl
    wsp.cell("C3").value(year);

    // K3 → Ay: date olarak set edilmeli ki AL4/AL5/AL6 formülleri çalışsın.
    // Format [$-041F]MMMM → Türkçe ay adı gösterir (Ocak, Şubat …)
    const monthDate = new Date(year, month - 1, 1);
    wsp.cell("K3").value(monthDate).style("numberFormat", "[$-041F]MMMM");

    // Q3 → Yerleşke adı
    wsp.cell("Q3").value(`${locationName} YERLEŞKESİ`);

    // C4 → Program No
    wsp.cell("C4").value(programNo || "");

    // C5 → Program Başlama Tarihi
    if (periodStartDate) {
      wsp.cell("C5").value(parseLocalDate(periodStartDate));
    }

    // K5 → Program Bitiş Tarihi
    if (periodEndDate) {
      wsp.cell("K5").value(parseLocalDate(periodEndDate));
    }

    // ── Çalışan Satırları (satır 9'dan itibaren) ─────────────────────────
    // Sütun harfleri (1-tabanlı xlsx-populate indeksi):
    //   A=1, B=2, C=3, D=4(gün1) … AH=34(gün31), AI=35(eksik gün formülü), AJ=36
    // B ve C → VLOOKUP formülü (İşçi Bilgileri'nden çeker)
    // AI, AJ → formüller
    employees.forEach((emp, idx) => {
      const rowNum = idx + 9;

      // A → Sıra numarası
      wsp.cell(`A${rowNum}`).value(idx + 1);

      const days = daysMap.get(emp.id) || {};

      for (let d = 1; d <= 31; d++) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const marker = days[dateStr];
        // Sadece işaret olan hücreye yaz.
        // Boş/işaretsiz hücreler atlanır
        // COUNTA sayar (0), AI formülü çalışır.
        if (marker) {
          wsp
            .row(rowNum)
            .cell(d + 3)
            .value(marker);
        }
      }

      // AI = eksik gün  → ayın gün sayısı − çalışılan gün (X)
      // AJ = toplam çalışılan gün → X
      const dn = new Date(year, month, 0).getDate(); // ayın gün sayısı
      wsp
        .cell(`AI${rowNum}`)
        .formula(`${dn}-COUNTIF(D${rowNum}:AH${rowNum},"X")`);
      wsp.cell(`AJ${rowNum}`).formula(`COUNTIF(D${rowNum}:AH${rowNum},"X")`);
    });
  }

  // ── Çalışan Bilgileri ────────────────────────────────────────────────────────
  // Sütunlar: A=1(sıra), B=2(ad soyad), D=4(TC), E=5(görev yeri),
  //           F=6(IBAN), I=9(işe giriş), J=10(işten çıkış)
  // K (çalışılan gün) → formül
  const wsi = workbook.sheet("İşçi Bilgileri");
  if (wsi) {
    employees.forEach((emp, idx) => {
      const rowNum = idx + 2;

      wsi.cell(`A${rowNum}`).value(idx + 1);
      wsi.cell(`B${rowNum}`).value(`${emp.first_name} ${emp.last_name}`);
      wsi.cell(`D${rowNum}`).value(emp.tc_no || "");
      wsi.cell(`E${rowNum}`).value(emp.unit_name || "");
      wsi.cell(`F${rowNum}`).value(emp.iban_no || "");

      if (emp.start_date) {
        wsi.cell(`I${rowNum}`).value(parseLocalDate(emp.start_date));
      }
      if (emp.end_date) {
        wsi.cell(`J${rowNum}`).value(parseLocalDate(emp.end_date));
      }
    });
  }

  return workbook.outputAsync();
}

/**
 * Bot tablo formatında Excel üretir.
 */
export async function generateSimpleExcel({
  employees,
  daysMap,
  dailyWage,
  year,
  month,
  locationName,
}) {
  const wb = new ExcelJS.Workbook();
  const daysInMonth = new Date(year, month, 0).getDate();

  // ── Çalışan Listesi ────────────────────────────────────────────────────
  const empSheet = wb.addWorksheet("Çalışanlar");
  empSheet.addRow([
    "Sıra",
    "Ad Soyad",
    "TC No",
    "Birim",
    "IBAN",
    "İşe Giriş",
    "İşten Çıkış",
    "Çalışılan Gün",
  ]);
  empSheet.getRow(1).font = { bold: true };

  employees.forEach((emp, idx) => {
    const days = daysMap.get(emp.id) || {};
    const workDays = Object.values(days).filter((m) => m === "X").length;
    empSheet.addRow([
      idx + 1,
      `${emp.first_name} ${emp.last_name}`,
      emp.tc_no,
      emp.unit_name || "",
      emp.iban_no || "",
      emp.start_date
        ? new Date(emp.start_date).toLocaleDateString("tr-TR")
        : "",
      emp.end_date ? new Date(emp.end_date).toLocaleDateString("tr-TR") : "",
      workDays,
    ]);
  });

  // ── Puantaj ───────────────────────────────────────────────────────────
  const ptSheet = wb.addWorksheet("Puantaj");
  const headers = ["Sıra", "Ad Soyad", "TC No"];
  for (let d = 1; d <= daysInMonth; d++) headers.push(String(d));
  headers.push("Eksik Gün", "Toplam Gün", "Toplam Ücret");
  ptSheet.addRow(headers);
  ptSheet.getRow(1).font = { bold: true };

  employees.forEach((emp, idx) => {
    const days = daysMap.get(emp.id) || {};
    const row = [idx + 1, `${emp.first_name} ${emp.last_name}`, emp.tc_no];
    let workDays = 0;
    let missingDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const marker = days[dateStr] || "";
      row.push(marker);
      if (!marker) missingDays++;
      if (marker === "X") workDays++;
    }

    row.push(missingDays, workDays, workDays * dailyWage);
    ptSheet.addRow(row);
  });

  return wb.xlsx.writeBuffer();
}

/**
 * Bot export: Puantaj tablosu — çalışılan gün 1, çalışılmayan gün 0.
 * Sütun sırası: Sıra No | IBAN | TC | Ad Soyad | 1-31 | Eksik Gün | Toplam | Not
 */
export async function generateBotExcel({
  employees,
  daysMap,
  year,
  month,
  locationName,
  programNo,
  periodStartDate,
  periodEndDate,
}) {
  const workbook = await XlsxPopulate.fromFileAsync(BOT_TEMPLATE_PATH);

  // ── Sadece Puantaj sayfasını tut ──
  workbook.sheets().forEach((sheet) => {
    if (sheet.name() !== "Puantaj") {
      workbook.deleteSheet(sheet.name());
    }
  });

  const ws = workbook.sheet("Puantaj");
  const daysInMonth = new Date(year, month, 0).getDate();

  if (ws) {
    // ── Meta bilgiler ──────────────────────────────────────────────────────
    ws.cell("C3").value(year);
    const monthDate = new Date(year, month - 1, 1);
    ws.cell("K3").value(monthDate).style("numberFormat", "[$-041F]MMMM");
    ws.cell("Q3").value(`${locationName} YERLEŞKESİ`);
    ws.cell("C4").value(programNo || "");
    if (periodStartDate) ws.cell("C5").value(parseLocalDate(periodStartDate));
    if (periodEndDate) ws.cell("K5").value(parseLocalDate(periodEndDate));

    // ── Kolon D genişliği ──
    ws.column("D").width(28);

    // ── NOT hücresi (Z3) — açıklama metnini güncelle ──────────────────────
    ws.cell("Z3").value("NOT :\nÇALIŞILAN GÜNLER: 1 , ÇALIŞILMAYAN GÜNLER: 0");

    // ── Başlık satırı (satır 8) ────────────────────────────────────────────
    // A=Sıra No, B=IBAN, C=TC KİMLİK NO, D=ADI SOYADI
    ws.cell("B8").value("IBAN");
    ws.cell("D8").value("ADI SOYADI");
    // E(col5)=gün1 … AI(col35)=gün31
    for (let d = 1; d <= 31; d++) {
      ws.row(8)
        .cell(d + 4)
        .value(d);
    }
    // AJ ve AK sütunları (Eksik Gün / Toplam) gizle
    ws.cell("AJ8").value(null);
    ws.cell("AK8").value(null);
    ws.column("AJ").width(0).hidden(true);
    ws.column("AK").width(0).hidden(true);
    // AL → Not
    ws.cell("AL8").value("ÇALIŞILAN GÜNLER: 1 , ÇALIŞILMAYAN GÜNLER: 0");

    // ── Çalışan satırları ──
    employees.forEach((emp, idx) => {
      const rowNum = idx + 9;
      ws.cell(`A${rowNum}`).value(idx + 1);
      ws.cell(`B${rowNum}`).value(emp.iban_no || "");
      ws.cell(`C${rowNum}`).value(emp.tc_no || "");
      ws.cell(`D${rowNum}`).value(`${emp.first_name} ${emp.last_name}`);

      const days = daysMap.get(emp.id) || {};

      for (let d = 1; d <= 31; d++) {
        const colIdx = d + 4;
        if (d > daysInMonth) {
          ws.row(rowNum).cell(colIdx).value(null);
          continue;
        }
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const val = days[dateStr] === "X" ? 1 : 0;
        ws.row(rowNum).cell(colIdx).value(val);
      }

      // AJ ve AK boş bırak
      ws.cell(`AJ${rowNum}`).value(null);
      ws.cell(`AK${rowNum}`).value(null);
    });
  }

  return workbook.outputAsync();
}
