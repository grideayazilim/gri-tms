/* ========================================================================
   EXCEL HANDLER (DİNAMİK YÜKLEYİCİ)
   Export işlemlerini customExcelHandler'a yönlendirir.
   ======================================================================== */

export interface TimesheetExcelOptions {
  employees: any[];
  daysMap: Record<string, Record<string, string>>;
  dailyWage: number;
  year: number;
  month: number;
  locationName: string;
  programNo: string;
  periodStartDate: string | null;
  periodEndDate: string | null;
}

export interface BotExcelOptions {
  employees: any[];
  daysMap: Record<string, Record<string, string>>;
  year: number;
  month: number;
  locationName: string;
}

export interface ExcelHandlerModule {
  generateTimesheetExcel(options: TimesheetExcelOptions): Promise<Buffer>;
  generateBotExcel(options: BotExcelOptions): Promise<Buffer>;
}

export async function generateTimesheetExcel(options: TimesheetExcelOptions): Promise<Buffer> {
  try {
    // @ts-expect-error: customExcelHandler is a gitignored file that may not exist
    const mod = (await import('./customExcelHandler.js')) as ExcelHandlerModule;
    return mod.generateTimesheetExcel(options);
  } catch (err: any) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      throw Object.assign(new Error('Excel export is not implemented'), { status: 501 });
    }
    throw err;
  }
}

export async function generateBotExcel(options: BotExcelOptions): Promise<Buffer> {
  try {
    // @ts-expect-error: customExcelHandler is a gitignored file that may not exist
    const mod = (await import('./customExcelHandler.js')) as ExcelHandlerModule;
    return mod.generateBotExcel(options);
  } catch (err: any) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      throw Object.assign(new Error('Excel export is not implemented'), { status: 501 });
    }
    throw err;
  }
}

