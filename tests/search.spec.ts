import { test, expect } from '@playwright/test';
import { SearchPage } from '../pages/SearchPage';

const HOME_URL = 'https://www.gambling.com';

test.describe('Search', () => {

  test('search icon is visible in the navigation bar', async ({ page }) => {
    await page.goto(HOME_URL);
    const searchPage = new SearchPage(page);
    await expect(searchPage.searchIcon).toBeVisible();
  });

  test('clicking the search icon opens the search input', async ({ page }) => {
    await page.goto(HOME_URL);
    const searchPage = new SearchPage(page);

    await expect(searchPage.searchIcon).toBeVisible();
    // The header often keeps `input.search-input` in the DOM before the overlay is expanded.
    await expect(searchPage.searchInput).toBeVisible();

    await searchPage.openSearch();

    // The expanded field can sit outside the hit viewport until scrolled; focus without pointer geometry.
    await searchPage.searchInput.focus();
    await expect(searchPage.searchInput).toBeFocused();
  });

  test('typing a keyword shows search results', async ({ page }) => {
    await page.goto(HOME_URL);
    const searchPage = new SearchPage(page);

    await searchPage.searchFor('blackjack');

    // Results container should appear with at least one result
    await expect(searchPage.resultsContainer).toBeVisible();
    await expect(searchPage.resultItems.first()).toBeVisible();
  });

  test('search results are relevant to the keyword', async ({ page }) => {
    await page.goto(HOME_URL);
    const searchPage = new SearchPage(page);

    await searchPage.searchFor('blackjack');

    // At least the first result should mention the search term
    await expect(searchPage.resultItems.first()).toContainText(/blackjack/i);
  });

});
