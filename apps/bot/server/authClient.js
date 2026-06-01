'use strict';



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
      this.log('🌐 Tarayıcı açılıyor, lütfen bekleyin...');

      this.browser = await chromium.launch({
        headless: false,
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
        this.log('⚠️ Chrome bulunamadı, alternatif tarayıcı ile devam ediliyor...');
        return await chromium.launch({
          headless: false,
          slowMo: 10,
          args: ['--start-maximized'],
        });
      });

      this.context = await this.browser.newContext({ viewport: null });
      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(60000);
      this.page.setDefaultNavigationTimeout(60000);

      this.log('🌐 İŞKUR portalı açılıyor...');
      await this.page.goto(ISKUR_BASE_URL, { waitUntil: 'domcontentloaded' });
      await sleep(300);

      return { success: true, message: 'Portal açıldı' };
    } catch (err) {
      return { success: false, message: `❌ Portal açılamadı. İnternet bağlantınızı kontrol edin. (Hata: ${err.message})` };
    }
  }

  
  async loginWithCredentials(username, password) {
    try {
      if (!this.page) return { success: false, message: 'Sayfa objesi bulunamadı' };

      // 1. Giriş butonuna tıkla
      this.log("🔍 Portala giriş yapılıyor, 'Giriş' butonu aranıyor...");
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
            this.log(`✅ Giriş ekranı açıldı`);
            break;
          }
        } catch {}
      }
      if (!girisClicked) return { success: false, message: "❌ Portal giriş ekranı açılamadı. Sayfa yüklenememiş olabilir, tekrar deneyin." };

      await sleep(1000);

      // 2. TC gir
      this.log('🔍 Kullanıcı adı (TC) giriliyor...');
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
            this.log('✅ Kullanıcı adı (TC) girildi');
            break;
          }
        } catch {}
      }
      if (!tcFilled) return { success: false, message: '❌ Kullanıcı adı girilemedi. İŞKUR portalı değişmiş olabilir, geliştirici ile iletişime geçin.' };

      await sleep(500);

      // 3. Şifre gir
      this.log('🔍 Şifre giriliyor...');
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
            this.log('✅ Şifre girildi');
            break;
          }
        } catch {}
      }
      if (!passFilled) return { success: false, message: '❌ Şifre girilemedi. İŞKUR portalı değişmiş olabilir, geliştirici ile iletişime geçin.' };

      await sleep(500);

      // 4. Firma Ara butonuna tıkla
      this.log("🔍 Firma bilgileri yükleniyor, 'Firma Ara' butonuna tıklanıyor...");
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
            this.log('✅ Firma Ara tıklandı, firmalar yükleniyor...');
            break;
          }
        } catch {}
      }
      if (!firmaAraClicked) return { success: false, message: '❌ Firma Ara butonu bulunamadı. İŞKUR portalı değişmiş olabilir, geliştirici ile iletişime geçin.' };

      await sleep(2000); // Firma listesi yüklensin

      // ── Hata popup kontrolü: TC geçersiz veya şifre hatalı mı? ──
      try {
        const errorMsg = this.page.locator('#ctl02_ctlMessageBox_lblMessage');
        if (await errorMsg.count() > 0 && await errorMsg.isVisible()) {
          const text = (await errorMsg.textContent() || '').trim();
          if (text && text.length > 3) {
            // Tamam butonunu kapat
            try {
              const tamam = this.page.locator('button:has-text("Tamam"), input[value="Tamam"]').first();
              if (await tamam.count() > 0) await tamam.click().catch(() => {});
            } catch {}
            return { success: false, message: `❌ Giriş başarısız: ${text} — Kullanıcı adı veya şifrenizi kontrol edin.` };
          }
        }
      } catch {}

      this.log('✅ Hata mesajı yok, firma listesi yükleniyor...');

      // 5. Select2 dropdown'dan ilk seçeneği seç
      // KRİTİK: Select2 animasyonu nedeniyle isVisible() bazen false döner
      // Bu yüzden waitFor + force:true kullanıyoruz
      this.log('🔍 Firma listesi açılıyor, firma seçiliyor...');
      
      let firmaSecildi = false;
      
      // Yöntem 1: Select2 container'ına tıkla → sonuçlar gelince ilk li'yi seç
      try {
        // Select2'nin container'ını bul (a.select2-choice veya .select2-container)
        const select2Container = this.page.locator('.select2-container, a.select2-choice, .select2-choice').first();
        await select2Container.waitFor({ state: 'visible', timeout: 5000 });
        await select2Container.click({ force: true });
        this.log('✅ Select2 container tıklandı');
        await sleep(800);

        const results = this.page.locator('.select2-results li, .select2-result');
        await results.first().waitFor({ state: 'attached', timeout: 5000 });
        await sleep(300);

        await results.first().click({ force: true });
        this.log('✅ Firma seçildi');
        firmaSecildi = true;
      } catch (e) {
        this.log(`⚠️ Firma listesi açılmaya çalışılıyor (2. yöntem deneniyor)...`);
      }

      // Yöntem 2
      if (!firmaSecildi) {
        try {
          await this.page.evaluate(() => {
            const container = document.querySelector('.select2-container');
            if (container) {
              const choice = container.querySelector('a.select2-choice, .select2-choice');
              if (choice) choice.click();
            }
          });
          await sleep(800);

          await this.page.evaluate(() => {
            const firstResult = document.querySelector('.select2-results li, .select2-result');
            if (firstResult) firstResult.click();
          });
          this.log('✅ Firma seçildi');
          firmaSecildi = true;
        } catch (e) {
          this.log(`⚠️ Firma listesi açılmaya çalışılıyor (3. yöntem deneniyor)...`);
        }
      }

      // Yöntem 3
      if (!firmaSecildi) {
        try {
          const select2 = this.page.locator('.select2-container, a.select2-choice').first();
          if (await select2.count() > 0) {
            await select2.click({ force: true });
            await sleep(500);
            await this.page.keyboard.press('ArrowDown');
            await sleep(300);
            await this.page.keyboard.press('Enter');
            this.log('✅ Firma seçildi');
            firmaSecildi = true;
          }
        } catch (e) {
          this.log(`⚠️ Firma listesinden otomatik seçim yapılamadı`);
        }
      }

      if (!firmaSecildi) {
        this.log('⚠️ Firma listesinden otomatik seçim yapılamadı, giriş yine de deneniyor...');
      }

      await sleep(1000);

      // 6. İşveren Giriş (login) butonuna tıkla
      this.log("🔍 Portala giriş yapılıyor...");
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
            this.log('✅ Giriş butonuna tıklandı, portal yanıt bekleniyor...');
            break;
          }
        } catch {}
      }
      if (!loginClicked) return { success: false, message: '❌ Giriş yapılamadı. Kullanıcı adı veya şifreniz hatalı olabilir. Lütfen kontrol edip tekrar deneyin.' };

      // Login tamamlanmasını bekle
      await sleep(3000);
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Login başarılı mı kontrol et
      const isLogged = await this.isLoggedIn();
      if (!isLogged) {
        return { success: false, message: '❌ Giriş başarısız. Kullanıcı adı veya şifreniz hatalı. Lütfen kontrol edip tekrar deneyin.' };
      }

      this.log('✅ Giriş başarılı! Portal açıldı.');
      return { success: true, message: 'Login başarılı' };

    } catch (err) {
      return { success: false, message: `❌ Beklenmeyen giriş hatası: ${err.message}. Tekrar deneyin.` };
    }
  }

  
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

  
  async openDevamCizelgesi(programNo) {
    try {
      this.log(`📋 Devam Çizelgesi açılıyor (Program No: ${programNo})...`);

      // 1. IstIupListe sayfasına git
      this.log(`📋 Program listesi sayfasına gidiliyor...`);
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
      this.log('✅ Program aranıyor...');
      await sleep(800);

      // 4. Seçim butonuna tıkla
      await this.page.click('#ctl03_ctlGridIstIupListe_ctl02_select');
      this.log('✅ Program bulundu, Devam Çizelgesi açılıyor...');
      await sleep(300);

      // 5. Devam Çizelgesi butonuna tıkla
      await this.page.click('#ctl03_ctlCommandIstIupListe_CommandItem_IstIupDevamCizelgeAc');
      this.log('✅ Devam Çizelgesi yükleniyor, sayfa bekleniyor...');
      await sleep(1000);

      // 6. Yeni sekmeyi bul (20 deneme)
      for (let attempt = 1; attempt <= 20; attempt++) {
        const pages = this.context.pages();
        if (attempt % 5 === 1) {
          this.log(`🔍 Devam Çizelgesi sayfası aranıyor... (${attempt}/20)`);
        }

        for (const p of pages) {
          const url = p.url();
          if (url.includes('IstIupDevamCizelge') || url.includes('DevamCizelge')) {
            this.page = p;
            await p.bringToFront();
            this.log(`✅ Devam Çizelgesi sayfası açıldı`);
            await sleep(200);
            return { success: true, message: 'Devam Çizelgesi açıldı', url };
          }
        }

        try { await this.page.keyboard.press('Control+2'); await sleep(100); } catch {}
        try { await this.page.keyboard.press('Control+1'); await sleep(100); } catch {}
        try { await this.page.mouse.click(200, 200); await sleep(200); } catch {}
        try { await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }); } catch {}
      }

      this.log(`❌ Devam Çizelgesi sayfası açılamadı`);
      return { success: false, message: '❌ Devam Çizelgesi açılamadı. Program numarası doğru mu? Yetkili hesapla giriş yapıldı mı?', url: null };

    } catch (err) {
      this.log(`❌ Devam Çizelgesi açılırken hata oluştu: ${err.message}`);
      return { success: false, message: `❌ Devam Çizelgesi açılamadı: ${err.message}`, url: null };
    }
  }

  
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
            this.log('✅ Portal oturumu kapatıldı');
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

  
  async loginAndOpenCizelge(username, password, programNo) {
    // 1. Tarayıcı aç
    const openResult = await this.openForLogin();
    if (!openResult.success) {
      await this.close();
      return { success: false, message: openResult.message, cookies: {}, attendanceUrl: null, pageHtml: null };
    }

    // 2. Login yap
    this.log('🔐 Portal açılıyor, otomatik giriş yapılıyor...');
    const loginResult = await this.loginWithCredentials(username, password);
    if (!loginResult.success) {
      await this.close();
      return { success: false, message: loginResult.message, cookies: {}, attendanceUrl: null, pageHtml: null };
    }
    this.log('✅ Giriş başarılı!');

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

  
  async relogin(username, password, programNo) {
    try {
      this.log('🔄 10 dakika doldu, portal oturumu yenileniyor...');

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

      this.log('✅ Portal oturumu yenilendi, işlemler devam ediyor...');
      return {
        success: true,
        message: 'Yeniden login başarılı',
        cookies,
        attendanceUrl: cizelgeResult.url,
      };
    } catch (err) {
      return { success: false, message: `❌ Oturum yenileme sırasında beklenmeyen hata: ${err.message}`, cookies: {}, attendanceUrl: null };
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