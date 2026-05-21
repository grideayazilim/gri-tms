import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E Test Konfigürasyonu
 * Timesheet Management System için tarayıcı testleri ayarları
 */

// auth.setup.ts ile aynı yola çözümlenir
const adminAuthFile = path.join(__dirname, 'fixtures', '.auth', 'admin.json');

export default defineConfig({
  testDir: './tests',

  /* Her test için maksimum süre */
  timeout: 30_000,

  /* Her expect assertion için maksimum süre */
  expect: { timeout: 5_000 },

  /* CI ortamında testleri sıralı, lokalde paralel çalıştır */
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,

  /* CI'da her zaman retry yap */
  retries: process.env.CI ? 2 : 0,

  /* Reporter: hem konsol hem HTML */
  reporter: [
    ['html', { outputFolder: '../playwright-report', open: 'never' }],
    ['list'],
  ],

  /* Tüm testlerde geçerli olan ayarlar */
  use: {
    /* Uygulamanın çalıştığı adres */
    baseURL: 'http://localhost:5173',

    /* Hata durumunda ekran görüntüsü al */
    screenshot: 'only-on-failure',

    /* Hata durumunda video kaydet */
    video: 'retain-on-failure',

    /* Trace: hatayı incelemek için detaylı kayıt */
    trace: 'on-first-retry',

    /* Aksiyonlar için timeout */
    actionTimeout: 10_000,
  },

  /* Tarayıcı projeleri — Chromium, Firefox, WebKit */
  projects: [
    /* Auth setup — tüm testlerden önce çalışır, admin oturumu oluşturur */
    {
      name: 'setup',
      testMatch: /.*auth\.setup\.ts/,
    },

    /* Ana testler: Chromium */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: adminAuthFile,
      },
      dependencies: ['setup'],
    },

    /* Ana testler: Firefox */
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: adminAuthFile,
      },
      dependencies: ['setup'],
    },

    /* Ana testler: WebKit */
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: adminAuthFile,
      },
      dependencies: ['setup'],
    },
  ],
});
