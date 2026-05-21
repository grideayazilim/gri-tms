import { test, expect } from '../fixtures/coverage';

test.describe('Denetim Logları (Audit Logs)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/audit-logs');
  });

  test('Admin olarak denetim logları sayfası görüntülenmeli ve tablo yüklenmeli', async ({ page }) => {
    // Sayfa başlığının doğru olduğunu kontrol et
    const pageTitle = page.locator('.page-title');
    await expect(pageTitle).toHaveText('İşlem Kayıtları');

    // Filtre çubuğunun görünür olduğunu doğrula
    await expect(page.locator('.filter-bar')).toBeVisible();

    // Tablonun yüklendiğini doğrula
    const table = page.locator('.dynamic-table');
    await expect(table).toBeVisible();
    
    // Tabloda en az 1 satır olduğunu doğrula (Seeder log atmış olmalı)
    const tbody = table.locator('tbody');
    await expect(tbody.locator('tr').first()).toBeVisible({ timeout: 5000 });
  });

  test('Denetim logu detayları PopUp modalında açılabilmeli', async ({ page }) => {
    // 1. API'yi mockla ki içinde "detayları olan" bir log mutlaka bulunsun.
    // Yoksa veritabanında denk gelmediği zaman test silent (sessizce) olarak pas geçer.
    await page.route('**/api/audit-logs*', async route => {
      await route.fulfill({
        json: {
          success: true,
          data: {
            // Hook response.data.auditLogs bekliyor — "logs" değil!
            auditLogs: [
              {
                id: 'log-1',
                // 'UPDATE_SETTINGS' geçersiz — doğrusu 'SETTINGS_UPDATE'
                action: 'SETTINGS_UPDATE',
                // entityType değeri AUDIT_ENTITY_TYPE'dan gelmeli ('settings')
                entityType: 'settings',
                entityId: null,
                actorUsername: 'test_admin',
                actorRole: 'ADMIN',
                summary: 'Sistem ayarları güncellendi',
                changes: ['Ayar 1 değişti', 'Ayar 2 değişti'],
                metadata: { key: 'value' },
                createdAt: new Date().toISOString()
              }
            ],
            pagination: { currentPage: 1, totalPages: 1, totalRecords: 1, limit: 10 }
          }
        }
      });
    });

    // Mock kurulduktan sonra sayfaya git — reload yerine goto daha güvenilir
    await page.goto('/audit-logs');

    const table = page.locator('.dynamic-table');
    // DynamicTable loading=true iken div gösterir; yeterli timeout ver
    await expect(table).toBeVisible({ timeout: 10_000 });

    const firstRow = table.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Tablodaki ilk .data-popup-trigger'ı bul (Şartsız, yoksa patlasın)
    const detailsBtn = table.locator('.data-popup-trigger').first();
    await expect(detailsBtn).toBeVisible({ timeout: 5000 });
    await detailsBtn.click();

    // Modalın açıldığını doğrula — gerçek class: .modal-overlay (Modal.tsx)
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible();

    // Değişiklikler veya Ek Bilgiler başlığının göründüğünü doğrula
    await expect(modal.locator('.log-details-modal')).toBeVisible();

    // Modalı kapat
    await modal.locator('button', { hasText: 'Kapat' }).click();
    await expect(modal).not.toBeVisible();
  });
});
