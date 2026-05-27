import { test, expect } from '@playwright/test';

const MASKS = [
  'div.cky-banner-bottom',
];

const SECTIONS = [
  { name: 'best-gambling-sites',   heading: 'Best Gambling Sites in the US' },
  { name: 'responsible-gambling',  heading: 'Responsible Gambling' },
];

for (const section of SECTIONS) {
  test(`@visual gambling.com /us ${section.name} renders deterministically`, async ({ page }) => {
    await page.goto('/us/', { waitUntil: 'load' });
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    const cb = page.locator(
      `div.content-block-with-header-component:has(h2:has-text("${section.heading}"))`
    );
    await cb.scrollIntoViewIfNeeded();
    await cb.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    await expect(cb).toHaveScreenshot(`us-${section.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.04,
      timeout: 30000,
      mask: MASKS.map(s => page.locator(s)),
    });
  });
}
