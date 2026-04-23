// Tests for individual bookmaker review pages on gambling.com.
// These pages are accessed via a slug in the URL, e.g. /ie/online-casinos/bet365.
// We use 'bet365' as the test slug — the same structure applies to all review pages.
//
// IMPORTANT AFFILIATE SAFETY RULE:
// The CTA button ("Visit Bet365") is an affiliate link. Clicking it would
// open the bookmaker's site and could trigger commission tracking.
// We ONLY check that the button exists and has the correct href — we never click it.

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
  // Test 3: The CTA button is visible and its href goes through the /go/ path
  //
  // AFFILIATE SAFETY: We check the button exists and verify its href attribute.
  // We do NOT call .click() — doing so would follow the affiliate link.
  // -------------------------------------------------------------------------
  test('CTA button is visible and href points to gambling.com/go/ — not clicked', async ({ page }) => {
    // Create an instance of ReviewPage, passing in the current browser tab
    const reviewPage = new ReviewPage(page);

    // Navigate to the bet365 review page
    await reviewPage.goto(TEST_SLUG);

    // Assert that the "Visit Bet365" button is visible on the page
    await expect(reviewPage.ctaButton).toBeVisible();

    // Read the resolved href from the anchor element (gives full URL, not relative path)
    // e.g. "https://www.gambling.com/go/ie/bet365/casino/play-now?..."
    const href = await reviewPage.ctaButton.evaluate((el: HTMLAnchorElement) => el.href);

    // Assert that the href routes through gambling.com's /go/ affiliate tracking path
    // This confirms it is a valid affiliate link — without ever following it
    expect(href).toContain('gambling.com/go/');
  });

});
