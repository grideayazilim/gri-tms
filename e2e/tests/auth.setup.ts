/**
 * Auth Setup — Global Setup
 * Admin kullanıcı ile giriş yaparak storage state dosyasını oluşturur.
 * Diğer testler bu storage state'i kullanarak tekrar login olmadan çalışır.
 */
import { test as setup, expect } from '../fixtures/coverage';
import { ADMIN_USER, URLS } from '../fixtures/test-data';
import path from 'path';

const adminAuthFile = path.join(__dirname, '..', 'fixtures', '.auth', 'admin.json');

setup('Admin oturumu oluştur', async ({ page }) => {
  // Login sayfasına git
  await page.goto(URLS.auth);

  // Kullanıcı adı ve şifre gir
  await page.locator('#username').fill(ADMIN_USER.username);
  await page.locator('#password').fill(ADMIN_USER.password);

  // Giriş butonuna tıkla
  await page.locator('button[type="submit"]').click();

  // Login sonrası ana sayfaya redirect'in tamamlanmasını bekle
  await page.waitForURL('/', { timeout: 15_000 });

  // Dashboard'ın yüklendiğini doğrula (nav bar görünür olmalı)
  await expect(page.locator('.nav')).toBeVisible({ timeout: 10_000 });

  // Oturum bilgilerini dosyaya kaydet
  await page.context().storageState({ path: adminAuthFile });
});

