// ─────────────────────────────────────────────────────────────────────────────
// Cookie Banner Tests — gambling.com / CookieYes
//
// These tests verify that the GDPR cookie consent banner behaves correctly.
// The banner appears on every first visit (fresh browser context, no cookies).
//
// ⚠️  HEADED MODE REQUIRED
// CookieYes detects headless browsers and suppresses the banner.
// Always run this file with: npx playwright test tests/cookie-banner.spec.ts --headed
//
// DEFERRED: The "Customise → Reject All" flow has been deferred to a follow-up PR.
// See fixtures/cookieBanner.ts for the full TODO explaining what is needed.
// ─────────────────────────────────────────────────────────────────────────────

// Import test and expect from our cookie banner fixture — not from @playwright/test.
// This gives us the `cookieBanner` helper in addition to standard Playwright tools.
import { test, expect } from '../fixtures/cookieBanner';

// The URL we test against — banner appears on all gambling.com pages
const HOME_URL = 'https://www.gambling.com';

test.describe('Cookie Banner', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // Test 1: The banner is visible when a user visits for the first time
  //
  // Each Playwright test gets a fresh browser context with no stored cookies,
  // so the banner will always appear here — just as it does for a real new visitor.
  // ───────────────────────────────────────────────────────────────────────────
  test('banner is visible on a fresh visit with no cookies', async ({ page, cookieBanner }) => {
    // Navigate to the homepage — this is a fresh context so no consent cookie exists
    await page.goto(HOME_URL);

    // Wait up to 10 seconds for CookieYes to inject the banner into the page
    await cookieBanner.banner.waitFor({ state: 'visible', timeout: 10000 });

    // Assert the banner container is visible to the user
    await expect(cookieBanner.banner).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 2: The "Accept All" button is visible inside the banner
  //
  // This confirms the primary action the user needs to take is clearly present.
  // ───────────────────────────────────────────────────────────────────────────
  test('Accept All button is visible inside the banner', async ({ page, cookieBanner }) => {
    // Navigate to the homepage to trigger the banner
    await page.goto(HOME_URL);

    // Wait for the banner to load before checking its contents
    await cookieBanner.banner.waitFor({ state: 'visible', timeout: 10000 });

    // Assert the Accept All button is present and visible inside the banner
    await expect(cookieBanner.acceptButton).toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 3: Clicking "Accept All" dismisses the banner
  //
  // After accepting, the banner should disappear completely.
  // This confirms the consent flow works end-to-end.
  // ───────────────────────────────────────────────────────────────────────────
  test('clicking Accept All dismisses the banner', async ({ page, cookieBanner }) => {
    // Navigate to the homepage — banner will appear immediately
    await page.goto(HOME_URL);

    // Wait for the banner to be visible before we interact with it
    await cookieBanner.banner.waitFor({ state: 'visible', timeout: 10000 });

    // Use the fixture's acceptCookies() helper — it clicks Accept All
    // and waits for the banner to disappear before returning
    await cookieBanner.acceptCookies();

    // Assert the banner is no longer visible on the page
    await expect(cookieBanner.banner).not.toBeVisible();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Test 4: The Cookie Policy link is visible inside the banner
  //
  // GDPR requires that a link to the full cookie policy is available directly
  // from the consent banner. This test verifies that requirement is met.
  // ───────────────────────────────────────────────────────────────────────────
  test('Cookie Policy link is visible inside the banner', async ({ page, cookieBanner }) => {
    // Navigate to the homepage to trigger the banner
    await page.goto(HOME_URL);

    // Wait for the banner to load
    await cookieBanner.banner.waitFor({ state: 'visible', timeout: 10000 });

    // Assert the Cookie Policy link is visible — this is a GDPR requirement
    await expect(cookieBanner.cookiePolicyLink).toBeVisible();
  });

});
