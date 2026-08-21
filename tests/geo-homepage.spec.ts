import { test, expect } from '../fixtures/test';
import { GeoHomepage, geoHomepages } from '../pages/GeoHomepage';

// Parameterised suite — one describe block per entry in geoHomepages.
// To add a new geo: add an entry to geoHomepages in pages/GeoHomepage.ts —
// no changes needed here.

for (const config of geoHomepages) {
  test.describe(config.name, () => {
    // Norway (/no) is IP-gated — only a Norway VPN reaches the local homepage.
    // Non-NO visitors are redirected away; full content smoke is skipped below.
    test.skip(!!config.geoRestricted, `${config.name} is geo-restricted — content suite requires a local VPN`);

    let gh: GeoHomepage;

    test.beforeEach(async ({ page }) => {
      gh = new GeoHomepage(page);
      await gh.goto(config.path);
    });

    // T1 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression URL contains ${config.path}`, async ({ page }) => {
      expect(page.url()).toContain(config.path);
    });

    // T2 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression page title is non-empty`, async ({ page }) => {
      expect((await page.title()).length).toBeGreaterThan(0);
    });

    // T3 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression html lang attribute is ${config.expectedLang}`, async () => {
      expect(await gh.getLang()).toBe(config.expectedLang);
    });

    // T4 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression logo is visible`, async () => {
      await expect(gh.logo).toBeVisible();
    });

    // T5 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression primary nav is visible`, async () => {
      await expect(gh.nav).toBeVisible();
    });

    // T6 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression nav contains at least 3 links`, async () => {
      expect(await gh.navItems.count()).toBeGreaterThanOrEqual(3);
    });

    // T7 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression h1 is visible with non-empty text`, async () => {
      await expect(gh.h1).toBeVisible();
      expect((await gh.h1.innerText()).trim().length).toBeGreaterThan(0);
    });

    // T8 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression footer is visible`, async () => {
      await expect(gh.footer).toBeVisible();
    });

  });
}

// Geo-restricted markets — assert the non-local-visitor experience on the geo path.
const geoRestrictedHomepages = geoHomepages.filter((g) => g.geoRestricted);

for (const config of geoRestrictedHomepages) {
  test.describe(`${config.name} — geo restriction`, () => {
    test(`${config.name} — @smoke @regression ${config.path} stays on the geo path for non-local visitors`, async ({ page }) => {
      const response = await page.goto(config.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${config.path} should respond`).toBeLessThan(400);
      // Pre-rebrand (verified 2026-07): non-local visitors saw "Offer not available for
      // your location" instead of a Play CTA. Post-rebrand (2026-08): /no stays on /no
      // and still renders Spill Nå / /go/ CTAs from an IE IP — geo-block copy is gone.
      // Assert the stable contract we can still enforce without a Norway VPN: the geo
      // path does not bounce the visitor away.
      const pathRe = new RegExp(`${config.path.replace('/', '\\/')}(\\/|$|\\?)`);
      await page.waitForURL(pathRe, { timeout: 20_000 });
      await expect(page).toHaveURL(pathRe);
    });
  });
}
