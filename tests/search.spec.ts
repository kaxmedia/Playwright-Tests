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

    // The input should be hidden before clicking the icon
    await expect(searchPage.searchInput).not.toBeVisible();

    await searchPage.searchIcon.click();

    // After clicking, the input should appear
    await expect(searchPage.searchInput).toBeVisible();
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
