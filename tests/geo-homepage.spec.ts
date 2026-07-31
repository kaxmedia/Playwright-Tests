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
    test(`${config.name} — @smoke @regression ${config.path} shows "offer not available" for non-local visitors`, async ({ page }) => {
      const response = await page.goto(config.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `${config.path} should respond`).toBeLessThan(400);
      // The site does NOT redirect non-local visitors away from the geo path (verified live
      // 2026-07-31 from a non-NO IP, and confirmed against a Norway VPN): /no stays on /no and
      // swaps only the primary offer CTA by geo — a non-local visitor sees "Offer not available
      // for your location" where a Norway visitor gets a working "Spill Nå" (Play Now) button.
      // Simulating a Norway-geo visitor via VPN in CI is out of scope, so this asserts the
      // non-local behaviour: stays on the geo path and shows the offer-unavailable message.
      await expect(page).toHaveURL(new RegExp(`${config.path.replace('/', '\\/')}(\\/|$|\\?)`));
      await expect(page.getByText(/offer not available for your location/i).first())
        .toBeVisible({ timeout: 15_000 });
    });
  });
}
