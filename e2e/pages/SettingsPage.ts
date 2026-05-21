/**
 * SettingsPage — Page Object Model
 * Ayarlar sayfası elementlerini ve aksiyonlarını tanımlar.
 *
 * Kaynak: apps/management/client/src/pages/SettingsPage/SettingsPage.tsx
 */
import type { Page, Locator } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;

  // ── Giriş Bilgileri Formu ───────────────────────────────────────────────────
  readonly loginCard: Locator;
  readonly usernameInput: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly loginSubmitButton: Locator;

  // ── Sistem Ayarları Formu (Admin) ───────────────────────────────────────────
  readonly systemCard: Locator;
  readonly dailyWageInput: Locator;
  readonly maxWeeklyDaysInput: Locator;
  readonly programStartDateInput: Locator;
  readonly programEndDateInput: Locator;
  readonly systemSubmitButton: Locator;

  // ── Sistem Sıfırlama (Admin) ────────────────────────────────────────────────
  readonly dangerCard: Locator;
  readonly resetButton: Locator;

  // ── Onay Bekleyen Kullanıcılar (Admin) ──────────────────────────────────────
  readonly pendingUserList: Locator;

  constructor(page: Page) {
    this.page = page;

    // Giriş Bilgileri
    this.loginCard = page.locator('.settings-card').first();
    this.usernameInput = page.locator('#username');
    this.currentPasswordInput = page.locator('#currentPassword');
    this.newPasswordInput = page.locator('#password');
    this.loginSubmitButton = page.getByRole('button', { name: /Giriş Bilgilerini Güncelle/i });

    // Sistem Ayarları
    this.systemCard = page.locator('form.settings-card').last();
    this.dailyWageInput = page.locator('#dailyWage');
    this.maxWeeklyDaysInput = page.locator('#maxWeeklyDays');
    this.programStartDateInput = page.locator('#programStartDate');
    this.programEndDateInput = page.locator('#programEndDate');
    this.systemSubmitButton = page.getByRole('button', { name: /Sistem Ayarlarını Güncelle/i });

    // Danger Zone
    this.dangerCard = page.locator('.settings-card--danger');
    this.resetButton = page.getByRole('button', { name: /Sistemi Sıfırla/i });

    // Pending Users
    this.pendingUserList = page.locator('.pending-user-list');
  }

  // ── Aksiyonlar ──────────────────────────────────────────────────────────────

  /** Ayarlar sayfasına git */
  async goto() {
    await this.page.goto('/settings');
  }

  /** Giriş bilgilerini güncelle */
  async updateLogin(data: {
    username?: string;
    currentPassword?: string;
    newPassword?: string;
  }) {
    if (data.username) {
      await this.usernameInput.clear();
      await this.usernameInput.fill(data.username);
    }
    if (data.currentPassword) {
      await this.currentPasswordInput.fill(data.currentPassword);
    }
    if (data.newPassword) {
      await this.newPasswordInput.fill(data.newPassword);
    }
    await this.loginSubmitButton.click();
  }

  /** Sistem ayarlarını güncelle */
  async updateSystem(data: {
    dailyWage?: string;
    maxWeeklyDays?: string;
    programStartDate?: string;
    programEndDate?: string;
  }) {
    if (data.dailyWage) {
      await this.dailyWageInput.clear();
      await this.dailyWageInput.fill(data.dailyWage);
    }
    if (data.maxWeeklyDays) {
      await this.maxWeeklyDaysInput.clear();
      await this.maxWeeklyDaysInput.fill(data.maxWeeklyDays);
    }
    if (data.programStartDate) {
      await this.programStartDateInput.fill(data.programStartDate);
    }
    if (data.programEndDate) {
      await this.programEndDateInput.fill(data.programEndDate);
    }
    await this.systemSubmitButton.click();
  }
}
