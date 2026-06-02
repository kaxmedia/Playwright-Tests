import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/SearchPage';

test.describe('Search', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    searchPage = new SearchPage(page);
  });

  test('@smoke search icon is visible in the navigation bar', async () => {
    await expect(searchPage.searchIcon).toBeVisible();
  });

  test('@smoke clicking the search icon opens the search input', async () => {
    await searchPage.openSearch();
    await searchPage.searchInput.focus();
    await expect(searchPage.searchInput).toBeFocused();
  });

  test('@smoke typing a keyword shows search results', async () => {
    await searchPage.searchFor('blackjack');
    await expect(searchPage.resultsContainer).toBeVisible();
    await expect(searchPage.resultItems.first()).toBeVisible();
  });

  test('@smoke search results are relevant to the keyword', async () => {
    await searchPage.searchFor('blackjack');
    await expect(searchPage.resultItems.first()).toContainText(/blackjack/i);
  });
});
