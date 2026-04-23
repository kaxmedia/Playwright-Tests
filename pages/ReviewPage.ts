// Page Object for individual bookmaker review pages on gambling.com.
// These pages follow a consistent slug-based URL pattern:
// e.g. https://www.gambling.com/ie/online-casinos/bet365
//      https://www.gambling.com/ie/online-casinos/paddy-power
//
// The site renders two copies of the rating card and CTA button — one for
// mobile (hidden on desktop) and one for desktop (visible on desktop).
// We always target the LAST match with .last() to get the visible desktop version.

import { type Page, type Locator } from '@playwright/test';

export class ReviewPage {

  // The Playwright page object — represents the browser tab we are controlling
  readonly page: Page;

  // The base URL for all bookmaker review pages
  readonly baseUrl = 'https://www.gambling.com/ie/online-casinos';

  // The rating card section — shows "Our Rating" and the bookmaker's score (e.g. 7.4)
  // Two exist in the DOM (mobile + desktop); .last() targets the desktop-visible one
  readonly ratingContainer: Locator;

  // The main "Visit" CTA button — an affiliate link that opens the bookmaker's site
  // Two exist in the DOM (mobile + desktop); .last() targets the desktop-visible one
  // IMPORTANT: This link must NEVER be clicked in tests — it is an affiliate link
  readonly ctaButton: Locator;

  constructor(page: Page) {
    // Store the page reference so actions and locators can use it
    this.page = page;

    // Locate the rating card using the custom GDC design-system class 'bg-gdc-gray-200'
    // This class is consistent across all review pages and unique to this section
    this.ratingContainer = page.locator('div[class*="bg-gdc-gray-200"]').last();

    // Locate the CTA button using the stable automation class 'btn-cta-play-now'
    // This class is applied to the main "Visit [Bookmaker]" button on every review page
    this.ctaButton = page.locator('a.btn-cta-play-now').last();
  }

  // Navigates to a bookmaker review page using the site's slug pattern.
  // Pass just the slug — e.g. 'bet365', 'paddy-power', 'william-hill'
  async goto(slug: string) {
    // Build the full URL from the base + the bookmaker's slug
    await this.page.goto(`${this.baseUrl}/${slug}`);
  }

}
