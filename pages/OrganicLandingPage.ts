import { type Page, type Locator, type Response } from '@playwright/test';

/**
 * Verified IE organic entry URLs (live DOM, Jun 2026).
 * `/ie/slots/starburst` 404s — IE slot reviews live under `/ie/online-casinos/slots/{slug}`.
 */
export const ORGANIC_LANDING = {
  slotReviewUrl: 'https://www.gambling.com/ie/online-casinos/slots/starburst',
  casinoReviewSlug: 'kingmaker',
  casinoReviewUrl: 'https://www.gambling.com/ie/online-casinos/kingmaker',
  comparisonUrl: 'https://www.gambling.com/ie/online-casinos',
  /** Long-form article with in-content operator /go/ links (not a short news brief). */
  newsArticleSlug: 'why-3et-bookmaker-is-sharp-for-football-betting',
  newsArticleUrl:
    'https://www.gambling.com/ie/news/why-3et-bookmaker-is-sharp-for-football-betting',
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

  async dismissCookies(): Promise<void> {
    await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
  }
}
