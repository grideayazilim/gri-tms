/* ========================================================================
   EXCEL HANDLER (DİNAMİK YÜKLEYİCİ)
   Export işlemlerini customExcelHandler'a yönlendirir.
   ======================================================================== */

export interface ExcelEmployee {
  id: string;
  tcNo: string | null;
  firstName: string;
  lastName: string;
  ibanNo: string | null;
  unitId: string;
  unitName: string;
  startDate: string;
  endDate: string | null;
}

export interface TimesheetExcelOptions {
  employees: ExcelEmployee[];
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
  employees: ExcelEmployee[];
  daysMap: Record<string, Record<string, string>>;
  year: number;
  month: number;
  locationName: string;
}

export interface ExcelHandlerModule {
  generateTimesheetExcel(options: TimesheetExcelOptions): Promise<Buffer>;
  generateBotExcel(options: BotExcelOptions): Promise<Buffer>;
}

function isModuleNotFound(err: unknown): boolean {
  return err instanceof Error && 'code' in err && err.code === 'ERR_MODULE_NOT_FOUND';
}

export async function generateTimesheetExcel(options: TimesheetExcelOptions): Promise<Buffer> {
  try {
    const mod = (await import('./customExcelHandler.js')) as ExcelHandlerModule;
    return mod.generateTimesheetExcel(options);
  } catch (err: unknown) {
    if (isModuleNotFound(err)) {
      throw Object.assign(new Error('Excel export is not implemented'), { status: 501 });
    }
    throw err;
  }
}

export async function generateBotExcel(options: BotExcelOptions): Promise<Buffer> {
  try {
    const mod = (await import('./customExcelHandler.js')) as ExcelHandlerModule;
    return mod.generateBotExcel(options);
  } catch (err: unknown) {
    if (isModuleNotFound(err)) {
      throw Object.assign(new Error('Excel export is not implemented'), { status: 501 });
    }
    throw err;
  }
}
