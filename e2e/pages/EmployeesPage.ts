/**
 * EmployeesPage — Page Object Model
 * Çalışanlar sayfası elementlerini ve aksiyonlarını tanımlar.
 *
 * Kaynak: apps/management/client/src/pages/EmployeesPage/EmployeesPage.tsx
 *         apps/management/client/src/pages/EmployeesPage/EmployeeModal/SingleEmployeeForm.tsx
 */
import type { Page, Locator } from '@playwright/test';

export class EmployeesPage {
  readonly page: Page;

  // ── Sayfa Elementleri ───────────────────────────────────────────────────────
  readonly pageTitle: Locator;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly tableRows: Locator;
  readonly filterBar: Locator;
  readonly searchInput: Locator;

  // ── Modal Elementleri ───────────────────────────────────────────────────────
  readonly modal: Locator;
  readonly tcNoInput: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly locationSelect: Locator;
  readonly unitSelect: Locator;
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly isActiveCheckbox: Locator;
  readonly ibanInput: Locator;
  readonly phoneNoInput: Locator;
  readonly modalSaveButton: Locator;
  readonly modalCancelButton: Locator;
  readonly modalApiError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Sayfa
    this.pageTitle = page.locator('.page-title');
    this.addButton = page.getByRole('button', { name: /Yeni Çalışan Ekle/i });
    this.table = page.locator('.dynamic-table');
    this.tableRows = page.locator('.dynamic-table tbody tr');
    this.filterBar = page.locator('.filter-bar');
    this.searchInput = page.locator('.filter-bar input[type="text"]');

    // Modal (SingleEmployeeForm)
    this.modal = page.locator('.modal-container');
    this.tcNoInput = page.locator('#tcNo');
    this.firstNameInput = page.locator('#firstName');
    this.lastNameInput = page.locator('#lastName');
    this.locationSelect = page.locator('#locationId');
    this.unitSelect = page.locator('#unitId');
    this.startDateInput = page.locator('#startDate');
    this.endDateInput = page.locator('#endDate');
    this.isActiveCheckbox = page.locator('#isActiveCheck');
    this.ibanInput = page.locator('#ibanNo');
    this.phoneNoInput = page.locator('#phoneNo');
    this.modalSaveButton = page.locator('.modal-form__actions button[type="submit"]');
    this.modalCancelButton = page.getByRole('button', { name: 'Vazgeç' });
    this.modalApiError = page.locator('.api-error-alert');
  }

  // ── Aksiyonlar ──────────────────────────────────────────────────────────────

  /** Çalışanlar sayfasına git */
  async goto() {
    await this.page.goto('/employees');
  }

  /** Yeni Çalışan Ekle butonuna tıkla */
  async clickAdd() {
    await this.addButton.click();
  }

  /** Modal formunu doldur */
  async fillForm(data: {
    tcNo: string;
    firstName: string;
    lastName: string;
    locationValue?: string;
    unitValue?: string;
    startDate: string;
    ibanNo: string;
    phoneNo?: string;
  }) {
    await this.tcNoInput.fill(data.tcNo);
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    if (data.locationValue) {
      await this.locationSelect.selectOption(data.locationValue);
      // Birimler yüklenmesi için kısa bir bekleme
      await this.page.waitForTimeout(500);
    }
    if (data.unitValue) {
      await this.unitSelect.selectOption(data.unitValue);
    }
    await this.startDateInput.fill(data.startDate);
    await this.ibanInput.fill(data.ibanNo);
    if (data.phoneNo) {
      await this.phoneNoInput.fill(data.phoneNo);
    }
  }

  /** Modal kaydet butonuna tıkla */
  async saveForm() {
    await this.modalSaveButton.click();
  }

  /** Tabloda belirli bir metni içeren satırı bul */
  async findRowByText(text: string): Promise<Locator> {
    return this.tableRows.filter({ hasText: text });
  }

  /** Tabloda bir satırın düzenle butonuna tıkla */
  async clickEditOnRow(text: string) {
    const row = this.tableRows.filter({ hasText: text });
    await row.locator('.edit-btn').click();
  }

  /** Tabloda bir satırın sil butonuna tıkla */
  async clickDeleteOnRow(text: string) {
    const row = this.tableRows.filter({ hasText: text });
    await row.locator('.delete-btn').click();
  }

  /** Tablonun yüklendiğini bekle */
  async waitForTable() {
    await this.table.waitFor({ state: 'visible', timeout: 10_000 });
  }

  /** Arama yap */
  async search(query: string) {
    await this.searchInput.fill(query);
  }
}
