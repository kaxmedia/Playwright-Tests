import { test, expect } from '../fixtures/test';
import { SearchPage } from '../pages/SearchPage';

test.describe('Search', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    searchPage = new SearchPage(page);
    // Same gap as homepage.spec.ts (see its beforeEach for the full history of why two
    // prior dismiss-the-modal attempts both caused a 60s beforeEach timeout). CSS-hiding
    // instead of dismissing sidesteps Playwright's actionability/handler system entirely,
    // and as a bonus means the (now display:none) modal can never intercept clicks on the
    // search icon either, since hidden elements are removed from hit-testing.
    await page.addStyleTag({
      content: '[aria-labelledby="region-prompt-modal-heading"] { display: none !important; }',
    });
  });

  test('@smoke @regression search icon is visible in the navigation bar', async () => {
    await expect(searchPage.searchIcon).toBeVisible();
  });

  test('@smoke @regression clicking the search icon opens the search input', async () => {
    await searchPage.openSearch();
    await searchPage.searchInput.focus();
    await expect(searchPage.searchInput).toBeFocused();
  });

  test('@smoke @regression typing a keyword shows search results', async () => {
    await searchPage.searchFor('blackjack');
    await expect(searchPage.resultsContainer).toBeVisible();
    await expect(searchPage.resultItems.first()).toBeVisible();
  });

  test('@smoke @regression search results are relevant to the keyword', async () => {
    await searchPage.searchFor('blackjack');
    await expect(searchPage.resultItems.first()).toContainText(/blackjack/i);
  });

  test('@smoke @regression no-results query shows No Results Found message', async () => {
    await searchPage.searchFor('zzqxqq');
    await expect(searchPage.resultsContainer).toBeVisible();
    await expect(searchPage.noResultsMessage).toContainText(/No Results Found/i);
    expect(await searchPage.resultItems.count()).toBe(0);
  });

  test('@smoke @regression multi-word query returns results', async () => {
    await searchPage.searchFor('online casino');
    await expect(searchPage.resultsContainer).toBeVisible();
    expect(await searchPage.resultItems.count()).toBeGreaterThanOrEqual(1);
  });

  test('@smoke @regression result links have valid hrefs', async () => {
    await searchPage.searchFor('blackjack');
    const count = Math.min(await searchPage.resultItems.count(), 3);
    for (let i = 0; i < count; i++) {
      const href = await searchPage.resultItems.nth(i).getAttribute('href');
      expect(href?.trim().length, `Result ${i} has empty href`).toBeGreaterThan(0);
      expect(href, `Result ${i} has dead # href`).not.toBe('#');
    }
  });
});
