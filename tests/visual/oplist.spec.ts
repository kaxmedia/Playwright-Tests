import { test, expect } from '@playwright/test';

const GEOS = [
  { path: '/',      name: 'root' },
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

const OPLIST_MASKS = [
  '.operator-column-bonus-v2',
  '.promo-code',
  'span.progress-number',
  'div.primary-list-item-payment-methods',
  '.operator-established-year-v2',
  'div.cky-banner-bottom',
];

for (const geo of GEOS) {
  test(`@visual gambling.com ${geo.path} oplist renders deterministically`, async ({ page }, testInfo) => {
    test.skip(geo.name === 'us', '/us oplist content rotates faster than the ~25 min test cycle between capture and verify - tracked for Sprint 4 strategy review');
    test.skip(geo.name === 'root' && testInfo.project.name === 'visual-webkit-ios', 'webkit-ios oplist root rotates faster than the ~25 min test cycle (4 consecutive runs failing) - tracked for Sprint 4 strategy review');
    await page.goto(geo.path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    await expect(page.locator('div.cf-primary-operator-list')).toHaveScreenshot(`oplist-${geo.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.13,
      timeout: 30000,
      mask: OPLIST_MASKS.map(s => page.locator(s)),
    });
  });
}
