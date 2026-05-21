import { test, expect } from '../fixtures/coverage';

test.describe('VideoInfoModal Bileşeni', () => {
  test.beforeEach(async ({ page }) => {
    // Info butonu TimesheetPage (/) üzerinde yer alır
    await page.goto('/');
    // Tablonun yüklenip sayfanın stabilize olmasını bekle
    await expect(page.locator('.dynamic-table')).toBeVisible({ timeout: 15_000 });
  });

  test('Puantaj sayfasında video bilgi ikonuna tıklanınca modal açılmalı ve izlenebilmeli', async ({ page }) => {
    // Butonu aria-label ile bul — PageShell içinde InfoButton render eder.
    // Gerçek CSS sınıfı: .info-trigger-btn  (aria-label="Bilgi videosu")
    const infoButton = page.locator('[aria-label="Bilgi videosu"]');
    await expect(infoButton).toBeVisible({ timeout: 5000 });

    // Butona tıkla
    await infoButton.click();

    // Modal overlay ve container görünmeli
    const overlay = page.locator('.video-info-overlay');
    await expect(overlay).toBeVisible();

    const container = page.locator('.video-info-container');
    await expect(container).toBeVisible();

    // Başlık görünmeli
    await expect(container.locator('.modal-title')).toBeVisible();

    // Video oynatılıyor olmalı (veya en az 1 <video> elementi var)
    await expect(container.locator('video')).toBeVisible();

    // Admin için 2 video var → İleri butonunu tıkla
    const nextBtn = container.locator('button', { hasText: 'İleri' });
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();

    // Counter "2 / 2" olmalı
    await expect(container.locator('.video-info-nav__counter')).toContainText('2 / 2');

    // Kapat butonuna bas (aria-label="Kapat")
    const closeBtn = container.locator('[aria-label="Kapat"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Modalın kapandığını doğrula
    await expect(overlay).not.toBeVisible();
  });
});
