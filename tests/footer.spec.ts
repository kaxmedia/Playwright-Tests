// ─────────────────────────────────────────────────────────────────────────────
// Footer Tests — gambling.com
//
// These tests verify that the footer renders correctly, compliance links are
// present and point to live pages, the copyright year is up to date, and no
// footer links are broken.
//
// Run with:  npx playwright test tests/footer.spec.ts --headed --project=chrome
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';
import { FooterPage } from '../pages/FooterPage';

// The base URL used to turn relative hrefs (e.g. /terms-and-conditions) into full URLs
const BASE_URL = 'https://www.gambling.com';

test.describe('Footer', () => {
  let footerPage: FooterPage;

  // Before every test: go to the homepage and scroll down to the footer
  test.beforeEach(async ({ page }) => {
    footerPage = new FooterPage(page);
    await footerPage.goto();
    await footerPage.scrollToFooter();
  });

  // ─── Smoke tests ─────────────────────────────────────────────────────────────

  // Test 1: The footer element itself is present and visible on the page
  test('@smoke footer is visible', async () => {
    await expect(footerPage.footer).toBeVisible();
  });

  // Test 2: The "Responsible Gambling" compliance link is in the footer and href is correct
  test('@smoke Responsible Gambling link is visible and href contains /responsible', async () => {
    // Scroll the link into view in case it is below the initial scroll position
    await footerPage.responsibleGamblingLink.scrollIntoViewIfNeeded();
    // Assert the link is visible to the user
    await expect(footerPage.responsibleGamblingLink).toBeVisible();
    // Assert the href points to the responsible gambling page
    await expect(footerPage.responsibleGamblingLink).toHaveAttribute('href', /\/responsible/);
  });

  // Test 3: "Terms and Conditions" link is visible, href is correct, and the page actually exists (200)
  test('@smoke Terms and Conditions link is visible, href is correct, and page returns 200', async ({ request }) => {
    // Scroll the link into view
    await footerPage.termsLink.scrollIntoViewIfNeeded();
    // Assert the link is visible on the page
    await expect(footerPage.termsLink).toBeVisible();
    // Read the href value from the link element
    const href = await footerPage.termsLink.getAttribute('href');
    // Assert the href path is correct
    expect(href).toMatch(/\/terms-and-conditions/);
    // Build the full URL — hrefs can be relative (e.g. /terms-and-conditions) or absolute
    const url = href!.startsWith('http') ? href! : `${BASE_URL}${href}`;
    // Fetch the URL with an HTTP GET request and assert the server returns 200 OK
    const response = await request.get(url);
    expect(response.status()).toBe(200);
  });

  // Test 4: "Privacy and Cookies Policy" link is visible, href is correct, and the page actually exists (200)
  test('@smoke Privacy and Cookies Policy link is visible, href is correct, and page returns 200', async ({ request }) => {
    // Scroll the link into view
    await footerPage.privacyLink.scrollIntoViewIfNeeded();
    // Assert the link is visible on the page
    await expect(footerPage.privacyLink).toBeVisible();
    // Read the href value from the link element
    const href = await footerPage.privacyLink.getAttribute('href');
    // Assert the href path is correct
    expect(href).toMatch(/\/privacy-policy/);
    // Build the full URL
    const url = href!.startsWith('http') ? href! : `${BASE_URL}${href}`;
    // Fetch the URL and assert HTTP 200
    const response = await request.get(url);
    expect(response.status()).toBe(200);
  });

  // Test 5: The copyright paragraph at the bottom contains the GDC Media company name
  test('@smoke copyright text contains "GDC Media Limited"', async () => {
    // Scroll the copyright paragraph into view — it is at the very bottom of the footer
    await footerPage.legalText.scrollIntoViewIfNeeded();
    // Assert the paragraph contains the company name
    await expect(footerPage.legalText).toContainText('GDC Media Limited');
  });

  // ─── Regression tests ────────────────────────────────────────────────────────

  // Test 6: The footer contains at least 15 links — a drop below this would suggest missing content
  test('@regression footer has at least 15 links', async () => {
    // Count every <a> tag inside the footer
    const count = await footerPage.allLinks.count();
    // Fewer than 15 links would suggest a section of the footer failed to render
    expect(count).toBeGreaterThanOrEqual(15);
  });

  // Test 7: The copyright year is the current year — catches a forgotten hardcoded year update in January
  test('@regression copyright year matches the current year', async () => {
    // Get the current year as a string (e.g. "2026")
    const currentYear = new Date().getFullYear().toString();
    // Scroll the copyright paragraph into view
    await footerPage.legalText.scrollIntoViewIfNeeded();
    // Assert the copyright line contains the current year
    // This will fail in January if the hardcoded year is not updated — which is the point
    await expect(footerPage.legalText).toContainText(currentYear);
  });

  // Test 8: Every internal gambling.com footer link returns HTTP 200 when fetched — catches broken links
  // External links (social media etc.) are excluded: Facebook, YouTube, and TikTok return non-200
  // statuses to programmatic requests due to bot detection, which would cause false failures.
  test('@regression all footer links return HTTP 200', async ({ request }) => {
    // Collect every href from every anchor tag in the footer
    const links = footerPage.allLinks;
    const count = await links.count();

    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');

      // Skip anchors that have no href, are page-internal (#), or use non-HTTP protocols
      if (
        !href ||
        href === '#' ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        continue;
      }

      // Turn relative hrefs into full URLs
      const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

      // Only test internal gambling.com links — external sites (e.g. facebook.com/gambling.com)
      // block programmatic requests. Check the hostname, not the full URL string, because
      // external URLs can contain "gambling.com" in their path and fool a simple string check.
      const hostname = new URL(url).hostname;
      if (!hostname.endsWith('gambling.com')) continue;

      hrefs.push(url);
    }

    // Fetch all links in parallel so the test finishes quickly
    const results = await Promise.all(
      hrefs.map(async url => {
        const response = await request.get(url, { timeout: 15000 });
        return { url, status: response.status() };
      })
    );

    // Assert every link came back with 200 OK
    // The second argument to expect() is printed in the failure message so you know exactly which URL failed
    for (const { url, status } of results) {
      expect(status, `Expected HTTP 200 for ${url}`).toBe(200);
    }
  });

});
