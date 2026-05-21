/**
 * Export E2E Test — export.spec.ts
 * Test senaryoları:
 *   7. Excel export — puantaj verisi var → export butonu → dosya indirildi mi?
 */
import { test, expect } from '../fixtures/coverage';

test.describe('Excel Export İşlemi', () => {
  test('7 — Yerleşke sayfasından Excel export başarılı olmalı', async ({ page }) => {
    // Yerleşke sayfasına git (export işlevi burada)
    await page.goto('/locations');

    // Sayfanın yüklendiğini doğrula
    await expect(page.locator('.page-title')).toContainText('Yerleşke ve Birimler');

    // Demo seed her zaman yerleşke oluşturur; yoksa test altyapı sorunudur
    const locationNodes = page.locator('.location-node');
    await expect(locationNodes.first()).toBeVisible({ timeout: 5_000 });

    // İlk yerleşkenin Excel export butonuna tıkla
    const firstLocation = locationNodes.first();
    const excelButton = firstLocation.locator('.btn--export-excel');
    await expect(excelButton).toBeVisible();
    await excelButton.click();

    // Export panelinin açıldığını doğrula
    const exportPanel = page.locator('.export-panel');
    await expect(exportPanel).toBeVisible({ timeout: 3_000 });

    // Dönem seçicisinin görünür olduğunu doğrula
    const periodSelect = exportPanel.locator('.export-select');
    await expect(periodSelect).toBeVisible();

    // İndir butonunun aktif olduğunu doğrula
    const downloadButton = exportPanel.locator('.export-panel__download-btn');
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toBeEnabled();

    // İndirme işlemini başlat ve dosyanın indiğini doğrula
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 });
    await downloadButton.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.xlsm?$/);
  });
});
