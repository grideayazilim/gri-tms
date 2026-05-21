import { test, expect } from '../fixtures/coverage';
import { EmployeesPage } from '../pages/EmployeesPage';
import path from 'path';

test.describe('Çalışan İçe Aktarma (Import)', () => {
  let employeesPage: EmployeesPage;

  test.beforeEach(async ({ page }) => {
    employeesPage = new EmployeesPage(page);
    await employeesPage.goto();
  });

  test('Excel dosyası ile toplu çalışan içe aktarılabilmeli', async ({ page }) => {
    // Yeni Çalışan Ekle butonuna tıkla
    await page.locator('button', { hasText: '+ Yeni Çalışan Ekle' }).click();

    // Modal açıldığında "Toplu Giriş" sekmesine tıkla
    await page.locator('button', { hasText: 'Toplu Giriş' }).click();

    // Modalın "Toplu Giriş" sekmesinin açıldığını doğrula
    await expect(page.locator('h3', { hasText: 'Excel Dosyası Yükle' })).toBeVisible();

    // Dosya seçimi yap
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, '..', 'test_import.xlsx');
    await fileInput.setInputFiles(filePath);

    // İşlemi Başlat butonuna tıkla
    await page.locator('button', { hasText: 'İşlemi Başlat' }).click();

    // Başarı mesajını bekle (overlay içindeki ReportModal)
    await expect(page.locator('h2', { hasText: 'İçe Aktarma Tamamlandı' })).toBeVisible({ timeout: 10000 });

    // Modalı kapatmak için Vazgeç'e tıkla
    await page.locator('button', { hasText: 'Vazgeç' }).click();
    await expect(page.locator('.modal-overlay')).not.toBeVisible();
  });
});
