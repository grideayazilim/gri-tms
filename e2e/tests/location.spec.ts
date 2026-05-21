/**
 * Location E2E Test — location.spec.ts
 * Test senaryosu:
 *   13. Yerleşke/birim — yerleşke ekle → birim ekle → listede gör
 */
import { test, expect } from '../fixtures/coverage';
import { TEST_LOCATION, TEST_UNIT } from '../fixtures/test-data';

test.describe('Yerleşke ve Birim İşlemleri', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/locations');
    // Sayfanın yüklenmesini bekle
    await expect(page.locator('.page-title')).toContainText('Yerleşke ve Birimler');
  });

  test('13 — Yeni yerleşke eklenebilmeli', async ({ page }) => {
    // "Yeni Yerleşke Ekle" butonunu bul ve tıkla
    const addLocationButton = page.locator('.add-location-btn');
    await expect(addLocationButton).toBeVisible();
    await addLocationButton.click();

    // Yeni eklenen yerleşke düğümünün görünür olduğunu doğrula
    const locationNodes = page.locator('.location-node');
    const lastLocationNode = locationNodes.last();
    await expect(lastLocationNode).toBeVisible();

    // Yerleşke adı input'unu bul ve doldur
    const locationNameInput = lastLocationNode.locator('input[type="text"]').first();
    await locationNameInput.fill(TEST_LOCATION.name);

    // Program numarası input'unu bul ve doldur
    const programNoInput = lastLocationNode.locator('.location-no-input');
    if (await programNoInput.isVisible()) {
      await programNoInput.fill(TEST_LOCATION.programNo);
    }

    // "Kaydet" butonunun görünür olduğunu doğrula (değişiklik yapıldı)
    const saveButton = page.getByRole('button', { name: /Değişiklikleri Kaydet/i });
    await expect(saveButton).toBeVisible({ timeout: 3_000 });
  });

  test('13b — Yerleşkeye birim eklenebilmeli', async ({ page }) => {
    // Mevcut yerleşke düğümleri
    const locationNodes = page.locator('.location-node');
    const locationCount = await locationNodes.count();

    if (locationCount > 0) {
      const firstLocation = locationNodes.first();

      // Yerleşkeyi genişlet (toggle butonu)
      const toggleButton = firstLocation.locator('.toggle-btn');
      const isExpanded = await toggleButton.evaluate(el => el.classList.contains('is-expanded'));
      if (!isExpanded) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }

      // "Yeni Birim Ekle" butonunu bul ve tıkla
      const addUnitButton = firstLocation.locator('.add-unit-btn');
      await expect(addUnitButton).toBeVisible();
      await addUnitButton.click();

      // Yeni eklenen birim input'unu bul ve doldur
      const unitNodes = firstLocation.locator('.unit-node');
      const lastUnit = unitNodes.last();
      const unitNameInput = lastUnit.locator('input[type="text"]');
      await unitNameInput.fill(TEST_UNIT.name);

      // "Kaydet" butonunun görünür olduğunu doğrula
      const saveButton = page.getByRole('button', { name: /Değişiklikleri Kaydet/i });
      await expect(saveButton).toBeVisible({ timeout: 3_000 });
    } else {
      test.skip(true, 'Yerleşke verisi bulunamadı');
    }
  });
});
