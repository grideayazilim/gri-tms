import httpClient from "./httpClient";

/**
 * Tek bir çalışanı (ve puantaj günlerini) sunucuya aktarır.
 * @param {object} data
 */
export async function importEmployee(data) {
  return httpClient.post("/import/employee", data);
}

/**
 * İmport tamamlandıktan sonra audit log oluşturur.
 * @param {object} data
 */
export async function finalizeImport(data) {
  return httpClient.post("/import/finalize", data);
}
