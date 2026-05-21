/**
 * Not Found E2E Test — notfound.spec.ts
 * Test senaryosu:
 *   15. Hata sayfası — var olmayan URL → 404 sayfası → ana sayfaya dön linki
 */
import { test, expect } from '../fixtures/coverage';

test.describe('404 Hata Sayfası', () => {
  test('15 — Var olmayan URL 404 sayfasını göstermeli', async ({ page }) => {
    // Var olmayan bir URL'ye git
    await page.goto('/bu-sayfa-yok-12345');

    // 404 metninin görünür olduğunu doğrula
    const notFoundText = page.locator('.notfound__404');
    await expect(notFoundText).toBeVisible({ timeout: 5_000 });
    await expect(notFoundText).toContainText('404');

    // Açıklama mesajının görünür olduğunu doğrula
    const message = page.locator('.notfound__message');
    await expect(message).toBeVisible();
    await expect(message).toContainText('Görünüşe göre kaybolmuşsunuz');
  });

  test('15b — Ana Sayfaya Dön linki çalışmalı', async ({ page }) => {
    // 404 sayfasına git
    await page.goto('/bu-sayfa-yok-12345');

    // 404 sayfasının yüklendiğini doğrula
    await expect(page.locator('.notfound__404')).toBeVisible({ timeout: 5_000 });

    // "Ana Sayfaya Dön" linkini bul
    const homeLink = page.locator('.notfound__btn');
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toContainText('Ana Sayfaya Dön');

    // Linke tıkla
    await homeLink.click();

    // Ana sayfaya yönlendirildiğini doğrula
    await expect(page).toHaveURL('/', { timeout: 5_000 });
  });
});
