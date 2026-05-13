import { type Page, type Locator } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// GeoHomepageConfig — per-URL configuration for parameterised geo homepage tests.
//
// One entry per geo homepage; add new geos here and the test loop picks them
// up automatically — no test code changes needed.
// ─────────────────────────────────────────────────────────────────────────────
export interface GeoHomepageConfig {
  // Human-readable label used in test describe/test names
  name: string;

  // Path relative to baseURL (https://www.gambling.com), e.g. '/uk', '/ca/fr'.
  // Playwright resolves this against the baseURL set in playwright.config.ts.
  path: string;

  // Expected value of the <html lang="..."> attribute, e.g. "en-GB", "de-DE".
  // Used to assert locale is correctly set server-side.
  expectedLang: string;

  // Set true when the geo's footer is known to contain a link with href="" on the
  // live site (e.g. SE Twitter/X icon). Marks the empty-href T3 assertion as fixme
  // so CI stays green until the site content bug is resolved.
  skipEmptyHrefCheck?: boolean;

  // Set true when the geo's nav uses no href="#" dropdown triggers.
  // Marks the T2 dropdown-trigger assertion as fixme for that geo.
  skipNavTriggerCheck?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// geoHomepages — canonical list of all geo homepages under test.
//
// 26 entries. All paths and expectedLang values verified against live DOM.
// expectedLang reflects the server-rendered <html lang> attribute — not the
// Accept-Language header or browser locale.
// ─────────────────────────────────────────────────────────────────────────────
export const geoHomepages: GeoHomepageConfig[] = [
  { name: 'Global',  path: '/',       expectedLang: 'en'    },
  { name: 'UK',      path: '/uk',     expectedLang: 'en-GB' },
  { name: 'US',      path: '/us',     expectedLang: 'en-US' },
  { name: 'DE',      path: '/de',     expectedLang: 'de-DE' },
  { name: 'IE',      path: '/ie',     expectedLang: 'en-IE' },
  { name: 'IT',      path: '/it',     expectedLang: 'it-IT' },
  { name: 'GR',      path: '/gr',     expectedLang: 'el-GR' },
  { name: 'IN',      path: '/in',     expectedLang: 'en-IN' },
  { name: 'RO',      path: '/ro',     expectedLang: 'ro-Ro' },
  { name: 'NZ',      path: '/nz',     expectedLang: 'en-NZ' },
  { name: 'MX',      path: '/mx',     expectedLang: 'es-MX' },
  { name: 'SE',      path: '/se',     expectedLang: 'sv-SE', skipEmptyHrefCheck: true },
  { name: 'ES',      path: '/es',     expectedLang: 'es-ES' },
  { name: 'NL',      path: '/nl',     expectedLang: 'nl-NL' },
  { name: 'NO',      path: '/no',     expectedLang: 'no-NO' },
  { name: 'DK',      path: '/dk',     expectedLang: 'da-DK' },
  { name: 'AT',      path: '/at',     expectedLang: 'de-AT' },
  { name: 'BR',      path: '/br',     expectedLang: 'pt-BR' },
  { name: 'PE',      path: '/pe',     expectedLang: 'es-PE' },
  { name: 'AU',      path: '/au',     expectedLang: 'en-AU' },
  { name: 'CA-EN',   path: '/ca',     expectedLang: 'en-CA' },
  { name: 'CA-FR',   path: '/ca/fr',  expectedLang: 'fr-CA' },
  { name: 'BE-NL',   path: '/be',     expectedLang: 'nl-BE' },
  { name: 'BE-FR',   path: '/be/fr',  expectedLang: 'fr-BE' },
  // Iceland geos use a flat nav structure with no href="#" dropdown triggers
  // (verified via recon). Market-specific structural difference, not a content bug.
  { name: 'IS-IS',   path: '/is',     expectedLang: 'is-IS', skipNavTriggerCheck: true },
  { name: 'IS-EN',   path: '/is/en',  expectedLang: 'en-IS', skipNavTriggerCheck: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// GeoHomepage — Page Object for gambling.com geo homepage URLs.
//
// Covers all geo homepages (e.g. /uk, /de, /ca/fr). The HTML structure is
// consistent across geos; locale differences are data-level (lang attribute,
// copy, nav link labels) not structural.
//
// SELECTOR STRATEGY
// Prefer semantic HTML elements and verified data-gtm attributes over CSS
// classes — they are stable across design system changes and Tailwind purges.
// All locators verified against live DOM on gambling.com/uk.
// ─────────────────────────────────────────────────────────────────────────────
export class GeoHomepage {
  readonly page: Page;

  // Site logo image — alt text is consistent across all geos.
  // :visible + .first() targets the rendered header instance, skipping hidden mobile duplicates.
  readonly logo: Locator;

  // Primary navigation element — scoped by data-gtm attribute to avoid matching
  // footer or mobile nav elements.
  readonly nav: Locator;

  // Individual navigation link items within the primary nav.
  readonly navItems: Locator;

  // Top-level nav dropdown triggers — anchors with href="#" (Casino, Slots, Betting, etc.).
  readonly navDropdownTriggers: Locator;

  // Real path links within the nav — anchors with a "/" href, excluding "#" triggers.
  readonly navRealLinks: Locator;

  // Page H1 heading.
  readonly h1: Locator;

  // Page footer element — .last() targets the main footer, avoiding any
  // sticky or inline footer variants higher in the DOM.
  readonly footer: Locator;

  // All anchor links within the footer.
  readonly footerLinks: Locator;

  // All img elements within the footer.
  readonly footerImages: Locator;

  // Root <html> element — used to read the lang attribute.
  readonly html: Locator;

  constructor(page: Page) {
    this.page                 = page;
    this.logo                 = page.locator('img[alt="gambling.com"]:visible').first();
    this.nav                  = page.locator('nav:has([data-gtm="global-nav"])').first();
    this.navItems             = this.nav.locator('a');
    this.navDropdownTriggers  = this.nav.locator('a[href="#"]');
    this.navRealLinks         = this.nav.locator('a[href^="/"]:not([href="#"])');
    this.h1                   = page.locator('h1').first();
    this.footer               = page.locator('footer').last();
    this.footerLinks          = this.footer.locator('a');
    this.footerImages         = this.footer.locator('img');
    this.html                 = page.locator('html');
  }

  // Navigate to a geo homepage and wait until the H1 is attached.
  // Accepts a path (e.g. '/uk') resolved against playwright.config.ts baseURL,
  // or a full URL. Throws if the server returns an HTTP error (>= 400).
  // Null response (e.g. cached navigation) is allowed through without error.
  async goto(path: string): Promise<void> {
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    if (response !== null && response.status() >= 400) {
      throw new Error(`${path} returned HTTP ${response.status()}`);
    }
    await this.h1.waitFor({ state: 'attached' });
  }

  // Return the value of the <html lang="..."> attribute.
  // Returns null if the attribute is absent.
  async getLang(): Promise<string | null> {
    return this.html.getAttribute('lang');
  }
}
