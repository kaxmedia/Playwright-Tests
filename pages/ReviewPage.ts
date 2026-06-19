// Page Object for individual bookmaker/casino review pages on gambling.com.
// These pages follow a consistent slug-based URL pattern:
// e.g. https://www.gambling.com/ie/online-casinos/bet365
//      https://www.gambling.com/ie/online-casinos/paddy-power
//
// The site renders two copies of the rating card and CTA button — one for
// mobile (hidden on desktop) and one for desktop (visible on desktop).
// We always target the LAST match with .last() to get the visible desktop version.
//
// EXTENDED (May 2026): additional locators added for deeper review page coverage —
// pros/cons, bonus offer box, breadcrumb, author byline, review images, related
// reviews widget, and JSON-LD structured data helpers.

import { type Page, type Locator, type Response } from '@playwright/test';

export class ReviewPage {

  readonly page: Page;

  // The base URL for all casino review pages (IE geo used as primary test target)
  readonly baseUrl = 'https://www.gambling.com/ie/online-casinos';

  // ── Existing locators ─────────────────────────────────────────────────────

  // The rating card section — shows "Our Rating" and the bookmaker's score (e.g. 7.4)
  // Two exist in the DOM (mobile + desktop); .last() targets the desktop-visible one
  readonly ratingContainer: Locator;

  // The main "Visit" CTA button — an affiliate link that opens the bookmaker's site
  // Two exist in the DOM (mobile + desktop); .last() targets the desktop-visible one
  readonly ctaButton: Locator;

  // ── Extended locators ─────────────────────────────────────────────────────

  // Numeric rating score in the first "Our Rating" row of the rating card
  readonly ratingScore: Locator;

  // Pros list — the "✓ Pros" section of the review card
  // GDC uses a consistent list structure for pros items across all reviews
  readonly prosList: Locator;

  // Cons list — the "✗ Cons" section of the review card
  readonly consList: Locator;

  // The bonus/offer box — shows the current welcome bonus text for the operator
  // This is the prominent bonus callout near the top of every review page
  readonly bonusOfferBox: Locator;

  // The "Claim Bonus" or "Get Bonus" CTA inside the bonus offer box
  // Distinct from the main ctaButton — this one is inside the offer block
  readonly bonusCtaLink: Locator;

  // Breadcrumb navigation — the "Home > Casinos > Bet365" trail at the top of the page
  readonly breadcrumb: Locator;

  // Individual breadcrumb links — used to check hierarchy depth and link validity
  readonly breadcrumbLinks: Locator;

  // Author byline — the expert reviewer's name shown below the review title
  // GDC review pages show a named author with a "Reviewed by" or "Written by" label
  readonly authorByline: Locator;

  // Review body images — screenshots or operator images inside the article body
  // Used to check at least one content image loads (no broken src)
  readonly reviewImages: Locator;

  // "Related reviews" / "You might also like" widget at the bottom of the page
  // Shows links to other operator reviews — important for internal linking health
  readonly relatedReviewsWidget: Locator;

  constructor(page: Page) {
    this.page = page;

    // ── Existing ──────────────────────────────────────────────────────────
    const casinoRatingContainer = page.locator('div[class*="bg-gdc-gray-200"]').last();
    const bettingRatingContainer = page.locator(
      'main.body_content:not(:has(div[class*="bg-gdc-gray-200"])) .user-review-rating-component'
    ).first();
    this.ratingContainer = casinoRatingContainer.or(bettingRatingContainer);
    this.ctaButton = page.locator('a.btn-cta-play-now').last();

    // ── Extended ──────────────────────────────────────────────────────────

    // Rating score — casino reviews use the gray rating card; betting reviews use
    // the user-review-rating block (only when the gray card is absent).
    const casinoRatingScore = casinoRatingContainer.locator('div.flex').first().locator('span').first();
    const bettingRatingScore = bettingRatingContainer.locator('span.font-bold').first();
    this.ratingScore = casinoRatingScore.or(bettingRatingScore);

    // Pros/cons — review hero uses `.pros-and-cons-table-component` with two <ul> lists
    const prosConsSection = page.locator('.pros-and-cons-table-component').first();
    this.prosList = prosConsSection.locator('ul').first().locator('li');
    this.consList = prosConsSection.locator('ul').last().locator('li');

    // Bonus offer — hero operator strip at top of review (operator-item-v2 layout)
    const heroOperator = page.locator('.operator-item-v2').first();
    this.bonusOfferBox = heroOperator.locator(
      '.operator-column-bonus-v2, .offer-description'
    ).first();

    // Bonus CTA — affiliate link on the offer text inside the hero strip
    this.bonusCtaLink = heroOperator.locator('a.operator-item__offer_link[href*="/go/"]').first();

    // Breadcrumb — live IE reviews use nav#breadcrumb.automation-breadcrumb
    this.breadcrumb = page.locator(
      'nav#breadcrumb, nav.automation-breadcrumb, nav[aria-label*="breadcrumb" i], ol[itemtype*="BreadcrumbList"]'
    ).first();

    this.breadcrumbLinks = this.breadcrumb.locator('a');

    // Author byline — "Reviewed by [Name]" block below the review title
    this.authorByline = page.locator('main').getByText(/reviewed by|written by/i).first();

    // Review images — <img> tags inside the main article/review body, excluding logos
    // Scoped to <main> or [class*="article"] to avoid nav/footer images
    this.reviewImages = page.locator(
      'main img[src*="objects.kaxmedia"], main img[class*="review"], article img'
    );

    // Related operators — geo-specific "More {Country} Casino Sites" section at page bottom
    this.relatedReviewsWidget = page.locator('section').filter({
      has: page.getByRole('heading', { name: /more .+ casino sites/i }),
    }).first();
  }

  // Navigate to a bookmaker review page using the site's slug pattern.
  // Pass just the slug — e.g. 'bet365', 'paddy-power', 'william-hill'
  async goto(slug: string): Promise<void> {
    await this.gotoUrl(`${this.baseUrl}/${slug}`);
  }

  // Navigate to a review page at a fully-specified URL.
  // Used for non-IE geos or betting review pages (e.g. /uk/betting-sites/bet365).
  async gotoUrl(url: string): Promise<Response | null> {
    const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    return response;
  }

  // Clicks the main CTA button and returns the new tab that opens.
  // The CTA has target="_blank" so it opens in a popup (new browser tab).
  async clickCtaAndGetNewTab() {
    const popupPromise = this.page.context().waitForEvent('page');
    await this.ctaButton.click();
    const newTab = await popupPromise;
    await newTab.waitForLoadState('domcontentloaded');
    return newTab;
  }

  // Returns all JSON-LD <script> blocks on the page as parsed objects.
  // Used to verify structured data (Review schema, BreadcrumbList, etc.) is present.
  async getJsonLdBlocks(): Promise<Record<string, unknown>[]> {
    const blocks = await this.page.locator('script[type="application/ld+json"]').all();
    const parsed: Record<string, unknown>[] = [];
    for (const block of blocks) {
      try {
        const text = await block.textContent();
        if (text) parsed.push(JSON.parse(text) as Record<string, unknown>);
      } catch {
        // Skip malformed blocks — test can assert on the resulting array length
      }
    }
    return parsed;
  }

  // Returns a section heading locator by text — used to verify named review sections
  // exist in the article body (e.g. "Pros and Cons", "Bonuses", "Games").
  sectionHeading(text: string | RegExp): Locator {
    return this.page.locator('h2, h3').filter({ hasText: text }).first();
  }
}
