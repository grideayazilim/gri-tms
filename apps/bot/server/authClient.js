'use strict';

/**
 * İŞKUR Auth Client
 * Python web_server.py + esube_playwright_automation.py akışının birebir karşılığı
 * 
 * KRİTİK: Tarayıcı login + devam çizelgesi açıldıktan sonra KAPATILMIYOR
 * Cookie'ler alınıp HTTP client'a verilir, tarayıcı arka planda açık kalır
 * 
 * Akış:
 * 1. open_for_manual_login() → tarayıcı aç, ana sayfaya git
 * 2. login_with_credentials() → TC + Şifre + Firma Ara + Select2 + Login
 * 3. open_devam_cizelgesi_with_program() → IstIupListe → Ara → Seç → Devam Çizelgesi
 * 4. get_cookies() → cookie'leri al
 * 5. Tarayıcıyı AÇIK BIRAK (keep_alive)
 * 6. HTTP client devam çizelgesini işler
 * 7. Yeniden login gerekirse: logout() + login_with_credentials() + open_devam_cizelgesi_with_program()
 */

const { chromium } = require('playwright');

const ISKUR_BASE_URL = 'https://esube.iskur.gov.tr';
const LISTE_URL = `${ISKUR_BASE_URL}/Istihdam/IstIupListe.aspx`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class IskurAuthClient {
  constructor(logFn = null) {
    this.logFn = logFn || console.log;
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  log(msg) { this.logFn(msg); }

  /**
   * Tarayıcıyı aç ve ana sayfaya git
   */
  async openForLogin() {
    try {
      this.log('🌐 Tarayıcı açılıyor...');


     const headlessMode = process.env.HEADLESS !== 'false';

     this.browser = await chromium.launch({
       headless: headlessMode,
        slowMo: 10,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--start-maximized',
        ],
        channel: 'chrome',
      }).catch(async () => {
        // Chrome bulunamazsa varsayılan Chromium kullan
        this.log('⚠️ Chrome bulunamadı, Chromium deneniyor...');
        return await chromium.launch({
          headless: headlessMode,
          slowMo: 10,
          args: ['--start-maximized'],
        });
      });

      this.context = await this.browser.newContext({ viewport: null });
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(60000);
      this.page.setDefaultNavigationTimeout(60000);

      this.log('🌐 İŞKUR ana sayfasına gidiliyor...');
      await this.page.goto(ISKUR_BASE_URL, { waitUntil: 'domcontentloaded' });
      await sleep(300);

      return { success: true, message: 'Portal açıldı' };
    } catch (err) {
      return { success: false, message: `Portal açma hatası: ${err.message}` };
    }
  }

  /**
   * TC + Şifre ile otomatik login
   * Python login_with_credentials() fonksiyonunun birebir karşılığı
   */
  async loginWithCredentials(username, password) {
    try {
      if (!this.page) return { success: false, message: 'Sayfa objesi bulunamadı' };

      // 1. Giriş butonuna tıkla
      this.log("🔍 'Giriş' butonu aranıyor...");
      const girisSelectors = [
        'a[href="#modalIsverenGiris"]',
        'a.btn:has-text("Giriş")',
        'a:has-text("Giriş")',
      ];

      let girisClicked = false;
      for (const sel of girisSelectors) {
        try {
          const btn = this.page.locator(sel).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.click();
            girisClicked = true;
            this.log(`✅ Giriş butonuna tıklandı`);
            break;
          }
        } catch {}
      }
      if (!girisClicked) return { success: false, message: "'Giriş' butonu bulunamadı" };

      await sleep(1000);

      // 2. TC gir
      this.log('🔍 TC input alanı aranıyor...');
      const tcSelectors = [
        '#ctl02_userLoginIsveren_ctlEmployerUserId',
        'input[name="ctl02$userLoginIsveren$ctlEmployerUserId"]',
        'input[id*="ctlEmployerUserId"]',
      ];

      let tcFilled = false;
      for (const sel of tcSelectors) {
        try {
          const input = this.page.locator(sel).first();
          if (await input.count() > 0) {
            await input.fill(username);
            tcFilled = true;
            this.log('✅ TC alanı dolduruldu');
            break;
          }
        } catch {}
      }
      if (!tcFilled) return { success: false, message: 'TC input alanı bulunamadı' };

      await sleep(500);

      // 3. Şifre gir
      this.log('🔍 Şifre input alanı aranıyor...');
      const passSelectors = [
        '#ctl02_userLoginIsveren_ctlEmployerPassword',
        'input[name="ctl02$userLoginIsveren$ctlEmployerPassword"]',
        'input[id*="ctlEmployerPassword"]',
        'input[type="password"]',
      ];

      let passFilled = false;
      for (const sel of passSelectors) {
        try {
          const input = this.page.locator(sel).first();
          if (await input.count() > 0) {
            await input.fill(password);
            passFilled = true;
            this.log('✅ Şifre alanı dolduruldu');
            break;
          }
        } catch {}
      }
      if (!passFilled) return { success: false, message: 'Şifre input alanı bulunamadı' };

      await sleep(500);

      // 4. Firma Ara butonuna tıkla
      this.log("🔍 'İşveren Giriş' (Firma Ara) butonu aranıyor...");
      const firmaAraSelectors = [
        '#ctl02_userLoginIsveren_ctlEmployerFirmaAra',
        'input[name="ctl02$userLoginIsveren$ctlEmployerFirmaAra"]',
        'input[value="İşveren Giriş"][id*="FirmaAra"]',
      ];

      let firmaAraClicked = false;
      for (const sel of firmaAraSelectors) {
        try {
          const btn = this.page.locator(sel).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.click();
            firmaAraClicked = true;
            this.log('✅ Firma Ara butonuna tıklandı');
            break;
          }
        } catch {}
      }
      if (!firmaAraClicked) return { success: false, message: 'Firma Ara butonu bulunamadı' };

      await sleep(2000); // Firma listesi yüklensin

      // 5. Select2 dropdown'dan ilk seçeneği seç
      // KRİTİK: Select2 animasyonu nedeniyle isVisible() bazen false döner
      // Bu yüzden waitFor + force:true kullanıyoruz
      this.log('🔍 Select2 dropdown aranıyor...');
      
      let firmaSecildi = false;
      
      // Yöntem 1: Select2 container'ına tıkla → sonuçlar gelince ilk li'yi seç
      try {
        // Select2'nin container'ını bul (a.select2-choice veya .select2-container)
        const select2Container = this.page.locator('.select2-container, a.select2-choice, .select2-choice').first();
        await select2Container.waitFor({ state: 'visible', timeout: 5000 });
        await select2Container.click({ force: true });
        this.log('✅ Select2 container tıklandı');
        await sleep(800);

        // Sonuçların gelmesini bekle
        const results = this.page.locator('.select2-results li, .select2-result');
        await results.first().waitFor({ state: 'attached', timeout: 5000 });
        await sleep(300);

        // İlk sonuca tıkla (force:true ile animasyon sorununu atla)
        await results.first().click({ force: true });
        this.log('✅ İlk firma seçildi (Yöntem 1)');
        firmaSecildi = true;
      } catch (e) {
        this.log(`⚠️ Select2 Yöntem 1 başarısız: ${e.message}`);
      }

      // Yöntem 2: JavaScript ile seç (Yöntem 1 başarısız olursa)
      if (!firmaSecildi) {
        try {
          this.log('🔍 Select2 Yöntem 2: JavaScript ile seçim deneniyor...');
          await this.page.evaluate(() => {
            // Select2'yi JS ile aç
            const container = document.querySelector('.select2-container');
            if (container) {
              const choice = container.querySelector('a.select2-choice, .select2-choice');
              if (choice) choice.click();
            }
          });
          await sleep(800);

          // İlk li'yi JS ile tıkla
          await this.page.evaluate(() => {
            const firstResult = document.querySelector('.select2-results li, .select2-result');
            if (firstResult) firstResult.click();
          });
          this.log('✅ İlk firma seçildi (Yöntem 2 - JavaScript)');
          firmaSecildi = true;
        } catch (e) {
          this.log(`⚠️ Select2 Yöntem 2 başarısız: ${e.message}`);
        }
      }

      // Yöntem 3: Klavye ile seç (↓ + Enter)
      if (!firmaSecildi) {
        try {
          this.log('🔍 Select2 Yöntem 3: Klavye ile seçim deneniyor...');
          // Select2'yi bul ve klavye ile ilk seçeneği seç
          const select2 = this.page.locator('.select2-container, a.select2-choice').first();
          if (await select2.count() > 0) {
            await select2.click({ force: true });
            await sleep(500);
            await this.page.keyboard.press('ArrowDown');
            await sleep(300);
            await this.page.keyboard.press('Enter');
            this.log('✅ İlk firma seçildi (Yöntem 3 - Klavye)');
            firmaSecildi = true;
          }
        } catch (e) {
          this.log(`⚠️ Select2 Yöntem 3 başarısız: ${e.message}`);
        }
      }

      if (!firmaSecildi) {
        this.log('⚠️ Select2 firma seçimi başarısız - login yine de deneniyor...');
      }

      await sleep(1000);

      // 6. İşveren Giriş (login) butonuna tıkla
      this.log("🔍 'İşveren Giriş' (login) butonu aranıyor...");
      const loginBtnSelectors = [
        '#ctl02_userLoginIsveren_ctlEmployerLogin',
        'input[name="ctl02$userLoginIsveren$ctlEmployerLogin"]',
        'input[value="İşveren Giriş"][id*="Login"]',
      ];

      let loginClicked = false;
      for (const sel of loginBtnSelectors) {
        try {
          const btn = this.page.locator(sel).first();
          if (await btn.count() > 0 && await btn.isVisible()) {
            await btn.click();
            loginClicked = true;
            this.log('✅ İşveren Giriş butonuna tıklandı');
            break;
          }
        } catch {}
      }
      if (!loginClicked) return { success: false, message: 'İşveren Giriş butonu bulunamadı' };

      // Login tamamlanmasını bekle
      await sleep(3000);
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Login başarılı mı kontrol et
      const isLogged = await this.isLoggedIn();
      if (!isLogged) {
        return { success: false, message: 'Login başarısız: Kullanıcı adı veya şifre hatalı' };
      }

      this.log('✅ Login başarılı!');
      return { success: true, message: 'Login başarılı' };

    } catch (err) {
      return { success: false, message: `Login hatası: ${err.message}` };
    }
  }

  /**
   * Login olunup olunmadığını kontrol et
   * Python is_logged_in() fonksiyonunun karşılığı
   */
  async isLoggedIn() {
    try {
      if (!this.page) return false;
      const indicators = this.page.locator(
        "a[href*='IstIupListe'], a[href*='DevamCizelge'], #ctl03_ctlISTIUPKAYITNO, a:has-text('İstihdam')"
      );
      const count = await indicators.count();
      return count > 0;
    } catch {
      return false;
    }
  }

  /**
   * Program numarası ile Devam Çizelgesi sayfasını aç
   * Python open_devam_cizelgesi_with_program() fonksiyonunun birebir karşılığı
   */
  async openDevamCizelgesi(programNo) {
    try {
      this.log(`📋 Devam Çizelgesi açılıyor: Program ${programNo}`);

      // 1. IstIupListe sayfasına git
      this.log(`📋 Liste sayfasına gidiliyor: ${LISTE_URL}`);
      await this.page.goto(LISTE_URL, { waitUntil: 'domcontentloaded' });
      await sleep(2000);
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      // 2. Program numarasını gir
      const programInput = this.page.locator('#ctl03_ctlISTIUPKAYITNO');
      await programInput.waitFor({ state: 'visible', timeout: 10000 });
      await programInput.fill(programNo);
      this.log(`✅ Program numarası girildi: ${programNo}`);
      await sleep(200);

      // 3. Ara butonuna tıkla
      await this.page.click('#ctl03_ctlCommandIstIupListe_CommandItem_Search');
      this.log('✅ Ara butonuna tıklandı');
      await sleep(800);

      // 4. Seçim butonuna tıkla
      await this.page.click('#ctl03_ctlGridIstIupListe_ctl02_select');
      this.log('✅ Seçim butonuna tıklandı');
      await sleep(300);

      // 5. Devam Çizelgesi butonuna tıkla
      await this.page.click('#ctl03_ctlCommandIstIupListe_CommandItem_IstIupDevamCizelgeAc');
      this.log('✅ Devam Çizelgesi butonuna tıklandı - yeni sekme açılmalı!');
      await sleep(1000);

      // 6. Yeni sekmeyi bul (20 deneme)
      for (let attempt = 1; attempt <= 20; attempt++) {
        const pages = this.context.pages();
        this.log(`📋 Deneme ${attempt}/20 - ${pages.length} sekme açık`);

        for (const p of pages) {
          const url = p.url();
          if (url.includes('IstIupDevamCizelge') || url.includes('DevamCizelge')) {
            this.page = p;
            await p.bringToFront();
            this.log(`✅ Devam Çizelgesi sayfası bulundu: ${url}`);
            await sleep(200);
            return { success: true, message: 'Devam Çizelgesi açıldı', url };
          }
        }

        // Sekme geçişleri dene
        try { await this.page.keyboard.press('Control+2'); await sleep(100); } catch {}
        try { await this.page.keyboard.press('Control+1'); await sleep(100); } catch {}
        try { await this.page.mouse.click(200, 200); await sleep(200); } catch {}
        try { await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }); } catch {}
      }

      const finalUrl = this.page.url();
      this.log(`⚠️ Devam Çizelgesi bulunamadı. Son URL: ${finalUrl}`);
      return { success: false, message: 'Devam Çizelgesi sayfası bulunamadı', url: null };

    } catch (err) {
      this.log(`❌ Devam Çizelgesi açma hatası: ${err.message}`);
      return { success: false, message: err.message, url: null };
    }
  }

  /**
   * Cookie'leri al
   * Python get_cookies() fonksiyonunun karşılığı
   */
  async getCookies() {
    try {
      if (!this.context) return {};
      const cookies = await this.context.cookies();
      const cookieObj = {};
      cookies.forEach(c => { cookieObj[c.name] = c.value; });
      this.log(`✅ ${Object.keys(cookieObj).length} cookie alındı`);
      return cookieObj;
    } catch (err) {
      this.log(`❌ Cookie alma hatası: ${err.message}`);
      return {};
    }
  }

  /**
   * Devam Çizelgesi sayfasının HTML'ini al (hafta dropdown parse için)
   */
  async getPageContent() {
    try {
      if (!this.page) return null;
      return await this.page.content();
    } catch {
      return null;
    }
  }

  /**
   * Logout yap
   * Python logout() fonksiyonunun karşılığı
   */
  async logout() {
    try {
      if (!this.page) return;
      const logoutSelectors = [
        'a[href*="signout=true"]',
        'a[href*="Logout"]',
        'a[href*="logout"]',
        'a[href*="Cikis"]',
        'a:has-text("Sistemden Çıkış")',
        'a:has-text("Çıkış")',
      ];
      for (const sel of logoutSelectors) {
        try {
          const el = this.page.locator(sel).first();
          if (await el.count() > 0 && await el.isVisible()) {
            await el.click();
            this.log('✅ Çıkış yapıldı');
            await sleep(2000);
            return;
          }
        } catch {}
      }
      // Çıkış bulunamazsa ana sayfaya git
      await this.page.goto(ISKUR_BASE_URL, { waitUntil: 'domcontentloaded' });
      await sleep(1000);
    } catch (err) {
      this.log(`⚠️ Logout hatası: ${err.message}`);
    }
  }

  /**
   * Tam login + devam çizelgesi akışı
   * web_server.py'deki ana akışın karşılığı
   * 
   * KRİTİK: Tarayıcı KAPATILMIYOR - caller close() çağırmalı
   */
  async loginAndOpenCizelge(username, password, programNo) {
    // 1. Tarayıcı aç
    const openResult = await this.openForLogin();
    if (!openResult.success) {
      await this.close();
      return { success: false, message: openResult.message, cookies: {}, attendanceUrl: null, pageHtml: null };
    }

    // 2. Login yap
    this.log('🔄 Otomatik login yapılıyor...');
    const loginResult = await this.loginWithCredentials(username, password);
    if (!loginResult.success) {
      await this.close();
      return { success: false, message: loginResult.message, cookies: {}, attendanceUrl: null, pageHtml: null };
    }
    this.log('✅ Otomatik login başarılı!');

    // 3. Devam Çizelgesi aç
    this.log(`📋 Program numarası ile Devam Çizelgesi açılıyor: ${programNo}...`);
    const cizelgeResult = await this.openDevamCizelgesi(programNo);
    if (!cizelgeResult.success) {
      this.log(`⚠️ Devam Çizelgesi açılamadı: ${cizelgeResult.message}`);
    } else {
      this.log(`✅ Devam Çizelgesi açıldı: ${cizelgeResult.url}`);
    }

    // 4. Sayfanın HTML'ini al (hafta dropdown parse için)
    const pageHtml = await this.getPageContent();

    // 5. Cookie'leri al
    const cookies = await this.getCookies();
    this.log(`✅ ${Object.keys(cookies).length} cookie alındı`);

    // NOT: Tarayıcı KAPATILMIYOR - server.js yeniden login için kullanacak
    return {
      success: true,
      message: 'Login ve Devam Çizelgesi başarılı',
      cookies,
      attendanceUrl: cizelgeResult.url,
      pageHtml,
    };
  }

  /**
   * Yeniden login (10 dakika sonra)
   * web_server.py'deki relogin akışının karşılığı
   */
  async relogin(username, password, programNo) {
    try {
      this.log('🔄 Yeniden login yapılıyor...');

      // Önce logout yap
      await this.logout();
      await sleep(1000);

      // Tekrar login yap
      const loginResult = await this.loginWithCredentials(username, password);
      if (!loginResult.success) {
        this.log(`❌ Yeniden login başarısız: ${loginResult.message}`);
        return { success: false, message: loginResult.message, cookies: {}, attendanceUrl: null };
      }

      // Devam Çizelgesi tekrar aç
      const cizelgeResult = await this.openDevamCizelgesi(programNo);
      const cookies = await this.getCookies();

      this.log('✅ Yeniden login başarılı!');
      return {
        success: true,
        message: 'Yeniden login başarılı',
        cookies,
        attendanceUrl: cizelgeResult.url,
      };
    } catch (err) {
      return { success: false, message: `Yeniden login hatası: ${err.message}`, cookies: {}, attendanceUrl: null };
    }
  }

  /**
   * Tarayıcıyı kapat
   */
  async close() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }
}

module.exports = { IskurAuthClient };