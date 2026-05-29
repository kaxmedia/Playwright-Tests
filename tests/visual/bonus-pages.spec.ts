import { test, expect } from '@playwright/test';

const BONUS_PATH = '/online-casinos/bonus';

// Scoped to 10 geos confirmed serving /online-casinos/bonus from CI runners. 14 geos excluded: 11 return 404 sitewide, 3 are geo/bot-blocked from CI IPs. See PR #42.
const GEOS = [
  { path: '/at', name: 'at' },
  { path: '/ca', name: 'ca' },
  { path: '/gr', name: 'gr' },
  { path: '/ie', name: 'ie' },
  { path: '/in', name: 'in' },
  { path: '/is', name: 'is' },
  { path: '/nl', name: 'nl' },
  { path: '/nz', name: 'nz' },
  { path: '/pe', name: 'pe' },
  { path: '/uk', name: 'uk' },
];

const BONUS_MASKS = [
  '.operator-column-bonus-v2',
  '.promo-code',
  'span.progress-number',
  'div.primary-list-item-payment-methods',
  '.operator-established-year-v2',
  'div.cky-banner-bottom',
];

for (const geo of GEOS) {
  test(`@visual gambling.com ${geo.path} bonus renders deterministically`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'visual-chromium-android', 'chromium-android masking incomplete on bonus pages — Pixel 7 DOM differs from desktop/iOS; revisit after Android selector recon');
    const response = await page.goto(`${geo.path}${BONUS_PATH}`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('load');
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    await expect(page.locator('div.cf-primary-operator-list ol')).toHaveScreenshot(`bonus-${geo.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.10,
      timeout: 30000,
      mask: BONUS_MASKS.map(s => page.locator(s)),
    });
  });
}
