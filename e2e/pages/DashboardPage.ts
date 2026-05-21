/**
 * DashboardPage — Page Object Model
 * Dashboard (ana sayfa) ve navigasyon elementlerini tanımlar.
 *
 * Kaynak: apps/management/client/src/components/Navbar/Navbar.tsx
 */
import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;

  // ── Elementler ──────────────────────────────────────────────────────────────
  readonly navbar: Locator;
  readonly navLinks: Locator;
  readonly logoutButton: Locator;
  readonly userInfo: Locator;
  readonly appTitle: Locator;
  readonly settingsLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navbar = page.locator('.nav');
    this.navLinks = page.locator('.nav__link');
    this.logoutButton = page.locator('.nav__link--logout');
    this.userInfo = page.locator('.user-info');
    this.appTitle = page.locator('.nav__title');
    this.settingsLink = page.locator('.nav__link[href="/settings"]');
  }

  // ── Aksiyonlar ──────────────────────────────────────────────────────────────

  /** Dashboard'ın (navbar) görünür olduğunu kontrol et */
  async isVisible(): Promise<boolean> {
    return this.navbar.isVisible();
  }

  /** Belirtilen yola navigasyon menüsünden git */
  async navigateTo(path: string) {
    await this.page.locator(`.nav__link[href="${path}"]`).click();
  }

  /** Çıkış yap */
  async logout() {
    await this.logoutButton.click();
  }

  /** Giriş yapan kullanıcının adını al */
  async getUserName(): Promise<string> {
    const text = (await this.userInfo.textContent()) ?? '';
    // "Kullanıcı: admin" → "admin"
    return text.replace('Kullanıcı:', '').trim();
  }

  /** Sayfa yüklenene kadar bekle */
  async waitForLoad() {
    await this.navbar.waitFor({ state: 'visible', timeout: 10_000 });
  }
}
