// ─────────────────────────────────────────────────────────────────────────────
// Cookie Banner Fixture — gambling.com uses CookieYes (cdn-cookieyes.com)
//
// WHY A FIXTURE?
// The cookie consent banner appears on every first visit. Any test that lands
// on the site with a fresh browser context will see it. Rather than each test
// file handling the banner individually, this fixture provides a single, shared
// set of helpers that any test can opt into.
//
// HOW TO USE IN YOUR TESTS:
// Instead of:   import { test, expect } from '@playwright/test';
// Write:        import { test, expect } from '../fixtures/cookieBanner';
// Then add `cookieBanner` to your test arguments:
//   test('my test', async ({ page, cookieBanner }) => { ... })
//
// ⚠️  HEADED MODE REQUIRED
// CookieYes suppresses the banner in headless mode (bot detection).
// Run with: npx playwright test --headed
// Or:       npm run test:headed
//
// ─────────────────────────────────────────────────────────────────────────────
//
// TODO (follow-up PR): Add a rejectCookies() helper that:
//   1. Clicks "Customise" on the banner
//   2. Turns off all 5 optional category toggles (Functional, Analytics,
//      Performance, Advertisement, Uncategorized)
//   3. Clicks "Save My Preferences"
// This is deferred because the Customise panel is a full granular settings
// modal with 5 individual toggles — too complex to automate reliably in this
// sprint. It is GDPR-compliance-important and must be the next cookie PR.
//
// ─────────────────────────────────────────────────────────────────────────────

import { test as base, expect, type Locator } from '@playwright/test';

// Define the shape of what our fixture provides to tests
type CookieBannerFixtures = {
  cookieBanner: {
    // The outer banner container — use this to assert the banner is visible
    banner: Locator;

    // The "Accept All" button inside the banner
    acceptButton: Locator;

    // The "Cookie Policy" link inside the banner
    cookiePolicyLink: Locator;

    // Clicks "Accept All" and waits for the banner to disappear.
    // Use this at the start of any test that does not care about the banner
    // and just needs it out of the way.
    acceptCookies: () => Promise<void>;
  };
};

// Extend Playwright's base test with our cookie banner helpers.
// Exporting `test` and `expect` means test files only need to change one line.
export const test = base.extend<CookieBannerFixtures>({
  cookieBanner: async ({ page }, use) => {

    // Define the locators once — all helpers below share these
    const banner      = page.locator('.cky-consent-container');
    const acceptButton = page.getByRole('button', { name: 'Accept All' });
    const cookiePolicyLink = page.getByRole('link', { name: 'Cookie Policy' });

    // The acceptCookies action — clicks Accept All and waits for banner to go
    const acceptCookies = async () => {
      // Click the Accept All button to give consent
      await acceptButton.click();
      // Wait until the banner is no longer visible before continuing
      await banner.waitFor({ state: 'hidden' });
    };

    // Hand the helpers to the test — they are available for the test's lifetime
    await use({ banner, acceptButton, cookiePolicyLink, acceptCookies });
  },
});

// Re-export expect so tests only need one import line
export { expect };
