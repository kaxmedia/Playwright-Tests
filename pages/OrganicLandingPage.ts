import { type Page, type Locator, type Response } from '@playwright/test';
import { acceptCookiesIfShown } from '../fixtures/acceptCookies';

/**
 * Verified IE organic entry URLs (live DOM, Jun 2026).
 * `/ie/slots/starburst` 404s — IE slot reviews live under `/ie/online-casinos/slots/{slug}`.
 */
export const ORGANIC_LANDING = {
  slotReviewUrl: 'https://www.gambling.com/ie/online-casinos/slots/starburst',
  casinoReviewSlug: 'kingmaker',
  casinoReviewUrl: 'https://www.gambling.com/ie/online-casinos/kingmaker',
  comparisonUrl: 'https://www.gambling.com/ie/online-casinos',
  /**
   * Preferred long-form news article with an in-content oplist.
   * Short brand briefs (e.g. single-operator promo pieces) often have only one /go/
   * and no `.operator-item` blocks — Journey 1.4 falls back to a hub scan when needed.
   */
  newsArticleSlug: 'troy-parrott-next-club-odds',
  newsArticleUrl: 'https://www.gambling.com/ie/news/troy-parrott-next-club-odds',
  newsHubUrl: 'https://www.gambling.com/ie/news',
  strategyHubUrl: 'https://www.gambling.com/ie/strategy',
} as const;

const retryDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class OrganicLandingPage {
  readonly page: Page;

  // Journey 1.1 — slot review
  readonly slotHeading: Locator;
  readonly slotReviewOplist: Locator;
  /** Wraps the “Related Slot Games” carousel (not `[class*="related"]` — unused on live template). */
  readonly relatedSlotGamesSection: Locator;
  readonly relatedSlotCarousel: Locator;

  // Journey 1.4 — news article in-content commercial
  readonly articleInContentGoLinks: Locator;
  readonly articleOperatorBlocks: Locator;

  // Journey 1.5 — strategy hub
  readonly strategyArticleLinks: Locator;

  constructor(page: Page) {
    this.page = page;

    this.slotHeading = page.locator('main h1').first();
    // Desktop-visible demo oplist — `#oplist-slots` is a hidden mobile duplicate.
    this.slotReviewOplist = page.locator('#op-list-slot-demo, .slot-review-offer.game-demo-oplist').first();
    this.relatedSlotGamesSection = page
      .locator('div.my-5:has(.gdc-v-slot-games-carousel)')
      .filter({ hasText: 'Related Slot Games' });
    this.relatedSlotCarousel = this.relatedSlotGamesSection.locator('.gdc-v-slot-games-carousel');

    this.articleInContentGoLinks = page.locator('main a[href*="/go/"]');
    this.articleOperatorBlocks = page.locator('main .operator-item, main .operator-item-v2');

    this.strategyArticleLinks = page.locator(
      'main a[href*="/online-casinos/strategy/"], main a[href*="/strategy/"]'
    );
  }

  async goto(url: string): Promise<Response | null> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await this.dismissCookies();
        return response;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await retryDelay(1000 * attempt);
      }
    }
    throw lastError;
  }

  /** True when the article body has a real in-content oplist (not a single brand CTA). */
  async hasCommercialArticleMarkup(): Promise<boolean> {
    const goCount = await this.articleInContentGoLinks.count();
    const opCount = await this.articleOperatorBlocks.count();
    return goCount >= 3 && opCount >= 1;
  }

  /**
   * Open a news article that still carries in-content commercial blocks.
   * Prefers `ORGANIC_LANDING.newsArticleUrl`, then scans the IE news hub.
   */
  async gotoCommercialNewsArticle(): Promise<Response | null> {
    const preferred = await this.goto(ORGANIC_LANDING.newsArticleUrl);
    if (await this.hasCommercialArticleMarkup()) return preferred;

    await this.goto(ORGANIC_LANDING.newsHubUrl);
    const hrefs = await this.page.locator('a[href*="/ie/news/"]').evaluateAll((els) =>
      [...new Set(els.map((el) => (el as HTMLAnchorElement).href))]
        .filter((href) => /\/ie\/news\/[^/?#]+/.test(href) && !/\/ie\/news\/?$/.test(href))
        .slice(0, 20),
    );

    for (const href of hrefs) {
      const response = await this.goto(href);
      if (await this.hasCommercialArticleMarkup()) return response;
    }

    throw new Error(
      'Expected at least one IE news article with ≥3 in-content /go/ links and an operator block',
    );
  }

  async dismissCookies(): Promise<void> {
    await acceptCookiesIfShown(this.page);
  }
}
