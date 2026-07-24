import { test, expect } from '../../fixtures/test';
import { CLIP_HEIGHTS } from './clip-heights.generated';

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

// Fast-rotating geo/project combos confirmed in PR #130's verification run (30027521016): the
// top-3 operator lineup rotates between baseline capture and comparison, producing pixel-only
// diffs with zero dimension mismatches — content rotation, not a rendering bug — same family as
// the us / root(webkit-ios) skips below.
const ROTATION_SKIP_REASON = 'oplist top-3 operator lineup rotates between capture and verify (pixel-only diff, no dimension mismatch — PR #130 run 30027521016); tracked for Sprint 4 strategy review';

for (const geo of GEOS) {
  test(`@visual gambling.com ${geo.path} oplist renders deterministically`, async ({ page }, testInfo) => {
    test.skip(geo.name === 'us', '/us oplist content rotates faster than the ~25 min test cycle between capture and verify - tracked for Sprint 4 strategy review');
    test.skip(geo.name === 'root' && testInfo.project.name === 'visual-webkit-ios', 'webkit-ios oplist root rotates faster than the ~25 min test cycle (4 consecutive runs failing) - tracked for Sprint 4 strategy review');
    // Newly-confirmed fast-rotating combos from PR #130 run 30027521016 (see ROTATION_SKIP_REASON):
    test.skip(geo.name === 'root' && ['visual-chromium-desktop', 'visual-webkit-desktop'].includes(testInfo.project.name), ROTATION_SKIP_REASON);
    test.skip(geo.name === 'is-en' && ['visual-webkit-ios', 'visual-webkit-desktop'].includes(testInfo.project.name), ROTATION_SKIP_REASON);
    test.skip(geo.name === 'no' && ['visual-chromium-desktop', 'visual-webkit-desktop', 'visual-webkit-ios'].includes(testInfo.project.name), ROTATION_SKIP_REASON);
    test.skip(geo.name === 'in' && testInfo.project.name === 'visual-webkit-ios', ROTATION_SKIP_REASON);
    await page.goto(geo.path, { waitUntil: 'domcontentloaded' });
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
    const oplistBox = await page.locator('div.cf-primary-operator-list ol').boundingBox();
    if (!oplistBox) throw new Error(`Operator list not found for ${geo.name}`);
    const oplistHeight = CLIP_HEIGHTS.oplist[`${geo.name}|${testInfo.project.name}`];
    if (oplistHeight === undefined) throw new Error(`No clip height for oplist ${geo.name}|${testInfo.project.name} — re-run generate-clip-heights.mjs`);
    await expect(page).toHaveScreenshot(`oplist-${geo.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.13,
      timeout: 30000,
      clip: { x: Math.floor(oplistBox.x), y: Math.floor(oplistBox.y), width: Math.floor(oplistBox.width), height: oplistHeight },
      mask: OPLIST_MASKS.map(s => page.locator(s)),
    });
  });
}
