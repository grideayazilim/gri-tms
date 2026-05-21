/**
 * Auth E2E Test — auth.spec.ts
 * Test senaryoları:
 *   1. Login başarılı — form doldur → giriş → dashboard'ı gör
 *   2. Login başarısız — yanlış şifre → hata mesajı görünsün
 *   3. Oturum koruması — login olmadan dashboard'a git → login'e redirect
 *   4. Logout — giriş yap → logout → login sayfasına dön
 */
import { test, expect } from '../fixtures/coverage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ADMIN_USER, URLS } from '../fixtures/test-data';

// Bu test dosyası kendi auth state'ini yönettiği için global storage'ı kullanmıyoruz
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Kimlik Doğrulama Akışları', () => {
  test.describe('Başarılı senaryolar', () => {
    test('1 — Admin ile başarılı giriş yapılabilmeli', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // Login sayfasına git
      await loginPage.goto();

      // Sayfanın login sayfası olduğunu doğrula
      await expect(loginPage.title).toBeVisible();
      await expect(loginPage.title).toHaveText('Hesaba Giriş Yap');

      // Admin bilgileriyle giriş yap
      await loginPage.login(ADMIN_USER.username, ADMIN_USER.password);

      // Dashboard'a yönlendirildiğini doğrula (navbar görünür olmalı)
      await dashboardPage.waitForLoad();
      await expect(dashboardPage.navbar).toBeVisible();

      // URL'in ana sayfada olduğunu doğrula
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Hata senaryoları', () => {
    test('2 — Yanlış şifre ile giriş hata mesajı göstermeli', async ({ page }) => {
      const loginPage = new LoginPage(page);

      // Login sayfasına git
      await loginPage.goto();

      // Yanlış şifre ile giriş dene
      await loginPage.login(ADMIN_USER.username, 'yanlis_sifre_999');

      // Hata mesajının göründüğünü doğrula
      await expect(loginPage.errorBox).toBeVisible({ timeout: 5_000 });

      // Hala login sayfasında olduğumuzu doğrula
      await expect(loginPage.title).toBeVisible();
    });
  });

  test.describe('Oturum koruması', () => {
    test('3 — Login olmadan korumalı sayfaya erişim redirect etmeli', async ({ page }) => {
      // Doğrudan ana sayfaya git (login olmadan)
      await page.goto('/');

      // Login sayfasına yönlendirildiğini doğrula
      await expect(page).toHaveURL(/\/auth/);

      // Login formunun görünür olduğunu doğrula
      const loginPage = new LoginPage(page);
      await expect(loginPage.title).toBeVisible();
    });

    test('3b — Login olmadan admin sayfasına erişim redirect etmeli', async ({ page }) => {
      // Doğrudan employees sayfasına git
      await page.goto(URLS.employees);

      // Login sayfasına yönlendirildiğini doğrula
      await expect(page).toHaveURL(/\/auth/);
    });
  });

  test.describe('Çıkış akışı', () => {
    test('4 — Logout yapılınca login sayfasına dönmeli', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // Önce giriş yap
      await loginPage.goto();
      await loginPage.login(ADMIN_USER.username, ADMIN_USER.password);
      await dashboardPage.waitForLoad();

      // Navbar'ın göründüğünü doğrula
      await expect(dashboardPage.navbar).toBeVisible();

      // Çıkış yap
      await dashboardPage.logout();

      // Login sayfasına dönüldüğünü doğrula
      await expect(page).toHaveURL(/\/auth/, { timeout: 5_000 });
      await expect(loginPage.title).toBeVisible();
    });
  });
});
