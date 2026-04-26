/* ========================================================================
   IMPORT SERVICE (İÇE AKTARIM SERVİSİ)
   Excel'den puantaj ve çalışan verisi aktarma işlemleri.
   ======================================================================== */
import httpClient from "./httpClient";

// Tekil çalışan ve puantaj verisi aktar (Excel satırı bazlı)
export const importEmployee = async (data) => {
  return httpClient.post('/import/employee', data);
};

// İçe aktarım işlemini özet verilerle tamamla (Audit log oluşturur)
export const finalizeImport = async (data) => {
  return httpClient.post('/import/finalize', data);
};

// Çoklu çalışan listesini toplu olarak aktar
export const bulkImportEmployees = async (data) => {
  return httpClient.post('/import/bulk-employees', data);
};
