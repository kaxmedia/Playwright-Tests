import { test, expect } from '../../fixtures/test';
import { dismissRegionPromptBeforeCapture } from '../../fixtures/regionPrompt';

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

// section.ghp-aso is the "Featured in" press-logos strip -- confirmed live, 2026-09-25, that it
// rotates its selection/order between loads (a real ~17% pixel diff on root, chromium-desktop,
// deterministic across 3 retries, against a baseline refreshed minutes earlier -- not stale, just
// non-deterministic content). Masked the same way as the other known-rotating sections below.
const BASE_MASKS = ['div.home-banner', 'section.carousel', 'section.ghp-aso', 'div.cky-banner-bottom'];

for (const geo of GEOS) {
  test(`@visual gambling.com ${geo.path} renders deterministically`, async ({ page }) => {
            // The region-modal poll (see dismissRegionPromptBeforeCapture) can take up to 18s, on top of
        // navigation + render + capture time. The 90s timeout (bumped from the default 60s in a first
        // pass) still wasn't enough for the heaviest page on the slowest project/page combo (webkit-ios,
        // root homepage) -- confirmed live, 2026-09-25: run #405 timed out again at exactly 90000ms.
        // Bumped further to 120s, matching this codebase's own convention for its genuinely slowest
        // tests (see auth.spec.ts, footer.spec.ts, profile.spec.ts).
        test.setTimeout(120_000);
    await page.goto(geo.path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
        // Poll for and dismiss the region-switch modal before capturing -- it appears on a
        // genuinely non-deterministic delay, and the global addLocatorHandler dismissal never fires
        // before toHaveScreenshot() (see fixtures/regionPrompt.ts and tests/visual/tournaments.spec.ts).
        await dismissRegionPromptBeforeCapture(page);
    await expect(page).toHaveScreenshot(`${geo.name}.png`, {
      fullPage: false,
      threshold: 0,
      maxDiffPixelRatio: 0.13,
      timeout: 30000,
      mask: BASE_MASKS.map(s => page.locator(s)),
    });
  });
}
