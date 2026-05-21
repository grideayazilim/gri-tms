/**
 * Announcement E2E Test — announcement.spec.ts
 * Test senaryosu:
 *   12. Duyuru akışı — admin olarak duyuru butonuna tıkla → duyuru modal görünür
 */
import { test, expect } from '../fixtures/coverage';
import { TimesheetPage } from '../pages/TimesheetPage';

test.describe('Duyuru Akışı', () => {
  test('12 — Duyuru modalı açılıp içerik gösterilmeli', async ({ page }) => {
    const timesheetPage = new TimesheetPage(page);

    // Puantaj sayfasına git (duyuru butonu burada)
    await timesheetPage.goto();
    await timesheetPage.waitForTable();

    // Duyuru butonunun görünür olduğunu doğrula
    await expect(timesheetPage.announcementButton).toBeVisible();

    // Duyuru butonuna tıkla
    await timesheetPage.announcementButton.click();

    // Duyuru modal'ının açıldığını doğrula
    const modal = page.locator('.modal-container');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Modal başlığının "Duyurular" olduğunu doğrula
    const modalTitle = modal.locator('.modal-title').first();
    await expect(modalTitle).toContainText('Duyurular');

    // Modal'ı kapat (overlay'a tıklayarak veya X butonuyla)
    const closeButton = modal.locator('.modal-close').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Overlay'a tıklayarak kapat
      const overlay = page.locator('.modal__overlay, .modal-overlay');
      if (await overlay.isVisible()) {
        await overlay.click({ position: { x: 10, y: 10 } });
      } else {
        // ESC tuşu ile kapat
        await page.keyboard.press('Escape');
      }
    }

    // Modal'ın kapandığını doğrula
    await expect(modal).not.toBeVisible({ timeout: 3_000 });
  });
});
