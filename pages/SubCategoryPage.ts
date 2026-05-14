import { Locator, Page } from '@playwright/test';

export interface SubCategoryConfig {
  geo: string;
  geoPath: string;
  slug: string;
}

export const subCategoryUrls: SubCategoryConfig[] = [
  { geo: 'UK', geoPath: '/uk', slug: 'new' },
  { geo: 'IE', geoPath: '/ie', slug: 'new' },
  { geo: 'IN', geoPath: '/in', slug: 'new' },
  { geo: 'NZ', geoPath: '/nz', slug: 'new' },
  { geo: 'CA', geoPath: '/ca', slug: 'new' },
  { geo: 'IE', geoPath: '/ie', slug: 'apps' },
  { geo: 'IN', geoPath: '/in', slug: 'apps' },
  { geo: 'US', geoPath: '/us', slug: 'apps' },
  { geo: 'UK', geoPath: '/uk', slug: 'slots' },
  { geo: 'IE', geoPath: '/ie', slug: 'slots' },
  { geo: 'IN', geoPath: '/in', slug: 'slots' },
  { geo: 'US', geoPath: '/us', slug: 'slots' },
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

  async goto(config: SubCategoryConfig) {
    const url = `${config.geoPath}/online-casinos/${config.slug}`;
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    if (response && response.status() >= 400) throw new Error(`HTTP ${response.status()} for ${url}`);
    await this.cards.first().waitFor({ state: 'attached' });
  }
}
