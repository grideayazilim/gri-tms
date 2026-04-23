/**
 * Gerçek export kodları ve şablonlar github'a yüklenmiyor. Projeyi çeken kişi,
 * kendi formatına uygun bir "customExcelHandler.js" yazmalıdır.
 * 
 * Eğer customExcelHandler.js yoksa, dışa aktarım tıklandığında UI'da 
 * "Bu sistemin excel çıktı şablonu ve script'i henüz yazılmadı" uyarısı çıkar.
 */

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
