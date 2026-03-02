import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { TopNavComponent } from './components/top-nav.component';

export class AdminSectionsPage extends BasePage {
  readonly nav: TopNavComponent;

  readonly pageContainer: Locator;
  readonly createButton: Locator;
  readonly sectionsList: Locator;

  // Create form
  readonly createForm: Locator;
  readonly titleInput: Locator;
  readonly displayTypeSelect: Locator;
  readonly contentTypeSelect: Locator;
  readonly navVisibilitySelect: Locator;
  readonly createSubmitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.nav = new TopNavComponent(page);

    this.pageContainer = page.getByTestId('admin-sections-page');
    this.createButton = page.getByTestId('create-section-button');
    this.sectionsList = page.getByTestId('sections-list');

    this.createForm = page.getByTestId('section-create-form');
    this.titleInput = page.getByTestId('section-title-input');
    this.displayTypeSelect = page.getByTestId('section-display-type-select');
    this.contentTypeSelect = page.getByTestId('section-content-type-select');
    this.navVisibilitySelect = page.getByTestId('section-nav-visibility-select');
    this.createSubmitButton = page.getByTestId('section-create-submit');
  }

  async goto() {
    await super.goto('/admin/sections');
  }

  async waitForPage() {
    await this.pageContainer.waitFor({ state: 'visible' });
  }

  sectionRow(sectionId: string): Locator {
    return this.page.getByTestId(`section-row-${sectionId}`);
  }

  editButton(sectionId: string): Locator {
    return this.page.getByTestId(`section-edit-${sectionId}`);
  }

  deleteButton(sectionId: string): Locator {
    return this.page.getByTestId(`section-delete-${sectionId}`);
  }

  addContentButton(sectionId: string): Locator {
    return this.page.getByTestId(`section-add-content-${sectionId}`);
  }

  editForm(sectionId: string): Locator {
    return this.page.getByTestId(`section-edit-form-${sectionId}`);
  }

  editTitleInput(sectionId: string): Locator {
    return this.page.getByTestId(`section-edit-title-${sectionId}`);
  }

  editSubmitButton(sectionId: string): Locator {
    return this.page.getByTestId(`section-edit-submit-${sectionId}`);
  }

  editCancelButton(sectionId: string): Locator {
    return this.page.getByTestId(`section-edit-cancel-${sectionId}`);
  }

  async openCreateForm() {
    await this.createButton.click();
    await this.createForm.waitFor({ state: 'visible' });
  }

  async fillCreateForm(options: {
    title: string;
    displayType?: string;
    contentType?: string;
    navVisibility?: string;
  }) {
    await this.titleInput.fill(options.title);
    if (options.displayType) await this.displayTypeSelect.selectOption(options.displayType);
    if (options.contentType) await this.contentTypeSelect.selectOption(options.contentType);
    if (options.navVisibility) await this.navVisibilitySelect.selectOption(options.navVisibility);
  }

  async submitCreateForm() {
    await this.createSubmitButton.click();
  }
}
