import { test, expect } from '../fixtures/coverage';
import { DashboardPage } from '../pages/DashboardPage';

test.describe('Ayarlar İşlemleri', () => {
  test.beforeEach(async ({ page }) => {
    // Korumalı admin sayfalarına gitmeden önce admin yetkisiyle anasayfaya gidelim 
    // (fixture'daki auth.setup sayesinde admin girişli)
    await page.goto('/settings');
  });

  test('Admin olarak sistem ayarları güncellenebilmeli', async ({ page }) => {
    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toHaveText('Ayarlar');

    // Formun verilerle dolmasını bekle
    const dailyWageInput = page.locator('#dailyWage');
    await expect(dailyWageInput).not.toHaveValue('', { timeout: 10_000 });

    // Günlük Ödenek alanını temizle ve yeni değer gir (Mevcut değerden farklı bir değer)
    const currentDailyWage = await dailyWageInput.inputValue();
    const newDailyWage = currentDailyWage === '1200.50' ? '1300.50' : '1200.50';
    await dailyWageInput.click();
    await dailyWageInput.fill(newDailyWage);
    await dailyWageInput.blur();

    // Haftalık Çalışma Sınırı alanını temizle ve yeni değer gir (Mevcut değerden farklı bir değer)
    const maxWeeklyDaysInput = page.locator('#maxWeeklyDays');
    const currentMaxWeeklyDays = await maxWeeklyDaysInput.inputValue();
    const newMaxWeeklyDays = currentMaxWeeklyDays === '4' ? '5' : '4';
    await maxWeeklyDaysInput.click();
    await maxWeeklyDaysInput.fill(newMaxWeeklyDays);
    await maxWeeklyDaysInput.blur();

    // "Sistem Ayarlarını Güncelle" butonuna tıkla
    const updateButton = page.locator('button', { hasText: 'Sistem Ayarlarını Güncelle' });
    await expect(updateButton).toBeEnabled({ timeout: 5000 });
    await updateButton.click();

    // Başarı toast mesajını bekle
    await expect(page.locator('.toast--success')).toBeVisible({ timeout: 5000 });
  });

  test('Admin olarak giriş bilgileri güncellenebilmeli', async ({ page }) => {
    // Sadece kullanıcı adını güncelle
    const usernameInput = page.locator('#username');
    const newUsername = `admin_${Date.now()}`;
    await usernameInput.fill(newUsername);

    // "Giriş Bilgilerini Güncelle" butonuna tıkla
    await page.locator('button', { hasText: 'Giriş Bilgilerini Güncelle' }).click();

    // Başarı toast mesajını bekle
    await expect(page.locator('.toast--success')).toBeVisible({ timeout: 5000 });

    // Giriş bilgileri username kısmında kaldığını test et
    await expect(usernameInput).toHaveValue(newUsername);

    // Tekrar 'admin' olarak geri al
    await usernameInput.fill('admin');
    await page.locator('button', { hasText: 'Giriş Bilgilerini Güncelle' }).click();
    await expect(page.locator('.toast--success').first()).toBeVisible({ timeout: 5000 });
  });
  test('Admin olarak bekleyen kullanıcılar onaylanabilmeli ve reddedilebilmeli', async ({ page }) => {
    // Mock verisini stateful yapalım ki refetch'lerde (onay/red sonrası) güncel liste dönebilsin
    let mockUsers = [
      { id: 'pending-1', username: 'pending_admin', role: 'ADMIN', status: 'PENDING', locationName: null, unitName: null, createdAt: new Date().toISOString() },
      { id: 'pending-2', username: 'pending_resp', role: 'RESPONSIBLE', status: 'PENDING', locationName: 'Merkez', unitName: 'IT', createdAt: new Date().toISOString() }
    ];

    // 1. Bekleyen kullanıcı listesi API'sini mockla
    await page.route('**/api/settings/pending-users', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          json: { success: true, data: { pendingUsers: mockUsers } }
        });
      } else {
        await route.continue();
      }
    });

    // 2. Sayfayı yenile ki mock verisi yüklensin
    await page.reload();

    // 3. Kullanıcıların tabloda/listede göründüğünü doğrula
    await expect(page.locator('text=pending_admin')).toBeVisible();
    await expect(page.locator('text=pending_resp')).toBeVisible();

    // 4. Approve (Onayla) işlemini mockla ve test et
    await page.route('**/api/settings/pending-users/pending-1/approve', async route => {
      mockUsers = mockUsers.filter(u => u.id !== 'pending-1'); // Listeden çıkar
      await route.fulfill({ json: { success: true, message: 'Onaylandı' } });
    });
    
    const approveBtn = page.locator('button[title="Onayla"]').first();
    if (await approveBtn.count() === 0) {
      await page.locator('button', { hasText: 'Onayla' }).first().click();
    } else {
      await approveBtn.click();
    }
    await expect(page.locator('.toast--success')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=pending_admin')).toBeHidden();

    // 5. Reject (Reddet) işlemini mockla ve test et
    await page.route('**/api/settings/pending-users/pending-2/reject', async route => {
      mockUsers = mockUsers.filter(u => u.id !== 'pending-2'); // Listeden çıkar
      await route.fulfill({ json: { success: true, message: 'Reddedildi' } });
    });
    
    // pending-2'nin Reddet butonunu bekle ve tıkla (if/else anti-pattern kaldırıldı)
    const rejectBtn = page.locator('button[title="Reddet"]').first();
    await expect(rejectBtn).toBeVisible({ timeout: 5000 });
    await rejectBtn.click();
    
    // Onay modalı açılır — gerçek class: .modal-container (Modal.tsx'teki container)
    const confirmModal = page.locator('.modal-container');
    await expect(confirmModal).toBeVisible({ timeout: 5000 });
    
    // Modal içindeki "Reddet" onay butonuna bas
    const modalRejectBtn = confirmModal.locator('button', { hasText: 'Reddet' });
    await expect(modalRejectBtn).toBeVisible();
    await modalRejectBtn.click();
    
    // İlk toast kaybolmuş olabilir; yeni (tek) görünür toast'u kontrol et
    await expect(page.locator('.toast--success').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=pending_resp')).toBeHidden();
  });

  test('Admin olarak sistem ayarları hatalı durumları mock ile yakalanabilmeli', async ({ page }) => {
    // Sistemi güncelleme API'sini mocklayıp hata döndürelim
    await page.route('**/api/settings/system', async route => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ 
          status: 400,
          json: { success: false, message: 'Mock validation error' } 
        });
      } else {
        await route.continue();
      }
    });

    const dailyWageInput = page.locator('#dailyWage');
    await expect(dailyWageInput).toBeVisible();
    await dailyWageInput.fill('1234');
    await page.locator('button', { hasText: 'Sistem Ayarlarını Güncelle' }).click();

    // Hata toast'ını doğrula
    await expect(page.locator('.toast--error')).toContainText('Mock validation error', { timeout: 5000 });
  });
});
