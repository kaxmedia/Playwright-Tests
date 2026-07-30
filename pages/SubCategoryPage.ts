import { Locator, Page } from '@playwright/test';

export interface SubCategoryConfig {
  geo: string;
  geoPath: string;
  slug: string;
  /**
   * Marks geo/slug combos that are served a reduced fallback operator list from datacenter/CI
   * IPs (a real user IP sees the full toplist). Gates the T3/T4 skip — see
   * isReducedOperatorFallback(). Only set on combos confirmed live to hit this restriction.
   */
  ciIpReducedList?: boolean;
}

export const subCategoryUrls: SubCategoryConfig[] = [
  { geo: 'UK', geoPath: '/uk', slug: 'new' },
  { geo: 'IE', geoPath: '/ie', slug: 'new' },
  { geo: 'IN', geoPath: '/in', slug: 'new' },
  { geo: 'NZ', geoPath: '/nz', slug: 'new' },
  { geo: 'CA', geoPath: '/ca', slug: 'new' },
  { geo: 'IE', geoPath: '/ie', slug: 'apps' },
  { geo: 'IN', geoPath: '/in', slug: 'apps' },
  { geo: 'US', geoPath: '/us', slug: 'apps', ciIpReducedList: true },
  { geo: 'UK', geoPath: '/uk', slug: 'slots' },
  { geo: 'IE', geoPath: '/ie', slug: 'slots' },
  { geo: 'IN', geoPath: '/in', slug: 'slots' },
  { geo: 'US', geoPath: '/us', slug: 'slots', ciIpReducedList: true },
  { geo: 'BE', geoPath: '/be', slug: 'slots' },
  { geo: 'UK', geoPath: '/uk', slug: 'paypal' },
  { geo: 'IE', geoPath: '/ie', slug: 'paypal' },
  { geo: 'DE', geoPath: '/de', slug: 'paypal' },
  { geo: 'NL', geoPath: '/nl', slug: 'paypal' },
  { geo: 'NZ', geoPath: '/nz', slug: 'paypal' },
  { geo: 'CA', geoPath: '/ca', slug: 'paypal' },
  { geo: 'UK', geoPath: '/uk', slug: 'paysafecard' },
  { geo: 'IE', geoPath: '/ie', slug: 'paysafecard' },
  { geo: 'DE', geoPath: '/de', slug: 'paysafecard' },
  { geo: 'NZ', geoPath: '/nz', slug: 'paysafecard' },
  { geo: 'BE', geoPath: '/be', slug: 'paysafecard' },
  { geo: 'UK', geoPath: '/uk', slug: 'fastest-withdrawal' },
  { geo: 'US', geoPath: '/us', slug: 'fastest-withdrawal' },
  { geo: 'IN', geoPath: '/in', slug: 'live' },
];

export class SubCategoryPage {
  readonly h1: Locator;
  readonly cards: Locator;
  readonly footer: Locator;
  readonly cardLinks: Locator;

  constructor(public readonly page: Page) {
    this.h1        = page.locator('h1').first();
    this.cards     = page.locator('li.operator-item');
    this.footer    = page.locator('footer').last();
    this.cardLinks = this.cards.locator('a.operator-item__cta_link');
  }

  /**
   * True when the page is showing the known CI-IP reduced/fallback operator list (fewer than the
   * required 3) rather than the full toplist. Certain US sub-category pages (/apps, /slots) are
   * served a stub list (~2 operators) from datacenter/CI IPs, while a real user IP sees the full
   * list (18, verified live 2026-07-30). Mirrors TournamentsPage::hasActiveTournament() — used to
   * skip the count/CTA assertions ONLY on the combos flagged ciIpReducedList when the fallback is
   * actually present (so a real IP, which shows 18, still runs the assertions).
   */
  async isReducedOperatorFallback(): Promise<boolean> {
    // Give the client-side oplist time to hydrate before deciding — a geo page can attach the
    // first card early, so a single immediate count could read transiently low even on a full
    // list. Poll (multiple samples) until it reaches the full-list threshold; if it never does,
    // this is the known reduced fallback state.
    const deadline = Date.now() + 8_000;
    while (Date.now() < deadline) {
      if ((await this.cards.count()) >= 3) return false;
      await this.page.waitForTimeout(500);
    }
    return true;
  }

  async goto(config: SubCategoryConfig) {
    const url = `${config.geoPath}/online-casinos/${config.slug}`;
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${url}`);
    // Wait until at least one card is visible — `attached` alone races client-side oplist hydrate.
    await this.cards.first().waitFor({ state: 'visible', timeout: 30_000 });
  }
}
