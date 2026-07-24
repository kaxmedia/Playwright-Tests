import { test, expect } from '../../fixtures/test';

const BONUS_PATH = '/online-casinos/bonus';

// Scoped to geos confirmed serving /online-casinos/bonus from CI runners.
// CA EN hub removed (301 → toplist) — dropped from this list. See PR #42 for earlier exclusions.
const GEOS = [
  { path: '/at', name: 'at' },
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
    // Fast-rotating combo confirmed in PR #130 run 30027521016: top-3 operator lineup rotates
    // between capture and comparison (pixel-only diff, zero dimension mismatches — not a rendering bug).
    test.skip(geo.name === 'is' && testInfo.project.name === 'visual-webkit-ios', 'bonus /is top-3 operator lineup rotates between capture and verify (pixel-only diff, no dimension mismatch — PR #130 run 30027521016); tracked for Sprint 4 strategy review');
    const response = await page.goto(`${geo.path}${BONUS_PATH}`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('load');
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    // Capture only the top 3 operators as a fixed-height region. The full list's height drifts as
    // operators rotate within the ~25 min capture→verify cycle, so the screenshot's dimensions
    // change and exceed maxDiffPixelRatio — a size change, not pixel content, so masking can't fix
    // it. Hiding the 4th+ rows keeps the captured region a fixed size.
    await page.addStyleTag({
      content: 'div.cf-primary-operator-list ol > li:nth-child(n+4) { display: none !important; }',
    });
    await expect(page.locator('div.cf-primary-operator-list ol')).toHaveScreenshot(`bonus-${geo.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.10,
      timeout: 30000,
      mask: BONUS_MASKS.map(s => page.locator(s)),
    });
  });
}
