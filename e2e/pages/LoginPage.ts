/**
 * LoginPage — Page Object Model
 * Giriş sayfası elementlerini ve aksiyonlarını tanımlar.
 *
 * Kaynak: apps/management/client/src/pages/AuthPage/SignIn.tsx
 */
import type { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;

  // ── Elementler ──────────────────────────────────────────────────────────────
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBox: Locator;
  readonly title: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('#username');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorBox = page.locator('.input-error-box');
    this.title = page.locator('.auth-page__title');
    this.registerLink = page.locator('.auth-page__link');
  }

  // ── Aksiyonlar ──────────────────────────────────────────────────────────────

  /** Login sayfasına git */
  async goto() {
    await this.page.goto('/auth');
  }

  /** Kullanıcı adı ve şifre ile giriş yap */
  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /** Hata mesajını al */
  async getErrorMessage(): Promise<string> {
    return (await this.errorBox.textContent()) ?? '';
  }

  /** Sayfanın login sayfası olduğunu doğrula */
  async isOnLoginPage(): Promise<boolean> {
    return this.title.isVisible();
  }
}
