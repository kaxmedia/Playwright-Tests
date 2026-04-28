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

  // Test 8: Every internal gambling.com footer link returns HTTP 200 when fetched — broken-link guard
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

  // Test 9: Regulatory logos are present in the global footer and their landing pages are live.
  // These logos are a compliance requirement — a missing logo or a dead link is a legal risk.
  test('@smoke regulatory logos are present and landing pages return 200', async ({ request }) => {
    // External regulatory and government websites can be slow to respond.
    // 120 s gives even sluggish servers enough time without failing on latency alone.
    test.setTimeout(120000);
    // Logos confirmed in the global (gambling.com) footer — explored 2026-04-28
    const logos = [
      { alt: 'Gamcare',                 href: 'http://www.gamcare.org.uk'                   },
      { alt: 'Gambling Care',           href: 'https://gamblingcare.ie/'                     },
      { alt: 'Extern Problem Gambling', href: 'https://www.problemgambling.ie'               },
      { alt: 'GPWA Approved Portal',    href: 'https://certify.gpwa.org/verify/gambling.com' },
    ];

    // Step 1: Check every logo is present in the footer DOM with the correct href.
    // a:has(img[alt="..."]) finds the <a> wrapping the logo <img> by the image's alt text.
    // toBeAttached() is used instead of toBeVisible() because logos sit at the very bottom of
    // the footer and may be below the visible viewport — they are in the DOM but not on-screen.
    for (const logo of logos) {
      const link = footerPage.footer.locator(`a:has(img[alt="${logo.alt}"])`);
      await expect(link, `Expected logo "${logo.alt}" to be in the footer`).toBeAttached();
      const href = await link.getAttribute('href');
      expect(href, `Expected correct href for logo "${logo.alt}"`).toBe(logo.href);
    }

    // Step 2: Fetch all logo landing pages in parallel and check they are reachable.
    // ignoreHTTPSErrors: true handles third-party sites with cert issues (expired cert or
    // TLS hostname mismatch) — these are external partner sites gambling.com cannot fix,
    // but we still want to know whether the page itself is there.
    // We assert !== 404 and < 500 rather than === 200 because some regulatory sites (e.g.
    // GamCare) return 403 to non-browser requests due to bot detection. 403 means the site
    // is alive; 404 means the page is gone; 5xx means the server is broken.
    const results = await Promise.all(
      logos.map(async ({ alt, href }) => {
        const response = await request.get(href, { timeout: 15000, ignoreHTTPSErrors: true });
        return { alt, href, status: response.status() };
      })
    );

    for (const { alt, href, status } of results) {
      // A 404 means the logo destination page no longer exists — a compliance failure
      expect(status, `"${alt}" logo at ${href} returned 404 — broken link`).not.toBe(404);
      // A 5xx means the destination server is erroring — also a compliance concern
      expect(status, `"${alt}" logo at ${href} returned ${status} — server error`).toBeLessThan(500);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Geo-parameterised footer tests
//
// HOW PARAMETERISATION WORKS
// ---------------------------
// Instead of writing four near-identical test.describe blocks (one for US, one
// for UK, one for DE, one for GR), we define a single array called geoVariants.
// Each object in the array holds all the geo-specific values: the URL to visit,
// the link label text in the local language, the expected href, and the correct
// copyright entity.
//
// The for...of loop below then calls test.describe once per array entry.
// Playwright names each generated test using the geo name, so in the HTML report
// you will see entries like:
//   Footer — US  ›  @smoke footer is visible
//   Footer — DE  ›  @smoke Terms link is visible and href is correct
// etc.
//
// To add a new geographic variant, add one more object to geoVariants — no
// test code needs to change at all.
// ─────────────────────────────────────────────────────────────────────────────

// Each object describes one geographic version of the gambling.com footer.
// The properties are read by the shared test code in the loop below.
const geoVariants = [
  {
    // United States — operated by GDC's American subsidiary.
    // Privacy and Rewards Terms hrefs carry a /us/ prefix; copyright names a different entity.
    name: 'US',
    url: 'https://www.gambling.com/us/',
    responsibleGamblingText: 'Responsible Gambling',
    responsibleGamblingHref: '/responsible',
    termsText: 'Terms and Conditions',
    termsHref: '/terms-and-conditions',
    privacyText: 'Privacy and Cookies Policy',
    privacyHref: '/us/privacy-policy',
    copyrightContains: 'GDC Media America Inc',
    // Regulatory logos confirmed in the US footer — explored 2026-04-28
    logos: [
      { alt: 'NCP Gambling',         href: 'https://www.ncpgambling.org'                    },
      { alt: '800 Gambler',          href: 'https://800gambler.org'                          },
      { alt: 'GPWA Approved Portal', href: 'https://certify.gpwa.org/verify/gambling.com'    },
    ],
  },
  {
    // United Kingdom — same English link labels as the global site.
    // Privacy and Rewards Terms hrefs carry a /uk/ prefix.
    name: 'UK',
    url: 'https://www.gambling.com/uk/',
    responsibleGamblingText: 'Responsible Gambling',
    responsibleGamblingHref: '/responsible',
    termsText: 'Terms and Conditions',
    termsHref: '/terms-and-conditions',
    privacyText: 'Privacy and Cookies Policy',
    privacyHref: '/uk/privacy-policy',
    copyrightContains: 'GDC Media Limited',
    // Regulatory logos confirmed in the UK footer — Gamstop and GambleAware are UKGC requirements
    logos: [
      { alt: 'Gamstop',              href: 'https://www.gamstop.co.uk'                       },
      { alt: 'Gamcare',              href: 'http://www.gamcare.org.uk'                        },
      { alt: 'GambleAware',          href: 'https://www.gambleaware.org'                      },
      { alt: 'GPWA Approved Portal', href: 'https://certify.gpwa.org/verify/gambling.com'     },
    ],
  },
  {
    // Germany — footer is fully translated into German.
    // All compliance link labels and hrefs use the /de/ prefix and German text.
    name: 'DE',
    url: 'https://www.gambling.com/de/',
    responsibleGamblingText: 'Verantwortungsvolles Spielen',
    responsibleGamblingHref: '/de/verantwortung',
    termsText: 'Nutzungs- und Geschäftsbedingungen',
    termsHref: '/de/geschaeftsbedingungen',
    privacyText: 'Datenschutz',
    privacyHref: '/de/datenschutz',
    copyrightContains: 'GDC Media Limited',
    // Regulatory logos confirmed in the DE footer — DE has no geo flag selector unlike other geos
    logos: [
      { alt: 'Spiel nicht bis zur Glücksspielsucht', href: 'https://www.spielen-mit-verantwortung.de'    },
      { alt: 'GPWA Approved Portal',                 href: 'https://certify.gpwa.org/verify/gambling.com' },
    ],
  },
  {
    // Greece — footer is fully translated into Greek.
    // All compliance link labels and hrefs use the /gr/ prefix and Greek text.
    // The age gate here is 21+ (vs 18+ in DE), but that is not tested here.
    name: 'GR',
    url: 'https://www.gambling.com/gr/',
    responsibleGamblingText: 'Υπεύθυνο Παιχνίδι',
    responsibleGamblingHref: '/gr/ypefthino-paixnidi',
    termsText: 'Όροι και Προϋποθέσεις',
    termsHref: '/gr/terms-and-conditions',
    privacyText: 'Πολιτική απορρήτου και Cookies',
    privacyHref: '/gr/privacy-policy',
    copyrightContains: 'GDC Media Limited',
    // Regulatory logos confirmed in the GR footer — EEEP is the Greek gaming regulator
    logos: [
      { alt: 'Keoea',                href: 'https://www.kethea.gr/'                           },
      { alt: 'EEEP',                 href: 'https://www.gamingcommission.gov.gr/'              },
      { alt: 'GambleAware',          href: 'https://www.gambleaware.org'                       },
      { alt: 'GPWA Approved Portal', href: 'https://certify.gpwa.org/verify/gambling.com'      },
    ],
  },
];

// This loop runs test.describe once for every entry in geoVariants.
// The variable `geo` inside the loop is a fresh binding per iteration (this is
// how JavaScript const works in for...of), so each describe block captures its
// own copy of the geo data — there is no shared-state problem.
for (const geo of geoVariants) {

  test.describe(`Footer — ${geo.name}`, () => {

    // Each geo describe block declares its own footerPage, exactly like the
    // global "Footer" block above — the variable lives inside this closure.
    let footerPage: FooterPage;

    // Before each test in this block: go to the geo URL and scroll to the footer.
    // geo.url is the only thing that changes between geos — everything else is identical.
    test.beforeEach(async ({ page }) => {
      footerPage = new FooterPage(page);
      await page.goto(geo.url);
      await footerPage.scrollToFooter();
    });

    // Test G1: The footer element is present on this geo
    test('@smoke footer is visible', async () => {
      await expect(footerPage.footer).toBeVisible();
    });

    // Test G2: The Responsible Gambling link exists in the local language and points to the right page
    test('@smoke Responsible Gambling link is visible and href is correct', async () => {
      // complianceLink() looks up any footer link by its display text — so passing the
      // German label finds the German link, passing the Greek label finds the Greek link.
      // This is the key payoff of parameterisation: one test body, many languages.
      const link = footerPage.complianceLink(geo.responsibleGamblingText);
      await link.scrollIntoViewIfNeeded();
      // Assert the link is visible to the user
      await expect(link).toBeVisible();
      // Read the href and assert it contains the expected path for this geo
      const href = await link.getAttribute('href');
      expect(href).toContain(geo.responsibleGamblingHref);
    });

    // Test G3: The Terms link exists in the local language and points to the right page
    test('@smoke Terms link is visible and href is correct', async () => {
      const link = footerPage.complianceLink(geo.termsText);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toContain(geo.termsHref);
    });

    // Test G4: The Privacy link exists in the local language and points to the right page
    test('@smoke Privacy link is visible and href is correct', async () => {
      const link = footerPage.complianceLink(geo.privacyText);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toContain(geo.privacyHref);
    });

    // Test G5: The copyright paragraph names the correct legal entity for this geo.
    // US shows "GDC Media America Inc"; all other geos show "GDC Media Limited".
    // We locate the paragraph using © rather than the entity name itself, because the
    // entity name is what we are asserting — it should not also be the locator.
    test('@smoke copyright names the correct legal entity', async () => {
      const copyright = footerPage.footer.locator('p').filter({ hasText: '©' }).first();
      await copyright.scrollIntoViewIfNeeded();
      await expect(copyright).toContainText(geo.copyrightContains);
    });

    // Test G6: Regulatory logos are present on this geo's footer and their landing pages are live.
    // geo.logos comes from the geoVariants data above — each geo has its own required set.
    // This is the same pattern as Test 9 in the global Footer block, but driven by geo data.
    test('@smoke regulatory logos are present and landing pages return 200', async ({ request }) => {
      // External regulatory and government websites can be slow — 120 s prevents false timeouts
      test.setTimeout(120000);
      // Step 1: Check every logo is in the footer DOM with the correct href
      for (const logo of geo.logos) {
        // a:has(img[alt="..."]) finds the <a> that wraps the logo image by alt text
        const link = footerPage.footer.locator(`a:has(img[alt="${logo.alt}"])`);
        // toBeAttached rather than toBeVisible — logos are below the fold but still in the DOM
        await expect(link, `Expected logo "${logo.alt}" to be in the footer`).toBeAttached();
        const href = await link.getAttribute('href');
        expect(href, `Expected correct href for logo "${logo.alt}"`).toBe(logo.href);
      }

      // Step 2: Fetch all landing pages in parallel and check they are reachable.
      // Same strategy as the global logo test above: ignoreHTTPSErrors handles external
      // sites with cert issues; !== 404 catches dead links; < 500 catches server errors.
      const results = await Promise.all(
        geo.logos.map(async ({ alt, href }) => {
          const response = await request.get(href, { timeout: 15000, ignoreHTTPSErrors: true });
          return { alt, href, status: response.status() };
        })
      );

      for (const { alt, href, status } of results) {
        expect(status, `"${alt}" logo at ${href} returned 404 — broken link`).not.toBe(404);
        expect(status, `"${alt}" logo at ${href} returned ${status} — server error`).toBeLessThan(500);
      }
    });

  });

}
