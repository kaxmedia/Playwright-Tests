import { test, expect } from '../../fixtures/test';

const GIVEAWAYS_MASKS = [
  'div.countdown-unit',
  'div.cky-banner-bottom',
];

test('@visual gambling.com /uk/giveaways live-competitions renders deterministically', async ({ page }) => {
  // 2026-11-02 dashboard: 12–18% diffs across all 4 visual projects. Live card copy is the
  // November Cosmo Cash Machine competition — seasonal/rotating giveaway content, not a CSS
  // regression. Countdown is already masked; the card title/image/body still rotate monthly.
  // House rule: rotation ⇒ skip, never rebaseline.
  test.skip(
    true,
    '/uk/giveaways live-competitions card content rotates monthly (12–18% pixel diffs, dashboard 2026-11-02 — live November Cosmo Cash Machine vs committed baseline); not a rendering bug',
  );
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
