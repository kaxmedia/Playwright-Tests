// This test file uses the Page Object Model pattern.
// Notice how clean this looks — there are no raw CSS selectors or URLs here.
// All of that detail lives in pages/HomePage.ts.
// If the site changes, we update the page object, not this file.

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Homepage', () => {

  test('page loads and has the correct title', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(page).toHaveTitle(/gambling\.com/i);
  });

  test('logo is visible in the header', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(homePage.logo).toBeVisible();
  });

  test('main navigation links are visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(homePage.reviewsNavLink).toBeVisible();
  });

  test('page has a visible heading', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(homePage.mainHeading).toBeVisible();
  });

});
