import { test, expect } from '../fixtures/coverage';
import { LoginPage } from '../pages/LoginPage';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Kayıt Ol Akışı', () => {
  test('Yeni bir Admin kullanıcısı kayıt olabilmeli', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // "Hesap oluştur" veya "Kayıt ol" linkine tıkla
    await page.locator('.auth-page__link', { hasText: 'Hesap oluştur' }).click();

    // Başlığın değiştiğini doğrula
    await expect(page.locator('.auth-page__title')).toHaveText('Hesap Oluştur');

    // Animasyonun bitmesini ve SignIn formunun DOM'dan kalkmasını bekle
    await expect(page.locator('button[type="submit"]', { hasText: 'Giriş Yap' })).toBeHidden({ timeout: 2000 });

    // Admin türünü seç
    await page.locator('#role').selectOption('ADMIN');

    // Kullanıcı adı ve şifre gir
    const testUsername = `testadmin_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await page.locator('#username').fill(testUsername);
    await page.locator('#password').fill('12345678');

    // Kayıt ol butonuna tıkla
    await page.locator('button[type="submit"]', { hasText: 'Hesap Oluştur' }).click();

    // Başarı toast mesajını bekle
    await expect(page.locator('.toast--success')).toBeVisible({ timeout: 5000 });
    
    // Login sayfasına döndüğünü (Hesaba Giriş Yap) doğrula
    await expect(page.locator('.auth-page__title')).toHaveText('Hesaba Giriş Yap');
  });

  test('Birim Sorumlusu yerleşke ve birim seçerek kayıt olabilmeli', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.locator('.auth-page__link', { hasText: 'Hesap oluştur' }).click();

    // Birim Sorumlusu türünü seç
    await page.locator('#role').selectOption('RESPONSIBLE');

    // Yerleşke seçimi dropdown'ının görünür olduğunu doğrula
    await expect(page.locator('#location')).toBeVisible();

    // İlk yerleşkeyi seç (value'su boş olmayan ilk option)
    const locationSelect = page.locator('#location');
    // Dropdown yüklendiğinde option'lar gelir (API isteği)
    await expect(locationSelect.locator('option').nth(1)).toBeEnabled({ timeout: 5000 });
    const locationValue = await locationSelect.locator('option').nth(1).getAttribute('value');
    if (locationValue) {
      await locationSelect.selectOption(locationValue);
    }

    // Birim dropdown'ı aktifleşir
    const unitSelect = page.locator('#unit');
    await expect(unitSelect).toBeEnabled({ timeout: 5000 });
    await expect(unitSelect.locator('option').nth(1)).toBeEnabled({ timeout: 5000 });
    const unitValue = await unitSelect.locator('option').nth(1).getAttribute('value');
    if (unitValue) {
      await unitSelect.selectOption(unitValue);
    }

    // Kullanıcı adı ve şifre gir
    const testUsername = `testresp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await page.locator('#username').fill(testUsername);
    await page.locator('#password').fill('12345678');

    // Kayıt ol butonuna tıkla
    await page.locator('button[type="submit"]', { hasText: 'Hesap Oluştur' }).click();

    // Başarı toast mesajını bekle
    await expect(page.locator('.toast--success')).toBeVisible({ timeout: 5000 });
  });
});
