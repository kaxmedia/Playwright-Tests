import { test, expect } from '@playwright/test';

const GIVEAWAYS_MASKS = [
  'div.countdown-unit',
  'div.cky-banner-bottom',
];

test('@visual gambling.com /uk/giveaways live-competitions renders deterministically', async ({ page }) => {
  await page.goto('/uk/giveaways', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
  });
  await expect(page.locator('div.live-competitions')).toHaveScreenshot('giveaways.png', {
    threshold: 0,
    maxDiffPixelRatio: 0.04,
    timeout: 30000,
    mask: GIVEAWAYS_MASKS.map(s => page.locator(s)),
  });
});
