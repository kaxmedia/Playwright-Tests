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

const BASE_MASKS = ['div.home-banner', 'section.carousel', 'div.cky-banner-bottom'];

for (const geo of GEOS) {
  test(`@visual gambling.com ${geo.path} renders deterministically`, async ({ page }) => {
    await page.goto(geo.path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Freeze all CSS animations and transitions
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    // Scroll through the full page to fire IntersectionObserver and trigger lazy image loading
    await page.evaluate(async () => {
      const step = window.innerHeight;
      let pos = 0;
      while (pos < document.body.scrollHeight) {
        window.scrollTo(0, pos);
        await new Promise(r => setTimeout(r, 100));
        pos += step;
      }
      window.scrollTo(0, 0);
    });
    // Wait for every image triggered by the scroll to finish loading
    await page.waitForFunction(
      () => [...document.images].every(img => img.complete),
      { timeout: 15000 },
    ).catch(() => {});
    // Kill all JS timers so live-updating content (counters, odds) is frozen
    await page.evaluate(() => {
      const maxId = window.setTimeout(() => {}, 0);
      for (let i = 1; i <= maxId; i++) {
        window.clearTimeout(i);
        window.clearInterval(i);
      }
    });
    await page.evaluate(() => { document.documentElement.style.overflowY = 'scroll'; });
    await expect(page).toHaveScreenshot(`${geo.name}.png`, {
      fullPage: true,
      threshold: 0,
      maxDiffPixelRatio: 0.02,
      timeout: 30000,
      mask: BASE_MASKS.map(s => page.locator(s)),
    });
  });
}
