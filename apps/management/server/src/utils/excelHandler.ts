/* ========================================================================
   EXCEL HANDLER (EXCEL DIŞA AKTARIM MODÜLÜ)
   Puantaj verilerini Maaş veya Bot formatında Excel olarak üretir.
   ======================================================================== */
import XlsxPopulate from 'xlsx-populate';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PAID_CODES } from '@timesheet/shared';
import { AppError } from './AppError.js';
import { parseLocalDate } from './dateUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '../templates');
const TIMESHEET_TEMPLATE_PATH = path.join(TEMPLATES_DIR, 'timesheet_template.xlsm');

// ─── Tipler ───────────────────────────────────────────────────────────────────

export interface ExcelEmployee {
  id: string;
  tcNo: string | null;
  firstName: string;
  lastName: string;
  ibanNo?: string | null;
  unitId?: string | null;
  unitName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface TimesheetExcelOptions {
  employees: ExcelEmployee[];
  daysMap: Record<string, Record<string, string>>;
  dailyWage: number;
  year: number;
  month: number;
  locationName: string;
  programNo?: string | null;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
}

export interface BotExcelOptions {
  employees: ExcelEmployee[];
  daysMap: Record<string, Record<string, string>>;
  year: number;
  month: number;
  locationName: string;
}

// ─── Yardımcılar ──────────────────────────────────────────────────────────────

function formatDateTR(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function sortAlphabetically(employees: ExcelEmployee[]): ExcelEmployee[] {
  return [...employees].sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.toLocaleLowerCase('tr-TR');
    const nameB = `${b.firstName} ${b.lastName}`.toLocaleLowerCase('tr-TR');
    return nameA.localeCompare(nameB, 'tr');
  });
}

// ─── Maaş Tablosu (Şablon Tabanlı) ───────────────────────────────────────────

export async function generateTimesheetExcel(options: TimesheetExcelOptions): Promise<Buffer> {
  if (!fs.existsSync(TIMESHEET_TEMPLATE_PATH)) {
    throw new AppError(
      "Maaş tablosu şablonu bulunamadı. Lütfen sunucuya 'timesheet_template.xlsm' dosyasını ekleyin.",
      501,
    );
  }

  const { employees, daysMap, dailyWage, year, month, locationName, programNo, periodStartDate, periodEndDate } = options;
  const workbook = await XlsxPopulate.fromFileAsync(TIMESHEET_TEMPLATE_PATH);

  const wsVeriler = workbook.sheet('VERİLER');
  if (wsVeriler) {
    wsVeriler.cell('C5').value(dailyWage);
  }

  const wsp = workbook.sheet('Puantaj');
  if (wsp) {
    wsp.cell('C3').value(year);
    wsp.cell('K3').value(new Date(year, month - 1, 1)).style('numberFormat', '[$-041F]MMMM');
    wsp.cell('Q3').value(`${locationName} YERLEŞKESİ`);
    wsp.cell('C4').value(programNo || '');

    const startDate = parseLocalDate(periodStartDate);
    if (startDate) wsp.cell('C5').value(startDate);

    const endDate = parseLocalDate(periodEndDate);
    if (endDate) wsp.cell('K5').value(endDate);

    employees.forEach((emp, idx) => {
      const rowNum = idx + 9;
      wsp.cell(`A${rowNum}`).value(idx + 1);

      const days = daysMap[emp.id] || {};
      for (let d = 1; d <= 31; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const marker = days[dateStr];
        if (marker) {
          wsp.row(rowNum).cell(d + 3).value(marker);
        }
      }

      const daysInMonth = new Date(year, month, 0).getDate();
      wsp.cell(`AI${rowNum}`).formula(`${daysInMonth}-COUNTIF(D${rowNum}:AH${rowNum},"X")`);
      wsp.cell(`AJ${rowNum}`).formula(`COUNTIF(D${rowNum}:AH${rowNum},"X")`);
    });
  }

  const wsi = workbook.sheet('İşçi Bilgileri');
  if (wsi) {
    employees.forEach((emp, idx) => {
      const rowNum = idx + 2;
      wsi.cell(`A${rowNum}`).value(idx + 1);
      wsi.cell(`B${rowNum}`).value(`${emp.firstName} ${emp.lastName}`);
      wsi.cell(`D${rowNum}`).value(emp.tcNo || '');
      wsi.cell(`E${rowNum}`).value(emp.unitName || '');
      wsi.cell(`F${rowNum}`).value(emp.ibanNo || '');

      if (emp.startDate) wsi.cell(`I${rowNum}`).value(formatDateTR(emp.startDate));
      if (emp.endDate) wsi.cell(`J${rowNum}`).value(formatDateTR(emp.endDate));
    });
  }

  return workbook.outputAsync() as Promise<Buffer>;
}

// ─── Bot Girdisi (Şablonsuz) ──────────────────────────────────────────────────

export async function generateBotExcel({ employees, daysMap, year, month }: BotExcelOptions): Promise<Buffer> {
  const daysInMonth = new Date(year, month, 0).getDate();
  const sorted = sortAlphabetically(employees);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Puantaj');

  // ── Başlık satırı ─────────────────────────────────────────────────────────
  const headerRow = ws.addRow(['IBAN', 'TC KİMLİK NO', 'ADI SOYADI', ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]);
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // ── Sütun genişlikleri ────────────────────────────────────────────────────
  ws.getColumn(1).width = 26;  // IBAN
  ws.getColumn(2).width = 16;  // TC
  ws.getColumn(3).width = 28;  // Ad Soyad
  for (let i = 4; i <= 3 + daysInMonth; i++) {
    ws.getColumn(i).width = 4;
  }

  // ── Veri satırları ────────────────────────────────────────────────────────
  sorted.forEach((emp) => {
    const days = daysMap[emp.id] || {};
    const dayValues: number[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const marker = days[dateStr];
      dayValues.push(marker && (PAID_CODES as Set<string>).has(marker) ? 1 : 0);
    }

    const dataRow = ws.addRow([
      emp.ibanNo || '',
      emp.tcNo || '',
      `${emp.firstName} ${emp.lastName}`,
      ...dayValues,
    ]);

    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Ad Soyad sütununu sola hizala
    dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    // IBAN ve TC sütunlarını da sola hizala
    dataRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
    dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
  });

  // Başlık satırını dondur
  ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];

  return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}
