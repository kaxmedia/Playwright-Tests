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
    // Capture only the top 3 operators, clipped to a FIXED per-(geo,project) height so the
    // captured dimensions are constant by construction. The 3-card region has a systemic ±1px
    // sub-pixel height jitter across all browsers, and Playwright hard-fails on ANY dimension
    // diff, so an element screenshot flakes. x/y/width come from the live boundingBox (they
    // don't jitter); height is the pinned constant from clip-heights.generated.ts. Hiding the
    // 4th+ rows keeps anything below the 3rd card out of the clip. maxDiffPixelRatio covers content.
    await page.addStyleTag({
      content: 'div.cf-primary-operator-list ol > li:nth-child(n+4) { display: none !important; }',
    });
    const bonusBox = await page.locator('div.cf-primary-operator-list ol').boundingBox();
    if (!bonusBox) throw new Error(`Operator list not found for ${geo.name}`);
    const bonusHeight = CLIP_HEIGHTS.bonus[`${geo.name}|${testInfo.project.name}`];
    if (bonusHeight === undefined) throw new Error(`No clip height for bonus ${geo.name}|${testInfo.project.name} — re-run generate-clip-heights.mjs`);
    await expect(page).toHaveScreenshot(`bonus-${geo.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.10,
      timeout: 30000,
      clip: { x: Math.floor(bonusBox.x), y: Math.floor(bonusBox.y), width: Math.floor(bonusBox.width), height: bonusHeight },
      mask: BONUS_MASKS.map(s => page.locator(s)),
    });
  });
}
