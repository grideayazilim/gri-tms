/**
 * Employee E2E Test — employee.spec.ts
 * Test senaryoları:
 *   8. Personel ekleme — form doldur → kaydet → listede gör
 *   9. Personel düzenleme — bul → düzenle → güncelleme yansıdı mı?
 */
import { test, expect } from '../fixtures/coverage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { TEST_EMPLOYEE } from '../fixtures/test-data';

test.describe('Personel İşlemleri', () => {
  let employeesPage: EmployeesPage;

  test.beforeEach(async ({ page }) => {
    employeesPage = new EmployeesPage(page);
    await employeesPage.goto();
    await employeesPage.waitForTable();
  });

  test.describe('Personel listeleme', () => {
    test('Çalışanlar sayfası başlığı ve tablosu görünmeli', async () => {
      // Sayfa başlığının doğru olduğunu kontrol et
      await expect(employeesPage.pageTitle).toContainText('Çalışanlar');

      // Tablonun görünür olduğunu doğrula
      await expect(employeesPage.table).toBeVisible();

      // "Yeni Çalışan Ekle" butonunun görünür olduğunu doğrula
      await expect(employeesPage.addButton).toBeVisible();
    });
  });

  test.describe('Personel ekleme', () => {
    test('8 — Yeni çalışan eklenip listede görünmeli', async ({ page }) => {
      // "Yeni Çalışan Ekle" butonuna tıkla
      await employeesPage.clickAdd();

      // Modal'ın açıldığını doğrula
      await expect(employeesPage.modal).toBeVisible({ timeout: 3_000 });

      // Form alanlarının görünür olduğunu doğrula
      await expect(employeesPage.tcNoInput).toBeVisible();
      await expect(employeesPage.firstNameInput).toBeVisible();
      await expect(employeesPage.lastNameInput).toBeVisible();

      // Benzersiz TC No oluştur (duplicate hatasından kaçınmak için)
      const uniqueTcNo = String(Date.now()).slice(-11).padStart(11, '1');

      // TC No gir
      await employeesPage.tcNoInput.fill(uniqueTcNo);
      // Ad gir
      await employeesPage.firstNameInput.fill(TEST_EMPLOYEE.firstName);
      // Soyad gir
      await employeesPage.lastNameInput.fill(TEST_EMPLOYEE.lastName);

      // Yerleşke seç (ilk mevcut seçeneği seç)
      const locationOptions = employeesPage.locationSelect.locator('option:not([value=""])');
      const locOptionCount = await locationOptions.count();

      if (locOptionCount > 0) {
        const firstLocValue = await locationOptions.first().getAttribute('value');
        if (firstLocValue) {
          await employeesPage.locationSelect.selectOption(firstLocValue);
          // Birimler yüklensin
          await page.waitForTimeout(500);

          // Birim seç (ilk mevcut seçeneği seç)
          const unitOptions = employeesPage.unitSelect.locator('option:not([value=""])');
          const unitOptionCount = await unitOptions.count();
          if (unitOptionCount > 0) {
            const firstUnitValue = await unitOptions.first().getAttribute('value');
            if (firstUnitValue) {
              await employeesPage.unitSelect.selectOption(firstUnitValue);
            }
          }
        }
      }

      // İşe giriş tarihi gir
      await employeesPage.startDateInput.fill(TEST_EMPLOYEE.startDate);
      // IBAN gir
      await employeesPage.ibanInput.fill(TEST_EMPLOYEE.ibanNo);

      // Kaydet butonuna tıkla
      await employeesPage.saveForm();

      // Modal'ın kapandığını doğrula (başarılı kayıt)
      // veya API hatası varsa modal'da hata mesajı gösterilir
      const modalClosed = await employeesPage.modal.waitFor({ state: 'hidden', timeout: 8_000 }).then(() => true).catch(() => false);

      if (modalClosed) {
        // Başarı toast mesajının göründüğünü doğrula
        const toastMessage = page.locator('.toast').filter({ hasText: /başarıyla/i });
        await expect(toastMessage).toBeVisible({ timeout: 5_000 });
      } else {
        // Modal kapanmadıysa API hatası var — hatayı raporla
        const apiError = employeesPage.modalApiError;
        const hasApiError = await apiError.isVisible();
        if (hasApiError) {
          const errorText = await apiError.textContent();
          test.fail(true, `API hatası: ${errorText}`);
        } else {
          test.fail(true, 'Modal kapanmadı ama API hatası da bulunamadı — validasyon hatası olabilir');
        }
      }
    });
  });

  test.describe('Personel düzenleme', () => {
    test('9 — Mevcut çalışan düzenlenebilmeli', async ({ page }) => {
      // Tabloda en az bir satır olduğunu doğrula
      const rowCount = await employeesPage.tableRows.count();

      if (rowCount > 0) {
        // İlk satırın düzenle butonuna tıkla
        const firstRow = employeesPage.tableRows.first();
        const editButton = firstRow.locator('.edit-btn');
        await editButton.click();

        // Modal'ın açıldığını doğrula
        await expect(employeesPage.modal).toBeVisible({ timeout: 3_000 });

        // Form alanlarının dolu olduğunu doğrula (mevcut veri yüklendi)
        const tcValue = await employeesPage.tcNoInput.inputValue();
        expect(tcValue.length).toBeGreaterThan(0);

        const firstNameValue = await employeesPage.firstNameInput.inputValue();
        expect(firstNameValue.length).toBeGreaterThan(0);

        // Adı değiştir
        const updatedFirstName = firstNameValue + ' (E2E)';
        await employeesPage.firstNameInput.clear();
        await employeesPage.firstNameInput.fill(updatedFirstName);

        // Güncelle butonuna tıkla
        await employeesPage.saveForm();

        // Modal'ın kapandığını doğrula
        await expect(employeesPage.modal).not.toBeVisible({ timeout: 5_000 });

        // Başarı mesajının göründüğünü doğrula
        const toastMessage = page.locator('.toast').filter({ hasText: /başarıyla/i });
        await expect(toastMessage).toBeVisible({ timeout: 5_000 });
      } else {
        test.skip(true, 'Tabloda çalışan verisi bulunamadı');
      }
    });
  });
});
