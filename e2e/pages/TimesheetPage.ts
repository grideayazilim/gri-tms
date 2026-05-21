/**
 * TimesheetPage — Page Object Model
 * Puantaj sayfası elementlerini ve aksiyonlarını tanımlar.
 *
 * Kaynak: apps/management/client/src/pages/TimesheetPage/TimesheetPage.tsx
 */
import type { Page, Locator } from '@playwright/test';

export class TimesheetPage {
  readonly page: Page;

  // ── Elementler ──────────────────────────────────────────────────────────────
  readonly pageShell: Locator;
  readonly pageTitle: Locator;
  readonly filterBar: Locator;
  readonly periodSelect: Locator;
  readonly locationSelect: Locator;
  readonly unitSelect: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly saveButton: Locator;
  readonly lockCheckbox: Locator;
  readonly announcementButton: Locator;
  readonly userBadge: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageShell = page.locator('.page-container');
    this.pageTitle = page.locator('.page-title');
    this.filterBar = page.locator('.filter-bar');
    // FilterBar select'leri sırasıyla: dönem, yerleşke, birim
    this.periodSelect = page.locator('.filter-bar select').first();
    this.locationSelect = page.locator('.filter-bar select').nth(1);
    this.unitSelect = page.locator('.filter-bar select').nth(2);
    this.table = page.locator('.dynamic-table');
    this.tableRows = page.locator('.dynamic-table tbody tr');
    this.saveButton = page.getByRole('button', { name: /Değişiklikleri Kaydet|Kaydediliyor/i });
    this.lockCheckbox = page.locator('.ts-lock-row input[type="checkbox"]');
    this.announcementButton = page.locator('.announcement-icon-btn');
    this.userBadge = page.locator('.ts-user-badge');
    this.errorMessage = page.locator('.page-container div[style]').filter({ hasText: /hata|error/i });
  }

  // ── Aksiyonlar ──────────────────────────────────────────────────────────────

  /** Puantaj sayfasına git */
  async goto() {
    await this.page.goto('/');
  }

  /** Dönem seç (select value) */
  async selectPeriod(value: string) {
    await this.periodSelect.selectOption(value);
  }

  /** Yerleşke seç (select value) */
  async selectLocation(value: string) {
    await this.locationSelect.selectOption(value);
  }

  /** Birim seç (select value) */
  async selectUnit(value: string) {
    await this.unitSelect.selectOption(value);
  }

  /** Tablodaki bir gün hücresine tıkla (satır indexi ve gün tarihi ile) */
  async clickDayCell(rowIndex: number, dateStr: string) {
    const row = this.tableRows.nth(rowIndex);
    const cell = row.locator(`[data-date="${dateStr}"]`);
    await cell.click();
  }

  /** Kaydet butonuna tıkla */
  async save() {
    await this.saveButton.click();
  }

  /** Dönem kilidini toggle et (sadece admin) */
  async toggleLock() {
    await this.lockCheckbox.click();
  }

  /** Tablonun yüklendiğini bekle */
  async waitForTable() {
    await this.table.waitFor({ state: 'visible', timeout: 15_000 });
  }

  /** Tablodaki satır sayısını al */
  async getRowCount(): Promise<number> {
    return this.tableRows.count();
  }
}
