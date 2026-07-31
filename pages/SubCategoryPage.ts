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
   * Poll until the operator list reaches `min` (client-side hydration settles), returning the
   * observed count. This is the SINGLE source of truth for both the CI-reduced-fallback skip
   * decision and the count assertion in T3/T4 — so a transient mid-hydration dip can't slip
   * between two independent polls and surface as a false failure. If `min` is never reached
   * within `timeout`, returns the last count seen, which distinguishes the genuine CI-reduced
   * stub (~2 operators, served to datacenter/CI IPs on US /apps & /slots; a real IP shows 18,
   * verified live 2026-07-30) from a transient dip on a full list.
   */
  async operatorCount(min = 3, timeout = 20_000): Promise<number> {
    const deadline = Date.now() + timeout;
    let count = await this.cards.count();
    while (count < min && Date.now() < deadline) {
      await this.page.waitForTimeout(500);
      count = await this.cards.count();
    }

    return count;
  }

  async goto(config: SubCategoryConfig) {
    const url = `${config.geoPath}/online-casinos/${config.slug}`;
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${url}`);
    // Wait until at least one card is visible — `attached` alone races client-side oplist hydrate.
    await this.cards.first().waitFor({ state: 'visible', timeout: 30_000 });
  }
}
