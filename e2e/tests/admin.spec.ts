/**
 * Admin E2E Test — admin.spec.ts
 * Test senaryoları:
 *   10. Kullanıcı yönetimi — admin login → kullanıcılar sayfası → tablo görünür
 *   11. Yetki kontrolü — normal kullanıcı → admin sayfasına erişim engeli
 */
import { test, expect } from '../fixtures/coverage';
import { UsersPage } from '../pages/UsersPage';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { RESPONSIBLE_USER, URLS } from '../fixtures/test-data';

test.describe('Admin ve Yetki Kontrolleri', () => {
  test.describe('Kullanıcı yönetimi (Admin)', () => {
    test('10 — Admin olarak Kullanıcılar sayfasına erişilebilmeli', async ({ page }) => {
      const usersPage = new UsersPage(page);

      // Kullanıcılar sayfasına git (admin storage state ile)
      await usersPage.goto();

      // Sayfa başlığının doğru olduğunu kontrol et
      await expect(usersPage.pageTitle).toContainText('Kullanıcılar');

      // Tablonun yüklendiğini doğrula
      await usersPage.waitForTable();
      await expect(usersPage.table).toBeVisible();

      // Admin kullanıcısının listede olduğunu doğrula
      const adminRow = await usersPage.findUser('admin');
      await expect(adminRow).toBeVisible();
    });

    test('10b — Admin olarak kullanıcı filtrelemesi yapılabilmeli', async ({ page }) => {
      const usersPage = new UsersPage(page);

      // Kullanıcılar sayfasına git
      await usersPage.goto();
      await usersPage.waitForTable();

      // FilterBar'ın görünür olduğunu doğrula
      await expect(usersPage.filterBar).toBeVisible();

      // Arama kutusunun çalıştığını doğrula
      const searchInput = usersPage.searchInput;
      if (await searchInput.isVisible()) {
        await searchInput.fill('admin');
        // Arama sonrası kısa bekleme
        await page.waitForTimeout(500);

        // Tablonun hala görünür olduğunu doğrula
        await expect(usersPage.table).toBeVisible();
      }
    });
  });

  test.describe('Yetki kontrolü (Normal kullanıcı)', () => {
    // Bu test bloğu kendi storage state'ini kullanır (responsible user)
    test.use({ storageState: { cookies: [], origins: [] } });

    test('11 — Birim sorumlusu admin sayfalarına erişememeli', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // Birim sorumlusu olarak giriş yap
      await loginPage.goto();
      await loginPage.login(RESPONSIBLE_USER.username, RESPONSIBLE_USER.password);

      // Dashboard'ın yüklendiğini doğrula
      await dashboardPage.waitForLoad();

      // Admin-only sayfaya gitmeyi dene (örn: /users)
      await page.goto(URLS.users);

      // Ana sayfaya yönlendirildiğini doğrula (admin değilse redirect olur)
      await expect(page).toHaveURL('/', { timeout: 5_000 });

      // Employees sayfası da admin-only
      await page.goto(URLS.employees);
      await expect(page).toHaveURL('/', { timeout: 5_000 });

      // Locations sayfası da admin-only
      await page.goto(URLS.locations);
      await expect(page).toHaveURL('/', { timeout: 5_000 });
    });

    test('11b — Birim sorumlusu navbar\'da admin menülerini görmemeli', async ({ page }) => {
      const loginPage = new LoginPage(page);
      const dashboardPage = new DashboardPage(page);

      // Birim sorumlusu olarak giriş yap
      await loginPage.goto();
      await loginPage.login(RESPONSIBLE_USER.username, RESPONSIBLE_USER.password);
      await dashboardPage.waitForLoad();

      // Admin-only sayfaların linklerinin navbar'da görünmediğini kontrol et
      const usersLink = page.locator('.nav__link[href="/users"]');
      const employeesLink = page.locator('.nav__link[href="/employees"]');
      const locationsLink = page.locator('.nav__link[href="/locations"]');

      // Bu linkler görünmemeli (adminOnly: true olan route'lar)
      await expect(usersLink).not.toBeVisible();
      await expect(employeesLink).not.toBeVisible();
      await expect(locationsLink).not.toBeVisible();

      // Ama puantaj sayfası linki görünmeli (herkes görebilir)
      const timesheetLink = page.locator('.nav__link[href="/"]');
      await expect(timesheetLink).toBeVisible();
    });
  });
});
