import httpClient from "./httpClient";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function blobToJson(blob) {
  try {
    const text = await blob.text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchBlob(url, params) {
  try {
    const blob = await httpClient.get(url, { params, responseType: "blob" });
    return blob;
  } catch (err) {
    // Blob response'tan gerçek hata mesajını oku
    if (err?.status && err?.message === "Bir hata oluştu") {
      // İnterceptor blob'u okuyamadı, raw axios response'tan okumaya çalış
    }
    throw err;
  }
}

const TURKISH_MONTHS = [
  "OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN",
  "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"
];

export async function downloadTimesheetExcel({ locationId, year, month, locationName }) {
  const blob = await fetchBlob("/export/timesheet", { locationId, year, month });
  const period = `${TURKISH_MONTHS[month - 1]} ${year}`;
  const filename = `${locationName.toLocaleUpperCase('tr-TR')} - ${period} MAAŞLAR.xlsm`;
  downloadBlob(blob, filename);
}

export async function downloadSimpleExcel({ locationId, year, month, locationName }) {
  const blob = await fetchBlob("/export/simple", { locationId, year, month });
  const period = `${TURKISH_MONTHS[month - 1]} ${year}`;
  const filename = `${locationName.toLocaleUpperCase('tr-TR')} - ${period} LİSTE.xlsm`;
  downloadBlob(blob, filename);
}

export async function downloadBotExcel({ locationId, year, month, locationName }) {
  const blob = await fetchBlob("/export/bot", { locationId, year, month });
  const period = `${TURKISH_MONTHS[month - 1]} ${year}`;
  const filename = `${locationName.toLocaleUpperCase('tr-TR')} - ${period} BOT GİRDİSİ.xlsx`;
  downloadBlob(blob, filename);
}
