'use strict';



const axios = require('axios');
const cheerio = require('cheerio');

const DEBUG_MODE = true;

// ─────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────

/**
 * TC kimlik numarasını maskele 
 */
function maskTc(tc) {
  if (!tc || tc.length < 4) return '****';
  if (tc.length < 6) return `${tc.slice(0, 2)}***`;
  return `${tc.slice(0, 4)}${'*'.repeat(tc.length - 6)}${tc.slice(-2)}`;
}

/**
 * HTML'den ASP.NET WebForms hidden field'larını parse et
 */
function parseHiddenFields(html) {
  const $ = cheerio.load(html);
  const hiddenFields = {};

  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name') || '';
    const value = $(el).attr('value') || '';
    if (name) {
      hiddenFields[name] = value;
    }
  });

  return hiddenFields;
}

/**
 * HTML'den tüm form field'larını parse et (hidden + select current values)
 */
function parseAllFormFields(html) {
  const $ = cheerio.load(html);
  const formFields = {};

  // Hidden input'lar
  $('input[type="hidden"]').each((_, el) => {
    const name = $(el).attr('name') || '';
    const value = $(el).attr('value') || '';
    if (name) formFields[name] = value;
  });

  // Select'lerin mevcut değerleri
  $('select').each((_, el) => {
    const name = $(el).attr('name') || '';
    if (!name) return;

    let selectedOption = $(el).find('option[selected]');
    if (!selectedOption.length) {
      selectedOption = $(el).find('option').first();
    }
    const value = selectedOption.attr('value') || '';
    if (value) formFields[name] = value;
  });

  // Text input'ların mevcut değerleri
  $('input[type="text"]').each((_, el) => {
    const name = $(el).attr('name') || '';
    const value = $(el).attr('value') || '';
    if (name && value) formFields[name] = value;
  });

  return formFields;
}

/**
 * HTML'den tarih -> checkbox name mapping'i oluştur
 * Aynı tarih için birden fazla checkbox varsa en düşük row numarasını seçer (ilk satır = aranan kişi)
 */
function parseDateCheckboxMap(html) {
  const $ = cheerio.load(html);
  const dateToAllCheckboxes = {}; // { dateStr: [{rowNum, name}] }

  $('input[type="checkbox"]').each((_, el) => {
    const name = $(el).attr('name') || '';
    const value = $(el).attr('value') || '';

    if (!name.includes('chkListe') || !name.includes('ctlGridIstIupDevam')) return;
    if (!value) return;

    // Tarih formatı kontrolü: d.MM.yyyy veya dd.MM.yyyy
    const parts = value.split('.');
    if (parts.length !== 3) return;
    if (value.length !== 9 && value.length !== 10) return;

    // Row numarasını çıkar
    const nameParts = name.split('$');
    if (nameParts.length < 3) return;

    const rowPart = nameParts[2]; // örn: ctl02
    if (!rowPart.startsWith('ctl')) return;
    const rowNumStr = rowPart.slice(3);
    if (!/^\d+$/.test(rowNumStr)) return;
    const rowNum = parseInt(rowNumStr, 10);

    if (!dateToAllCheckboxes[value]) dateToAllCheckboxes[value] = [];
    dateToAllCheckboxes[value].push({ rowNum, name });
  });

  // Her tarih için en düşük row numarasına sahip checkbox'ı seç
  const dateToCheckbox = {};
  for (const [dateStr, checkboxes] of Object.entries(dateToAllCheckboxes)) {
    checkboxes.sort((a, b) => a.rowNum - b.rowNum);
    dateToCheckbox[dateStr] = checkboxes[0].name;

    if (checkboxes.length > 1 && DEBUG_MODE) {
      console.warn(`⚠️ Aynı tarih için ${checkboxes.length} checkbox bulundu: ${dateStr}`);
      console.warn(`   ✅ Seçilen: ${checkboxes[0].name} (row: ${checkboxes[0].rowNum})`);
    }
  }

  return dateToCheckbox;
}

/**
 * HTML'den hafta dropdown'ını parse et
 * Returns: { weekNo: { start: Date, end: Date } }
 */
