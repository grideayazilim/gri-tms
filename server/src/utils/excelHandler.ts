/* ========================================================================
   EXCEL HANDLER (DİNAMİK YÜKLEYİCİ)
   Export işlemlerini projenin customExcelHandler script'ine yönlendirir.
   Bu sayede hassas şablonlar ve iş mantığı ana koddan ayrıştırılır.
   ======================================================================== */

// Dynamic import sonucu tip güvenliği — modülün beklenen arayüzü
interface ExcelHandlerModule {
  generateTimesheetExcel?: (options: unknown) => Promise<Buffer>;
  generateSimpleExcel?: (options: unknown) => Promise<Buffer>;
  generateBotExcel?: (options: unknown) => Promise<Buffer>;
}

// String compare yerine instanceof ile yakalanabilir hata sınıfı
export class ExcelNotImplementedError extends Error {
  constructor() {
    super('EXCEL_NOT_IMPLEMENTED');
    this.name = 'ExcelNotImplementedError';
  }
}

export async function generateTimesheetExcel(options: unknown): Promise<Buffer> {
  try {
    const custom = await import("./customExcelHandler.js") as ExcelHandlerModule;
    if (custom.generateTimesheetExcel) {
      return await custom.generateTimesheetExcel(options);
    }
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code !== "ERR_MODULE_NOT_FOUND") throw err;
  }
  throw new ExcelNotImplementedError();
}

export async function generateSimpleExcel(options: unknown): Promise<Buffer> {
  try {
    const custom = await import("./customExcelHandler.js") as ExcelHandlerModule;
    if (custom.generateSimpleExcel) {
      return await custom.generateSimpleExcel(options);
    }
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code !== "ERR_MODULE_NOT_FOUND") throw err;
  }
  throw new ExcelNotImplementedError();
}

export async function generateBotExcel(options: unknown): Promise<Buffer> {
  try {
    const custom = await import("./customExcelHandler.js") as ExcelHandlerModule;
    if (custom.generateBotExcel) {
      return await custom.generateBotExcel(options);
    }
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && err.code !== "ERR_MODULE_NOT_FOUND") throw err;
  }
  throw new ExcelNotImplementedError();
}
