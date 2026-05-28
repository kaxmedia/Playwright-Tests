// ─────────────────────────────────────────────────────────────────────────────
// Geo-parameterised global nav tests — 26 markets × 6 @smoke checks
//
// Verifies nav integrity across every geo: visibility, dropdown trigger count,
// trigger text completeness, real link count floor, HTTP reachability of the
// first 10 real links, and presence of the logo home link.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';
import { GeoHomepage, geoHomepages } from '../pages/GeoHomepage';
import { globalNavLogoLink } from '../pages/globalNavLogo';

const BASE_URL = 'https://www.gambling.com';

for (const config of geoHomepages) {
  test.describe(`Global Nav — ${config.name} geo`, () => {
    let gh: GeoHomepage;

    test.beforeEach(async ({ page }) => {
      gh = new GeoHomepage(page);
      await gh.goto(config.path);
    });

    // T1 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke nav is visible`, async () => {
      await expect(gh.nav).toBeVisible();
    });

    // T2 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke nav has at least 2 dropdown triggers`, async () => {
      // IS geos use a flat nav with no href="#" triggers — different nav structure, not a bug.
      test.fixme(config.skipNavTriggerCheck === true, `${config.name} nav has no href="#" dropdown triggers — flat nav structure`);
      expect(await gh.navDropdownTriggers.count()).toBeGreaterThanOrEqual(2);
    });

    // T3 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke every dropdown trigger has non-empty text`, async () => {
      const count = await gh.navDropdownTriggers.count();
      for (let i = 0; i < count; i++) {
        const text = (await gh.navDropdownTriggers.nth(i).textContent())?.trim();
        expect(text, `trigger ${i} has empty text`).toBeTruthy();
      }
    });

    // T4 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke nav has at least 20 real links`, async () => {
      expect(await gh.navRealLinks.count()).toBeGreaterThanOrEqual(20);
    });

    // T5 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke first 10 nav real links return HTTP < 400`, async ({ request }) => {
      const count = await gh.navRealLinks.count();
      const hrefs: string[] = [];
      for (let i = 0; i < count && hrefs.length < 10; i++) {
        const href = await gh.navRealLinks.nth(i).getAttribute('href');
        if (href && href.startsWith('/')) hrefs.push(href);
      }
      const results = await Promise.all(
        hrefs.map(async href => {
          const response = await request.get(`${BASE_URL}${href}`, { timeout: 15000 });
          return { href, status: response.status() };
        })
      );
      for (const { href, status } of results) {
        expect(status, `${BASE_URL}${href} returned HTTP ${status}`).toBeLessThan(400);
      }
    });

    // T6 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke logo home link exists in nav`, async () => {
      const logoLink = globalNavLogoLink(gh.page);
      await expect(logoLink).toBeAttached();
      const href = await logoLink.getAttribute('href');
      expect(href).toMatch(/^\//);
    });

  });
}