function parseWeekDropdown(html) {
  const $ = cheerio.load(html);
  const weekMap = {};

  const MONTH_MAP = {
    'Ocak': 1, 'Şubat': 2, 'Mart': 3, 'Nisan': 4,
    'Mayıs': 5, 'Haziran': 6, 'Temmuz': 7, 'Ağustos': 8,
    'Eylül': 9, 'Ekim': 10, 'Kasım': 11, 'Aralık': 12
  };

  $('select[name="ctl03$ctlHafta"] option').each((_, el) => {
    const value = $(el).attr('value') || '';
    const text = $(el).text().trim();
    if (!value || !text) return;

    const weekNo = parseInt(value, 10);
    if (isNaN(weekNo)) return;

    // "(29 Aralık 2025 - 4 Ocak 2026)" kısmını parse et
    const dateMatch = text.match(/\(([^)]+)\)/);
    if (!dateMatch) return;

    const [startStr, endStr] = dateMatch[1].split(' - ').map(s => s.trim());

    const parseDate = (str) => {
      const parts = str.split(' ');
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0], 10);
      const month = MONTH_MAP[parts[1]];
      const year = parseInt(parts[2], 10);
      if (!month) return null;
      return new Date(year, month - 1, day);
    };

    const start = parseDate(startStr);
    const end = parseDate(endStr);
    if (start && end) weekMap[weekNo] = { start, end };
  });

  return weekMap;
}

/**
 * Bir tarih string'i için hangi haftaya ait olduğunu bul
 */
function findWeekForDate(dateStr, weekMap) {
  const parts = dateStr.split('.');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts.map(Number);
  const target = new Date(year, month - 1, day);

  for (const [weekNo, { start, end }] of Object.entries(weekMap)) {
    if (target >= start && target <= end) {
      return parseInt(weekNo, 10);
    }
  }
  return null;
}

/**
 * Ay/yıl ve gün flag'lerinden tam tarih string'leri oluştur
 * Tek basamaklı günler 0'sız: 9.01.2026
 * Çift basamaklı günler normal: 10.01.2026
 */
function buildFullDates(month, year, dayFlags) {
  const dates = new Set();
  const lastDay = new Date(year, month, 0).getDate(); // ayın son günü

  for (let day = 1; day <= lastDay; day++) {
    if (dayFlags[day] === 1) {
      const monthStr = String(month).padStart(2, '0');
      const dayStr = day < 10 ? String(day) : String(day);
      dates.add(`${dayStr}.${monthStr}.${year}`);
    }
  }

  return dates;
}

/**
 * HTML'den mevcut seçili (checked) checkbox'ları parse et
 */
function parseExistingCheckedCheckboxes(html) {
  const $ = cheerio.load(html);
  const checked = {};

  $('input[type="checkbox"]').each((_, el) => {
    const name = $(el).attr('name') || '';
    const value = $(el).attr('value') || '';
    const isChecked = $(el).attr('checked') !== undefined;

    if (!name.includes('chkListe') || !name.includes('ctlGridIstIupDevam')) return;
    if (!isChecked || !value) return;

    const parts = value.split('.');
    if (parts.length !== 3) return;
    if (value.length !== 9 && value.length !== 10) return;

    checked[name] = value;
  });

  return checked;
}

/**
 * HTML'den hata mesajını çıkar
 */
function extractErrorMessage(html) {
  const $ = cheerio.load(html);

  // Validation/error class'lı elementler
  const errorEl = $('[class*="error"], [class*="validation"], [class*="hata"], [class*="alert"], [class*="danger"]').first();
  if (errorEl.length) {
    const text = errorEl.text().trim();
    if (text.length > 5) return text;
  }

  // JavaScript alert mesajları
  const scriptContent = $('script').text();
  const alertMatch = scriptContent.match(/alert\(['"]([^'"]+)['"]\)/i);
  if (alertMatch) return alertMatch[1];

  return null;
}

// ─────────────────────────────────────────────
// ANA PORTAL CLIENT SINIFI
// ─────────────────────────────────────────────

class PortalClient {
  /**
   * @param {string} baseUrl
   * @param {object} cookies  - { cookieName: value }
   * @param {string} attendanceUrl - Devam Çizelgesi tam URL
   * @param {function} logFn  - Log callback (isteğe bağlı)
   */
  constructor(baseUrl = 'https://esube.iskur.gov.tr', cookies = {}, attendanceUrl = null, logFn = null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.attendanceUrl = attendanceUrl;
    this.logFn = logFn || console.log;

    // axios instance - cookie jar gibi davranması için
    this.cookieJar = { ...cookies };
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 600, // 500'ü de kabul et
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Response interceptor: set-cookie'leri yakala
    this.axiosInstance.interceptors.response.use((response) => {
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        setCookie.forEach((cookieStr) => {
          const [pair] = cookieStr.split(';');
          const [key, val] = pair.split('=');
          if (key && val !== undefined) {
            this.cookieJar[key.trim()] = val.trim();
          }
        });
      }
      return response;
    });

