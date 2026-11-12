// Page Object for Responsible Gambling pages on gambling.com.
//
// Paths are geo-specific (see responsibleGamblingGeos). UK/IE/US share the global
// /responsible hub; DE/NL/ES use localised slugs. Footer regulatory logos (GamStop, etc.)
// live on geo homepages — use footerRegulatoryLink() after visiting entryPath.

import { type Page, type Locator, type Response } from '@playwright/test';
import { acceptCookiesIfShown } from '../fixtures/acceptCookies';

export interface ResponsibleGamblingGeoConfig {
  name: string;
  path: string;
  urlPattern: RegExp;
  /** Geo homepage used to reach footer-only regulatory links (optional). */
  entryPath?: string;
}

/** Canonical RG routes — verified against live site (May 2026). */
export const responsibleGamblingGeos: Record<string, ResponsibleGamblingGeoConfig> = {
  '': { name: 'Global', path: '/responsible', urlPattern: /\/responsible(?:\/|$)/ },
  uk: { name: 'UK', path: '/responsible', urlPattern: /\/responsible(?:\/|$)/, entryPath: '/uk' },
  ie: { name: 'IE', path: '/responsible', urlPattern: /\/responsible(?:\/|$)/, entryPath: '/ie' },
  de: { name: 'DE', path: '/de/verantwortung', urlPattern: /\/de\/verantwortung/, entryPath: '/de' },
  nl: { name: 'NL', path: '/nl/verantwoord-gokken', urlPattern: /\/nl\/verantwoord-gokken/ },
  es: { name: 'ES', path: '/es/juego-responsable', urlPattern: /\/es\/juego-responsable/ },
  gr: { name: 'GR', path: '/gr/ypefthino-paixnidi', urlPattern: /\/gr\/ypefthino-paixnidi/ },
  // BE added for GDCU-9302 (footer age-logo geo coverage) — shares NL's Dutch-language
  // RG slug, verified live (Nov 2026): https://www.gambling.com/be/verantwoord-gokken
  be: { name: 'BE', path: '/be/verantwoord-gokken', urlPattern: /\/be\/verantwoord-gokken/ },
};

/**
 * Expected minimum-age logo per geo, per the Jira ticket's "Correct Age" field
 * (GDCU-9302: GR 21+, BE 21+, NL 24+). Keyed by the digits only, since the live
 * alt text format is inconsistent between geos ("21+" on BE, "+21" on GR/NL).
 */
export const footerAgeLogoExpectedAge: Partial<Record<string, string>> = {
  gr: '21',
  be: '21',
  nl: '24',
};

/** @audit HTTP 200 sweep — derived from {@link responsibleGamblingGeos} (no manual duplicate list). */
export const responsibleGamblingAuditPaths: { name: string; path: string }[] = Object.values(
  responsibleGamblingGeos,
).map(({ name, path }) => ({ name, path }));

const SAFEGUARDING_HEADING_PATTERN =
  /stay in control|protection and support|behalt.*kontrolle|schutz und unterstützung|blijf.*controle|bescherming|mantén el control|juego responsable|self[\s-]?exclu/i;

export class ResponsibleGamblingPage {
  readonly page: Page;

  readonly main: Locator;
  readonly heading: Locator;
  /** Core safeguarding content block (localised “stay in control” / protection headings). */
  readonly safeguardingSection: Locator;
  readonly footer: Locator;
  /** Disclaimer paragraph above the footer regulatory/age logos (GDCU-9302). */
  readonly footerDisclaimer: Locator;

  private readonly geoConfig: ResponsibleGamblingGeoConfig;

  constructor(page: Page, geo = '') {
    this.page = page;
    this.geoConfig = responsibleGamblingGeos[geo] ?? responsibleGamblingGeos[''];

    this.main = page.locator('main, [role="main"]').first();
    this.heading = this.main.locator('h1').first();
    this.safeguardingSection = this.sectionHeading(SAFEGUARDING_HEADING_PATTERN);
    this.footer = page.locator('footer, [role="contentinfo"]').last();
    this.footerDisclaimer = page.locator('p.disclaimer').first();
  }

  get config(): ResponsibleGamblingGeoConfig {
    return this.geoConfig;
  }

  async goto(geo = ''): Promise<void> {
    const cfg = responsibleGamblingGeos[geo] ?? responsibleGamblingGeos[''];
    const response = await this.page.goto(cfg.path, { waitUntil: 'domcontentloaded' });
    this.assertOkResponse(response, cfg.path);
    await this.dismissCookieBanner();
  }

  async gotoEntryHome(): Promise<void> {
    const entry = this.geoConfig.entryPath ?? '/';
    const response = await this.page.goto(entry, { waitUntil: 'domcontentloaded' });
    this.assertOkResponse(response, entry);
    await this.dismissCookieBanner();
  }

  async gotoProtectionAndSupport(): Promise<void> {
    const path = '/responsible/protection-and-support';
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    this.assertOkResponse(response, path);
    await this.dismissCookieBanner();
  }

  /**
   * Navigate to this geo's RG page with a `?ipcountry=` override applied.
   *
   * GDCU-9302: the footer age logo and the disclaimer above it used to follow
   * the *visitor's* IP-geolocated country instead of the page's own geo. The
   * fix (Sept 2026) makes both always reflect the page's own geo regardless
   * of `ipcountry` — confirmed live Nov 2026 via `?ipcountry=<other geo>`.
   */
  async gotoWithIpCountryOverride(geo: string, ipcountry: string): Promise<void> {
    const cfg = responsibleGamblingGeos[geo] ?? responsibleGamblingGeos[''];
    const path = `${cfg.path}?ipcountry=${encodeURIComponent(ipcountry)}`;
    const response = await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    this.assertOkResponse(response, path);
    await this.dismissCookieBanner();
  }

  /**
   * Alt text of the footer's minimum-age logo (e.g. "21+", "+24"), or null if
   * no such image is found. Format (prefix vs suffix "+") varies by geo, so
   * callers should compare digits only — see {@link footerAgeLogoExpectedAge}.
   */
  async footerAgeLogoAlt(): Promise<string | null> {
    const imgs = this.page.locator('img[alt]');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const alt = ((await imgs.nth(i).getAttribute('alt')) ?? '').trim();
      if (/^\+?\d{2}\+?$/.test(alt)) return alt;
    }
    return null;
  }

  externalOrganisationLink(domainFragment: string): Locator {
    return this.page.locator(`a[href*="${domainFragment}"]`).first();
  }

  footerRegulatoryLink(domainFragment: string): Locator {
    return this.page.locator(`footer a[href*="${domainFragment}"], [role="contentinfo"] a[href*="${domainFragment}"]`).first();
  }

  /** In-page or footer link matched by visible label (localised RG org names). */
  linkByText(text: string | RegExp): Locator {
    return this.page.getByRole('link', { name: text }).first();
  }

  /** Section heading in the article body — used for safeguarding block checks. */
  sectionHeading(text: string | RegExp): Locator {
    return this.page.locator('h2, h3').filter({ hasText: text }).first();
  }

  private assertOkResponse(response: Response | null, path: string): void {
    if (response !== null && response.status() >= 400) {
      throw new Error(`Responsible Gambling page at ${path} returned HTTP ${response.status()}`);
    }
  }

  private async dismissCookieBanner(): Promise<void> {
    await acceptCookiesIfShown(this.page);
  }
}
