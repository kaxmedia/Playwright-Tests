import { test, expect } from '@playwright/test';

const TOURNAMENTS_MASKS = [
  'div.countdown-unit',
  'div.gdc-v-tournament-results-table',
  'div.prize-pool-list',
  'div.cky-banner-bottom',
];

test('@visual gambling.com /games/tournaments renders deterministically', async ({ page }) => {
  await page.goto('/games/tournaments', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
  });
  await expect(page).toHaveScreenshot('tournaments.png', {
    fullPage: false,
    threshold: 0,
    maxDiffPixelRatio: 0.04,
    timeout: 30000,
    mask: TOURNAMENTS_MASKS.map(s => page.locator(s)),
  });
});
