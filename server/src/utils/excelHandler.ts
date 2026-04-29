/* ========================================================================
   EXCEL HANDLER (DİNAMİK YÜKLEYİCİ)
   Export işlemlerini customExcelHandler'a yönlendirir.
   ======================================================================== */
import type { TimesheetExcelOptions, BotExcelOptions } from './customExcelHandler.js';

export async function generateTimesheetExcel(options: TimesheetExcelOptions): Promise<Buffer> {
  const { generateTimesheetExcel: fn } = await import('./customExcelHandler.js');
  return fn(options);
}

export async function generateBotExcel(options: BotExcelOptions): Promise<Buffer> {
  const { generateBotExcel: fn } = await import('./customExcelHandler.js');
  return fn(options);
}
