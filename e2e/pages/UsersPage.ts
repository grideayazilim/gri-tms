/**
 * UsersPage — Page Object Model
 * Kullanıcılar sayfası elementlerini ve aksiyonlarını tanımlar.
 *
 * Kaynak: apps/management/client/src/pages/UsersPage/UsersPage.tsx
 */
import type { Page, Locator } from '@playwright/test';

export class UsersPage {
  readonly page: Page;

  // ── Elementler ──────────────────────────────────────────────────────────────
  readonly pageTitle: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly filterBar: Locator;
  readonly searchInput: Locator;
  readonly roleSelect: Locator;

  // ── Modal Elementleri ───────────────────────────────────────────────────────
  readonly modal: Locator;
  readonly modalSaveButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Sayfa
    this.pageTitle = page.locator('.page-title');
    this.table = page.locator('.dynamic-table');
    this.tableRows = page.locator('.dynamic-table tbody tr');
    this.filterBar = page.locator('.filter-bar');
    this.searchInput = page.locator('.filter-bar input[type="text"]');
    this.roleSelect = page.locator('.filter-bar select').first();

    // Modal
    this.modal = page.locator('.modal-container');
    this.modalSaveButton = page.locator('.modal-container button[type="submit"]');
  }

  // ── Aksiyonlar ──────────────────────────────────────────────────────────────

  /** Kullanıcılar sayfasına git */
  async goto() {
    await this.page.goto('/users');
  }

  /** Tabloda belirli bir kullanıcıyı bul */
  async findUser(username: string): Promise<Locator> {
    return this.tableRows.filter({ hasText: username });
  }

  /** Kullanıcıyı düzenle */
  async editUser(username: string) {
    const row = this.tableRows.filter({ hasText: username });
    await row.locator('button').first().click();
  }

  /** Kullanıcıyı sil */
  async deleteUser(username: string) {
    const row = this.tableRows.filter({ hasText: username });
    await row.locator('button').last().click();
  }

  /** Tablonun yüklendiğini bekle */
  async waitForTable() {
    await this.table.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Arama yap */
  async search(query: string) {
    await this.searchInput.fill(query);
  }

  /** Role göre filtrele */
  async filterByRole(role: string) {
    await this.roleSelect.selectOption(role);
  }
}
