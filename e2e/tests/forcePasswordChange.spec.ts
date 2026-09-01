/**
 * Zorunlu İlk Şifre Değişimi E2E
 * must_change_password açıkken kullanıcı giriş yapabiliyor ama kapatılamayan
 * bir modal karşılıyor ve şifre değişene kadar hiçbir sayfa kullanılamıyor.
 */
import { test, expect } from '../fixtures/coverage';
import { LoginPage } from '../pages/LoginPage';
import { FIRST_LOGIN_USER } from '../fixtures/test-data';

test.use({ storageState: { cookies: [], origins: [] } });

// Testler aynı kullanıcının durumunu sırayla değiştiriyor
test.describe.configure({ mode: 'serial' });

const modal = '[role="dialog"]';

test.describe('Zorunlu ilk şifre değişimi', () => {
  test('1 — Giriş sonrası kapatılamayan şifre değiştirme modalı çıkar', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(FIRST_LOGIN_USER.username, FIRST_LOGIN_USER.password);

    const dialog = page.locator(modal);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Şifrenizi belirleyin')).toBeVisible();

    // İki alan olmalı: yeni şifre + tekrar
    await expect(page.getByLabel('Yeni şifre', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Yeni şifre (tekrar)')).toBeVisible();

    // ESC ile kapanmamalı
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();

    // Modal dışına tıklamak da kapatmamalı
    await page.mouse.click(5, 5);
    await expect(dialog).toBeVisible();
  });

  test('2 — Kısa veya eşleşmeyen şifre kabul edilmez', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(FIRST_LOGIN_USER.username, FIRST_LOGIN_USER.password);

    const submit = page.getByRole('button', { name: 'Şifreyi Değiştir' });
    await expect(submit).toBeDisabled();

    // Kısa şifre
    await page.getByLabel('Yeni şifre', { exact: true }).fill('kisa123');
    await page.getByLabel('Yeni şifre (tekrar)').fill('kisa123');
    await expect(page.getByText('Şifre en az 10 karakter olmalıdır')).toBeVisible();
    await expect(submit).toBeDisabled();

    // Eşleşmeyen şifre
    await page.getByLabel('Yeni şifre', { exact: true }).fill(FIRST_LOGIN_USER.newPassword);
    await page.getByLabel('Yeni şifre (tekrar)').fill('Baska-Sifre-2026');
    await expect(page.getByText('Şifreler eşleşmiyor')).toBeVisible();
    await expect(submit).toBeDisabled();
  });

  test('3 — Geçerli şifre ile modal kapanır ve uygulama açılır', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(FIRST_LOGIN_USER.username, FIRST_LOGIN_USER.password);

    await page.getByLabel('Yeni şifre', { exact: true }).fill(FIRST_LOGIN_USER.newPassword);
    await page.getByLabel('Yeni şifre (tekrar)').fill(FIRST_LOGIN_USER.newPassword);
    await page.getByRole('button', { name: 'Şifreyi Değiştir' }).click();

    await expect(page.locator(modal)).toBeHidden({ timeout: 10_000 });
    await expect(page.locator('nav, .navbar').first()).toBeVisible();
  });

  test('4 — Değişimden sonra eski şifre çalışmaz', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login(FIRST_LOGIN_USER.username, FIRST_LOGIN_USER.password);

    // Eski şifre reddedilmeli: modal açılmamalı, hata görünmeli
    await expect(page.locator(modal)).toBeHidden();
    await expect(loginPage.errorBox).toBeVisible();
  });
});
