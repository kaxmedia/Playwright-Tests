import { test, expect } from '@playwright/test';

const BONUS_PATH = '/online-casinos/bonus/';

const GEOS = [
  { path: '/at',    name: 'at' },
  { path: '/au',    name: 'au' },
  { path: '/be',    name: 'be' },
  { path: '/be/fr', name: 'be-fr' },
  { path: '/br',    name: 'br' },
  { path: '/ca',    name: 'ca' },
  { path: '/ca/fr', name: 'ca-fr' },
  { path: '/de',    name: 'de' },
  { path: '/dk',    name: 'dk' },
  { path: '/es',    name: 'es' },
  { path: '/gr',    name: 'gr' },
  { path: '/ie',    name: 'ie' },
  { path: '/in',    name: 'in' },
  { path: '/is',    name: 'is' },
  { path: '/is/en', name: 'is-en' },
  { path: '/it',    name: 'it' },
  { path: '/mx',    name: 'mx' },
  { path: '/nl',    name: 'nl' },
  { path: '/no',    name: 'no' },
  { path: '/nz',    name: 'nz' },
  { path: '/pe',    name: 'pe' },
  { path: '/ro',    name: 'ro' },
  { path: '/se',    name: 'se' },
  { path: '/uk',    name: 'uk' },
  { path: '/us',    name: 'us' },
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
    test.skip(geo.name === 'us', '/us bonus content rotates faster than the ~25 min test cycle between capture and verify - tracked for Sprint 4 strategy review');
    test.skip(testInfo.project.name === 'visual-chromium-android', 'chromium-android masking incomplete on bonus pages — Pixel 7 DOM differs from desktop/iOS; revisit after Android selector recon');
    const response = await page.goto(`${geo.path}${BONUS_PATH}`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('load');
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    await expect(page.locator('div.cf-primary-operator-list ol')).toHaveScreenshot(`bonus-${geo.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.04,
      timeout: 30000,
      mask: BONUS_MASKS.map(s => page.locator(s)),
    });
  });
}
