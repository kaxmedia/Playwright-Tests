// Tests for individual bookmaker review pages on gambling.com.
// These pages are accessed via a slug in the URL, e.g. /ie/online-casinos/bet365.
// We use 'bet365' as the test slug — the same structure applies to all review pages.
//
// NOTE ON THE CTA BUTTON:
// The CTA button ("Visit Bet365") is an affiliate link that opens the bookmaker's
// site in a new tab. Clicking it in tests has been approved. We click it and verify
// that the new tab opens and its URL routes through gambling.com's /go/ redirect path.

import { test, expect } from '@playwright/test';

// Import the ReviewPage object — it holds all locators and the goto() action
import { ReviewPage } from '../pages/ReviewPage';

// The bookmaker slug we use for all tests in this file
const TEST_SLUG = 'bet365';

// The expected bookmaker name that should appear in the page title
const BOOKMAKER_NAME = 'Bet365';

test.describe('Bookmaker Review Page', () => {

  // -------------------------------------------------------------------------
  // Test 1: The page loads and the title contains the bookmaker's name
  // -------------------------------------------------------------------------
  test('review page loads with correct title', async ({ page }) => {
    // Create an instance of ReviewPage, passing in the current browser tab
    const reviewPage = new ReviewPage(page);

    // Navigate to the bet365 review page using the slug
    await reviewPage.goto(TEST_SLUG);

    // Read the page title (the text shown in the browser tab)
    const title = await page.title();

    // Assert that the title contains the bookmaker's name — confirms we landed on the right page
    expect(title).toContain(BOOKMAKER_NAME);
  });

  // -------------------------------------------------------------------------
  // Test 2: The rating card section is visible on the page
  // -------------------------------------------------------------------------
  test('rating element is visible', async ({ page }) => {
    // Create an instance of ReviewPage, passing in the current browser tab
    const reviewPage = new ReviewPage(page);

    // Navigate to the bet365 review page
    await reviewPage.goto(TEST_SLUG);

    // Assert that the rating card (showing "Our Rating" and the score) is visible
    // This confirms the review content has loaded correctly
    await expect(reviewPage.ratingContainer).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Test 3: The CTA button is visible, and clicking it opens a new tab that
  // routes through gambling.com's /go/ affiliate redirect path
  // -------------------------------------------------------------------------
  test('CTA button is visible and clicking it opens the affiliate redirect in a new tab', async ({ page }) => {
    // Create an instance of ReviewPage, passing in the current browser tab
    const reviewPage = new ReviewPage(page);

    // Navigate to the bet365 review page
    await reviewPage.goto(TEST_SLUG);

    // Assert that the "Visit Bet365" button is visible on the page
    await expect(reviewPage.ctaButton).toBeVisible();

    // Click the CTA and capture the new tab that opens (target="_blank")
    // The clickCtaAndGetNewTab() method handles the popup listener for us
    const newTab = await reviewPage.clickCtaAndGetNewTab();

    // Read the URL of the new tab — this is the full resolved URL after any redirects
    const newTabUrl = newTab.url();

    // Assert that the new tab's URL contains the affiliate tracking parameter.
    // The /go/ redirect resolves instantly, so by the time we read the URL we are
    // already on the bookmaker's site. The 'affiliate=' parameter in the final URL
    // confirms that gambling.com's affiliate redirect fired correctly.
    expect(newTabUrl).toContain('affiliate=');

    // Close the new tab cleanly after the assertion
    await newTab.close();
  });

});