    // Request interceptor: cookie'leri her isteğe ekle
    this.axiosInstance.interceptors.request.use((config) => {
      const cookieStr = Object.entries(this.cookieJar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      if (cookieStr) config.headers['Cookie'] = cookieStr;
      return config;
    });
  }

  log(msg) { this.logFn(msg); }

  /**
   * Form data'yı URL encoded string'e çevir
   */
  _encodeForm(data) {
    return Object.entries(data)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)
      .join('&');
  }

  /**
   * Attendance sayfasını GET ile al
   */
  async getAttendancePage() {
    if (!this.attendanceUrl) {
      return { success: false, message: 'attendanceUrl bulunamadı!', html: null };
    }

    try {
      const response = await this.axiosInstance.get(this.attendanceUrl);
      return { success: true, message: 'Sayfa alındı', html: response.data };
    } catch (err) {
      return { success: false, message: `GET hatası: ${err.message}`, html: null };
    }
  }

  /**
   * TC arama POST isteği
   */
  async postSearch(searchUrl, weekNo, tc, hiddenFields, extraFormState = {}) {
    try {
      const payload = {
        ...hiddenFields,
        ...extraFormState,
        '__EVENTTARGET': 'ctl03$ctlCommandIstIupDevamCizelge$CommandItem_Search',
        '__EVENTARGUMENT': '',
        'ctl03$ctlHafta': String(weekNo),
        'ctl03$ctlTCKIMLIKNO': tc,
      };

      const response = await this.axiosInstance.post(searchUrl, this._encodeForm(payload));
      this.log(`✅ Search POST başarılı: hafta=${weekNo}, tc=${maskTc(tc)}`);
      return { success: true, message: 'Search başarılı', html: response.data };
    } catch (err) {
      return { success: false, message: `Search POST hatası: ${err.message}`, html: null };
    }
  }

  /**
   * Devam güncelleme POST isteği
   */
  async postUpdate(updateUrl, hiddenFields, selectedDates, dateToCheckboxMap, groupValue = null, extraFormState = {}, existingCheckedCheckboxes = {}) {
    try {
      const payload = {
        ...hiddenFields,
        ...extraFormState,
        '__EVENTTARGET': 'ctl03$ctlCommandIstIupDevamCizelge$CommandItem_IupUpdateDevamCizelge',
        '__EVENTARGUMENT': '',
      };

      // Grup dropdown'larını ayarla
      let groupCount = 0;
      if (groupValue) {
        // Checkbox map'ten tüm row'ları bul
        const allRows = new Set();
        for (const checkboxName of Object.values(dateToCheckboxMap)) {
          const parts = checkboxName.split('$');
          if (parts.length >= 3) allRows.add(parts[2]);
        }

        for (const rowPart of allRows) {
          const fieldName = `ctl03$ctlGridIstIupDevam$${rowPart}$ctlGrupBilgisiAlt`;
          payload[fieldName] = groupValue;
          groupCount++;
        }

        // extraFormState'deki grup dropdown'larını da güncelle
        for (const key of Object.keys(extraFormState)) {
          if (key.includes('ctlGrupBilgisiAlt')) {
            payload[key] = groupValue;
          }
        }
      }

      // Mevcut seçili checkbox'ları koru
      for (const [name, value] of Object.entries(existingCheckedCheckboxes)) {
        if (!payload[name]) payload[name] = value;
      }

      // Excel'den gelen yeni checkbox'ları ekle
      let checkboxCount = 0;
      const missingDates = [];
      for (const dateStr of selectedDates) {
        const checkboxName = dateToCheckboxMap[dateStr];
        if (checkboxName) {
          payload[checkboxName] = dateStr;
          checkboxCount++;
        } else {
          missingDates.push(dateStr);
        }
      }

      if (missingDates.length > 0) {
        this.log(`⚠️ ${missingDates.length} tarih için checkbox bulunamadı: ${missingDates.join(', ')}`);
      }

      this.log(`📊 Update payload: ${checkboxCount}/${selectedDates.size} checkbox, ${groupCount} grup dropdown`);

      const response = await this.axiosInstance.post(updateUrl, this._encodeForm(payload));
      const html = response.data;
      const status = response.status;
      const htmlLower = html.toLowerCase();

      // Portal kısıtlaması kontrolü
      if (/devam\s+kaydı\s+girilen|güncelleme\s+yapılamaz/.test(htmlLower)) {
        return { success: false, message: 'PORTAL_RESTRICTION: Devam kaydı girilen katılımcının çizelgesinde güncelleme yapılamaz', html };
      }

      // Excel veri hatası (haftada max 3 gün)
      if (/en\s+fazla\s+\d+\s+gün|devam\s+günü\s+işaretlenebilir/.test(htmlLower)) {
        return { success: false, message: 'EXCEL_DATA_ERROR: Bu haftaya en fazla 3 gün girilebilir', html };
      }

      // Başarı göstergeleri
      const successIndicators = ['güncellenmiştir', 'başarıyla güncellendi', 'successfully updated'];
      const hasSuccess = successIndicators.some(s => htmlLower.includes(s));

      // Kritik hata göstergeleri
      const criticalErrors = [/hata\s+oluştu/, /error\s+occurred/, /işlem\s+başarısız/];
      const hasError = criticalErrors.some(r => r.test(htmlLower));

      if (hasError && !hasSuccess) {
        const errorMsg = extractErrorMessage(html) || 'Bilinmeyen hata';
        return { success: false, message: `Update başarısız: ${errorMsg}`, html };
      }

      this.log(`✅ Update POST başarılı (HTTP ${status}): ${selectedDates.size} tarih`);
      return { success: true, message: `Update başarılı: ${selectedDates.size} tarih güncellendi`, html };

    } catch (err) {
      return { success: false, message: `Update POST hatası: ${err.message}`, html: null };
    }
  }

  /**
   * Bir kişi için tüm attendance güncelleme akışı
   * @param {string} tc
   * @param {number} month
   * @param {number} year
   * @param {object} dayFlags - { 1: 1, 2: 0, ... }
   * @param {string|null} groupValue
   * @param {number} maxRetries
   */
  async updateAttendanceForPerson(tc, month, year, dayFlags, groupValue = null, maxRetries = 7) {
    const masked = maskTc(tc);
    this.log(`🔄 Başlatılıyor: tc=${masked}, ${month}/${year}`);

    // 1. Tarihleri oluştur
    const fullDates = buildFullDates(month, year, dayFlags);
    if (fullDates.size === 0) {
      return { success: true, message: 'Seçilecek tarih yok' };
    }

    this.log(`📅 ${fullDates.size} tarih işlenecek: ${[...fullDates].sort().join(', ')}`);

    // 2. İlk GET ile hafta dropdown'ını parse et
    const { success: getOk, message: getMsg, html: initialHtml } = await this.getAttendancePage();
    if (!getOk) return { success: false, message: `Sayfa alınamadı: ${getMsg}` };

    const weekMap = parseWeekDropdown(initialHtml);
    if (!Object.keys(weekMap).length) {
      return { success: false, message: 'Hafta dropdown parse edilemedi' };
    }

    // 3. Tarihleri haftalara göre grupla
    const datesByWeek = {};
    for (const dateStr of fullDates) {
      const weekNo = findWeekForDate(dateStr, weekMap);
      if (weekNo) {
        if (!datesByWeek[weekNo]) datesByWeek[weekNo] = new Set();
        datesByWeek[weekNo].add(dateStr);
      } else {
        this.log(`⚠️ Tarih ${dateStr} için hafta bulunamadı`);
      }
    }

    if (!Object.keys(datesByWeek).length) {
      return { success: false, message: 'Hiçbir tarih için hafta bulunamadı' };
    }

    this.log(`📊 ${Object.keys(datesByWeek).length} farklı hafta: ${Object.keys(datesByWeek).sort().join(', ')}`);

    const searchUrl = this.attendanceUrl || `${this.baseUrl}/IstIupDevamCizelge.aspx`;
    let totalSuccess = 0;
    let totalErrors = 0;

    // 4. Her hafta için işlem yap
    for (const [weekNoStr, datesInWeek] of Object.entries(datesByWeek)) {
      const weekNo = parseInt(weekNoStr, 10);
      this.log(`📅 Hafta ${weekNo} işleniyor: ${[...datesInWeek].sort().join(', ')}`);

      let weekDone = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Fresh sayfa al
          const { success: pageOk, html: pageHtml } = await this.getAttendancePage();
          if (!pageOk) {
            if (attempt < maxRetries) { await sleep(500); continue; }
            totalErrors += datesInWeek.size; break;
          }

          await sleep(300);
          let hiddenFields = parseHiddenFields(pageHtml);
          let extraFormState = parseAllFormFields(pageHtml);

          // Hafta seçimi POST
          const weekPayload = {
            ...hiddenFields,
            ...extraFormState,
            '__EVENTTARGET': 'ctl03$ctlHafta',
            '__EVENTARGUMENT': '',
            'ctl03$ctlHafta': String(weekNo),
          };

          const weekRes = await this.axiosInstance.post(searchUrl, this._encodeForm(weekPayload));
          hiddenFields = parseHiddenFields(weekRes.data);
          extraFormState = parseAllFormFields(weekRes.data);
          await sleep(300);

          // TC araması
          const searchResult = await this.postSearch(searchUrl, weekNo, tc, hiddenFields, extraFormState);
          if (!searchResult.success) {
            if (attempt < maxRetries) { await sleep(500); continue; }
            totalErrors += datesInWeek.size; break;
          }

          const searchHtml = searchResult.html;
          const searchHiddenFields = parseHiddenFields(searchHtml);
          const searchFormState = parseAllFormFields(searchHtml);
          let dateToCheckboxMap = parseDateCheckboxMap(searchHtml);
          let existingChecked = parseExistingCheckedCheckboxes(searchHtml);

          // Checkbox map boşsa bekle ve tekrar dene
          if (!Object.keys(dateToCheckboxMap).length) {
            this.log(`⚠️ Checkbox map boş (attempt ${attempt}), bekleniyor...`);
            await sleep(1000);
            dateToCheckboxMap = parseDateCheckboxMap(searchHtml);
            existingChecked = parseExistingCheckedCheckboxes(searchHtml);
          }

          if (!Object.keys(dateToCheckboxMap).length) {
            this.log(`⚠️ Hala checkbox map boş, retry...`);
            if (attempt < maxRetries) { await sleep(800); continue; }
            totalErrors += datesInWeek.size; break;
          }

          this.log(`🔍 Checkbox map: ${Object.keys(dateToCheckboxMap).length} tarih bulundu`);

          // Sadece checkbox map'te olan tarihleri seç
          const filteredDates = new Set();
          for (const dateStr of datesInWeek) {
            if (dateToCheckboxMap[dateStr]) {
              filteredDates.add(dateStr);
            } else {
              this.log(`❌ Checkbox map'te bulunamadı: ${dateStr}`);
            }
          }

          if (!filteredDates.size) {
            this.log(`❌ Hafta ${weekNo} için hiçbir tarih bulunamadı, atlanıyor`);
            totalErrors += datesInWeek.size;
            weekDone = true;
            break;
          }

          // Update POST
          const updateResult = await this.postUpdate(
            searchUrl,
            searchHiddenFields,
            filteredDates,
            dateToCheckboxMap,
            groupValue,
            searchFormState,
            existingChecked
          );

          if (!updateResult.success) {
            const msg = updateResult.message;

            // Retry yapılmayacak hatalar
            if (msg.startsWith('PORTAL_RESTRICTION') || msg.startsWith('EXCEL_DATA_ERROR')) {
              this.log(`❌ ${msg} - Retry yapılmayacak`);
              totalErrors += filteredDates.size;
              weekDone = true;
              break;
            }

            if (attempt < maxRetries) {
              this.log(`⚠️ Update başarısız (attempt ${attempt}/${maxRetries}): ${msg}`);
              await sleep(800 + attempt * 200);
              continue;
            }

            this.log(`❌ Hafta ${weekNo} başarısız (tüm retry'ler tükendi): ${msg}`);
            totalErrors += filteredDates.size;
            weekDone = true;
            break;
          }

          totalSuccess += filteredDates.size;
          this.log(`✅ Hafta ${weekNo} güncellendi: ${[...filteredDates].sort().join(', ')}`);
          weekDone = true;
          break; // Başarılı, bir sonraki haftaya

        } catch (err) {
          this.log(`⚠️ Beklenmeyen hata (attempt ${attempt}): ${err.message}`);
          if (attempt < maxRetries) { await sleep(500); continue; }
          totalErrors += datesInWeek.size;
          weekDone = true;
        }
      }
    }

    const resultMsg = `tc=${masked} | Başarılı: ${totalSuccess}, Hata: ${totalErrors}`;
    const isSuccess = totalSuccess > 0;
    this.log(isSuccess ? `✅ ${resultMsg}` : `❌ ${resultMsg}`);
    return { success: isSuccess, message: resultMsg };
  }

  setCookies(cookies) {
    Object.assign(this.cookieJar, cookies);
  }

  getCookies() {
    return { ...this.cookieJar };
  }
}


// YARDIMCI

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  PortalClient,
  parseHiddenFields,
  parseAllFormFields,
  parseDateCheckboxMap,
  parseWeekDropdown,
  findWeekForDate,
  buildFullDates,
  parseExistingCheckedCheckboxes,
  extractErrorMessage,
  maskTc,
};