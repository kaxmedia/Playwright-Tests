import { test, expect } from '@playwright/test';

test('@visual smoke: gambling.com root renders deterministically', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveScreenshot('root.png', { fullPage: true, threshold: 0 });
});
