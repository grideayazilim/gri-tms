/* ========================================================================
   EXCEL HANDLER (DİNAMİK YÜKLEYİCİ)
   Export işlemlerini projenin customExcelHandler script'ine yönlendirir.
   Bu sayede hassas şablonlar ve iş mantığı ana koddan ayrıştırılır.
   ======================================================================== */


export async function generateTimesheetExcel(options) {
  try {
    const custom = await import("./customExcelHandler.js");
    if (custom.generateTimesheetExcel) {
      return await custom.generateTimesheetExcel(options);
    }
  } catch (err) {
    if (err.code !== "ERR_MODULE_NOT_FOUND") throw err;
  }
  throw new Error("EXCEL_NOT_IMPLEMENTED");
}

export async function generateSimpleExcel(options) {
  try {
    const custom = await import("./customExcelHandler.js");
    if (custom.generateSimpleExcel) {
      return await custom.generateSimpleExcel(options);
    }
  } catch (err) {
    if (err.code !== "ERR_MODULE_NOT_FOUND") throw err;
  }
  throw new Error("EXCEL_NOT_IMPLEMENTED");
}

export async function generateBotExcel(options) {
  try {
    const custom = await import("./customExcelHandler.js");
    if (custom.generateBotExcel) {
      return await custom.generateBotExcel(options);
    }
  } catch (err) {
    if (err.code !== "ERR_MODULE_NOT_FOUND") throw err;
  }
  throw new Error("EXCEL_NOT_IMPLEMENTED");
}
