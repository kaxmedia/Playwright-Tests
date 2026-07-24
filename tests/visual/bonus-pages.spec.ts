import { test, expect } from '../../fixtures/test';
import { CLIP_HEIGHTS } from './clip-heights.generated';

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
    // Fast-rotating combo confirmed in PR #130 run 30027521016: top-3 operator lineup rotates
    // between capture and comparison (pixel-only diff, zero dimension mismatches — not a rendering bug).
    test.skip(geo.name === 'is' && testInfo.project.name === 'visual-webkit-ios', 'bonus /is top-3 operator lineup rotates between capture and verify (pixel-only diff, no dimension mismatch — PR #130 run 30027521016); tracked for Sprint 4 strategy review');
    const response = await page.goto(`${geo.path}${BONUS_PATH}`, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await page.waitForLoadState('load');
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    // Pin the operator list to a FIXED per-(geo,project) height (cropping overflow) so the
    // captured ELEMENT has constant dimensions — the systemic ±1px sub-pixel height jitter can't
    // change an explicitly-set box height, and Playwright hard-fails on any dimension diff.
    // Screenshot the element (NOT page+clip): stabilization stays scoped to the list, which
    // settles quickly; a page-level clip screenshot waits for the whole live page to stabilize,
    // which it never does → 30s capture timeouts. The fixed height also crops the 4th+ cards,
    // leaving exactly the top 3. maxDiffPixelRatio still covers legitimate content differences.
    const bonusHeight = CLIP_HEIGHTS.bonus[`${geo.name}|${testInfo.project.name}`];
    if (bonusHeight === undefined) throw new Error(`No clip height for bonus ${geo.name}|${testInfo.project.name} — re-run generate-clip-heights.mjs`);
    await page.addStyleTag({
      content: `div.cf-primary-operator-list ol { height: ${bonusHeight}px !important; max-height: ${bonusHeight}px !important; overflow: hidden !important; }`,
    });
    await expect(page.locator('div.cf-primary-operator-list ol')).toHaveScreenshot(`bonus-${geo.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.10,
      timeout: 30000,
      mask: BONUS_MASKS.map(s => page.locator(s)),
    });
  });
}
