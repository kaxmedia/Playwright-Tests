import { test, expect } from '@playwright/test';

const URL = 'https://www.gambling.com';

test.describe('Homepage', () => {

  test('page loads and has the correct title', async ({ page }) => {
    await page.goto(URL);
    await expect(page).toHaveTitle(/gambling\.com/i);
  });

  test('logo is visible in the header', async ({ page }) => {
    await page.goto(URL);
    const logo = page.getByAltText('gambling.com');
    await expect(logo).toBeVisible();
  });

  test('main navigation links are visible', async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByRole('link', { name: 'Reviews' }).first()).toBeVisible();
  });

  test('page has a visible heading', async ({ page }) => {
    await page.goto(URL);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

});
