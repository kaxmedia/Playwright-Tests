// Page Object for the global search feature on gambling.com.
// Search is accessible from every page via the icon in the navigation bar.
// Clicking the icon reveals a search input; results appear inline as you type.

import { type Page, type Locator } from '@playwright/test';

export class SearchPage {

  readonly page: Page;

  // The magnifying glass icon in the nav bar — click this to open the search box
  readonly searchIcon: Locator;

  // The text input that appears after clicking the search icon
  readonly searchInput: Locator;

  // The results container that appears below the input while typing
  readonly resultsContainer: Locator;

  // Individual result links inside the results container
  readonly resultItems: Locator;

  constructor(page: Page) {
    this.page           = page;
    // SSR adds #search-icon-placeholder; the live nav uses another img.search-icon. Algolia embeds
    // a separate control named "Search icon" — avoid ambiguous role locators. The nav img is offset
    // in CSS so Playwright’s pointer click can fail; openSearch() uses a DOM click via evaluate().
    this.searchIcon     = page.locator('img.search-icon:not(#search-icon-placeholder)');
    this.searchInput    = page.locator('input.search-input');
    this.resultsContainer = page.locator('div.search-result');
    this.resultItems    = page.locator('div.search-result a');
  }

  /** Activates the header search control (DOM click — the img is positioned outside Playwright’s hit viewport). */
  async openSearch() {
    await this.searchIcon.evaluate((el) => (el as HTMLElement).click());
  }

  // Opens the search box by clicking the nav icon, then types the search term.
  // Call this instead of clicking and typing manually in every test.
  async searchFor(term: string) {
    await this.openSearch();
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill(term);
  }

}
