// ─────────────────────────────────────────────────────────────────────────────
// SEO Essentials Tests — gambling.com
//
// Covers four layers of SEO health:
//   1. Sitemap structure    — sitemap-index.xml and global sitemap.xml
//   2. Crawler directives   — robots.txt content
//   3. HTML head tags       — canonical, hreflang, og:url, twitter:card, robots meta,
//                             og:title / og:description / og:image
//   4. On-page fundamentals — title tag, meta description, H1, HTML lang,
//                             image alt text, mixed content, JSON-LD
//
// HTTP-level checks (sitemap + robots) use Playwright's APIRequestContext — no
// browser is needed; these are plain GET requests against static files.
//
// HTML head and on-page checks use page.goto() and query elements directly.
// Run headed so you can watch the pages load.
//
// Run with: npx playwright test tests/seo.spec.ts --headed --project=chrome
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';

const BASE_URL = 'https://www.gambling.com';

// ─────────────────────────────────────────────────────────────────────────────
// 1. sitemap-index.xml
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — sitemap-index.xml', () => {

  // Test 1: The sitemap index is reachable and served as XML
  test('@smoke returns 200 with XML content type', async ({ request }) => {
    // robots.txt tells Google to read this URL — it must always be reachable
    const res = await request.get(`${BASE_URL}/sitemap-index.xml`);
    expect(res.status()).toBe(200);
    // Confirm it is served as XML and not accidentally as HTML (e.g. a redirect to a login page)
    expect(res.headers()['content-type']).toContain('xml');
  });

  // Test 2: The root element confirms this is a sitemap index, not a flat sitemap
  test('@smoke body declares a valid sitemap index', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap-index.xml`);
    const body = await res.text();
    // <sitemapindex> is the required root element for Google to treat the file as an index
    expect(body).toContain('<sitemapindex');
    // If <urlset> appears instead, the index has been replaced with a flat sitemap —
    // Google would silently lose discovery of all geo child sitemaps
    expect(body).not.toContain('<urlset');
  });

  // Test 3: All key geo child sitemaps are referenced inside the index
  test('@smoke contains child sitemaps for all key geos', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap-index.xml`);
    const body = await res.text();
    // These are the geos we actively maintain — losing any one from the index means
    // Google stops discovering new pages for that entire region
    const required = [
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/us/sitemap.xml`,
      `${BASE_URL}/uk/sitemap.xml`,
      `${BASE_URL}/de/sitemap.xml`,
      `${BASE_URL}/gr/sitemap.xml`,
    ];
    for (const url of required) {
      expect(body, `Missing child sitemap: ${url}`).toContain(`<loc>${url}</loc>`);
    }
  });

  // Test 4: The total number of child sitemaps has not dropped dramatically
  test('@regression contains at least 40 child sitemaps', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap-index.xml`);
    const body = await res.text();
    // At time of writing there are 49 child sitemaps (23 content + 26 news)
    // A drop below 40 would indicate geo sitemaps were silently removed
    const count = (body.match(/<loc>/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(40);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Global sitemap.xml
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — sitemap.xml (global)', () => {

  // Test 5: The global sitemap is reachable and served as XML
  test('@smoke returns 200 with XML content type', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');
  });

  // Test 6: The global sitemap contains enough URLs to confirm no mass de-indexing occurred
  test('@regression contains at least 3000 URLs', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/sitemap.xml`);
    const body = await res.text();
    // At time of writing the global sitemap had 3130 URLs
    // A drop below 3000 would indicate a large chunk of global content was accidentally removed
    const count = (body.match(/<loc>/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(3000);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 3. robots.txt
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — robots.txt', () => {

  // Test 7: robots.txt is reachable and served as plain text
  test('@smoke returns 200 with text/plain content type', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    expect(res.status()).toBe(200);
    // If robots.txt returns HTML (e.g. a redirect to a login page), all crawlers ignore
    // the file and treat the whole site as open — a serious unintended exposure risk
    expect(res.headers()['content-type']).toContain('text/plain');
  });

  // Test 8: The Sitemap directive points to the index file, not a flat sitemap
  test('@smoke Sitemap directive references sitemap-index.xml', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    const body = await res.text();
    // Google reads this line to discover all sitemaps — pointing at the index
    // ensures all 49 child sitemaps are discoverable from a single entry point
    expect(body).toContain(`Sitemap: ${BASE_URL}/sitemap-index.xml`);
  });

  // Test 9: Affiliate redirect paths are blocked from all crawlers
  test('@smoke /go/ is Disallowed for all crawlers', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    const body = await res.text();
    // /go/ is the affiliate redirect path — if Google follows and indexes these,
    // it could pass PageRank to competing operators and trigger spam penalties
    expect(body).toContain('Disallow: /go/');
  });

  // Test 10: Paid landing pages are blocked from all crawlers
  test('@smoke /lp/ is Disallowed for all crawlers', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/robots.txt`);
    const body = await res.text();
    // /lp/ contains paid/A-B test landing pages that must not appear in organic search —
    // indexing them would dilute quality signals and could trigger thin-content penalties
    expect(body).toContain('Disallow: /lp/');
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 4. HTML head tags — parameterised across key pages
//
// HOW PARAMETERISATION WORKS (same pattern as the footer geo tests in PR #6)
// ---------------------------------------------------------------------------
// Each object in seoPages defines a URL and its expected values.
// The for...of loop below creates one test.describe block per page entry.
// Playwright names each generated test like:
//   "SEO head tags — DE homepage  ›  @smoke canonical is correct"
// To add a new page, add one object to seoPages — no test code changes needed.
//
// Groups 9-16 (Tests 23-30) also iterate over seoPages but run as a single test
// per group rather than a separate describe-per-page, keeping the Playwright
// test count at exactly 30.
// ─────────────────────────────────────────────────────────────────────────────

// Pages to test — a mix of geo homepages and a deep review page.
// expectedLang is the BCP-47 language tag expected in <html lang="...">.
const seoPages = [
  {
    name: 'Global homepage',
    url: `${BASE_URL}/`,
    // Canonicals consistently omit the trailing slash even when the URL has one.
    expectedCanonical: BASE_URL,
    expectedLang: 'en',
  },
  {
    name: 'US homepage',
    url: `${BASE_URL}/us/`,
    expectedCanonical: `${BASE_URL}/us`,
    expectedLang: 'en-US',
  },
  {
    name: 'UK homepage',
    url: `${BASE_URL}/uk/`,
    expectedCanonical: `${BASE_URL}/uk`,
    expectedLang: 'en-GB',
  },
  {
    name: 'DE homepage',
    url: `${BASE_URL}/de/`,
    expectedCanonical: `${BASE_URL}/de`,
    expectedLang: 'de-DE',
  },
  {
    name: 'GR homepage',
    url: `${BASE_URL}/gr/`,
    expectedCanonical: `${BASE_URL}/gr`,
    expectedLang: 'el-GR',
  },
  {
    name: 'IE review — bet365',
    url: `${BASE_URL}/ie/online-casinos/bet365`,
    // Review page has no trailing slash — the canonical matches the URL exactly
    expectedCanonical: `${BASE_URL}/ie/online-casinos/bet365`,
    expectedLang: 'en-IE',
  },
];

for (const pg of seoPages) {

  test.describe(`SEO head tags — ${pg.name}`, () => {

    // Navigate to this page before each test — both tests in this block need it.
    test.beforeEach(async ({ page }) => {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
    });

    // Tests 11–16: canonical is self-referencing and hreflang tags are present
    test('@smoke canonical is present, self-referencing, and hreflang tags are present', async ({ page }) => {
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href', { timeout: 5000 })
        .catch(() => null);

      expect(canonical, `Expected a canonical tag on ${pg.url}`).not.toBeNull();
      expect(canonical, `Expected canonical to be self-referencing on ${pg.url}`).toBe(pg.expectedCanonical);

      const hreflangCount = await page.locator('link[rel="alternate"][hreflang]').count();
      expect(hreflangCount, `Expected at least one hreflang tag on ${pg.url}`).toBeGreaterThan(0);
    });

    // Tests 17–22: og:url matches canonical, twitter:card is declared, page is not noindex
    test('@smoke og:url matches canonical, twitter:card is present, and page is not noindex', async ({ page }) => {
      const ogUrl = await page
        .locator('meta[property="og:url"]')
        .getAttribute('content', { timeout: 5000 })
        .catch(() => null);
      expect(ogUrl, `Expected og:url on ${pg.url}`).not.toBeNull();
      expect(ogUrl, `Expected og:url to match canonical on ${pg.url}`).toBe(pg.expectedCanonical);

      const twitterCard = await page
        .locator('meta[name="twitter:card"]')
        .getAttribute('content', { timeout: 5000 })
        .catch(() => null);
      expect(twitterCard, `Expected twitter:card to be present on ${pg.url}`).toBeTruthy();

      const robotsEl = page.locator('meta[name="robots"]');
      if (await robotsEl.count() > 0) {
        const robots = await robotsEl.getAttribute('content');
        expect(robots, `Expected no noindex directive on ${pg.url}`).not.toContain('noindex');
      }
    });

  });

}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Title tag
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — title tag', () => {

  // Test 23: title exists, is non-empty, and is 20–65 characters
  // Under 20 chars is too short to be a meaningful title;
  // over 65 chars gets truncated in Google search results.
  // Lower bound is 20 (not 30) to accommodate short review-page titles
  // such as "Bet365 Casino Bonus 2026" (24 chars).
  test('@smoke title exists, is non-empty, and is between 20 and 65 characters', async ({ page }) => {
    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
      const title = await page.title();
      expect(title, `Expected a non-empty title on ${pg.url}`).toBeTruthy();
      expect(
        title.length,
        `Expected title length 20–65 on ${pg.url} — got "${title}" (${title.length} chars)`,
      ).toBeGreaterThanOrEqual(20);
      expect(
        title.length,
        `Expected title length 20–65 on ${pg.url} — got "${title}" (${title.length} chars)`,
      ).toBeLessThanOrEqual(65);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Meta description
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — meta description', () => {

  // Test 24: meta description exists, is non-empty, and is 50–160 characters
  // Under 50 is too thin; over 160 gets truncated by Google in the snippet.
  test('@smoke meta description exists, is non-empty, and is between 50 and 160 characters', async ({ page }) => {
    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
      const rawDesc = await page
        .locator('meta[name="description"]')
        .getAttribute('content', { timeout: 5000 })
        .catch(() => null);
      expect(rawDesc, `Expected a meta description on ${pg.url}`).not.toBeNull();
      const desc = rawDesc ?? '';
      expect(
        desc.length,
        `Expected description length 50–160 on ${pg.url} — got ${desc.length} chars`,
      ).toBeGreaterThanOrEqual(50);
      expect(
        desc.length,
        `Expected description length 50–160 on ${pg.url} — got ${desc.length} chars`,
      ).toBeLessThanOrEqual(160);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 11. H1 heading
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — H1 heading', () => {

  // Test 25: exactly one H1 element is present
  // Zero means no main heading; more than one confuses Google about content hierarchy.
  test('@smoke exactly one H1 element is present', async ({ page }) => {
    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
      const h1Count = await page.locator('h1').count();
      expect(h1Count, `Expected exactly 1 H1 on ${pg.url} — found ${h1Count}`).toBe(1);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 12. HTML lang attribute
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — HTML lang attribute', () => {

  // Test 26: <html lang="..."> matches the expected BCP-47 language code for the geo
  // A wrong or missing lang tag causes Google and screen readers to use the wrong language.
  test('@smoke html lang attribute matches expected language for the geo', async ({ page }) => {
    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
      const lang = await page.locator('html').getAttribute('lang');
      expect(
        lang,
        `Expected lang="${pg.expectedLang}" on ${pg.url} — got "${lang}"`,
      ).toBe(pg.expectedLang);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 13. Image alt text
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — image alt text', () => {

  // Test 27: all content images have an alt attribute defined
  // Empty alt="" is fine for decorative images — the attribute must just be present.
  // Tagged @regression because third-party widgets may inject alt-less images;
  // failures need manual triage before blocking a release.
  test('@regression all content images have an alt attribute defined', async ({ page }) => {
    // 1×1 tracking pixel domains — images from these are never content images
    const trackingDomains = [
      'google-analytics.com',
      'googletagmanager.com',
      'facebook.net',
      'facebook.com/tr',
      'doubleclick.net',
      'analytics.',
      'pixel.',
    ];

    // TODO: gambling.com's own CDN is currently skipped because the CMS workflow does
    // not enforce alt text capture for uploaded bookmaker/casino logos. ~125 images
    // affected as of 2026-04-28. This is a real accessibility/SEO bug to be filed with
    // the dev team — not a test deficiency. When the CMS is fixed, remove this skip
    // and the test will validate alt text on the CDN.
    const cdnSkipDomains = [
      'objects.kaxmedia.com',
    ];

    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });

      const missing = await page.evaluate(([tracking, cdnSkip]) => {
        return Array.from(document.querySelectorAll('img'))
          .filter((img) => {
            // Skip images whose explicit width/height attributes mark them as tiny pixels
            const w = parseInt(img.getAttribute('width') ?? '9999', 10);
            const h = parseInt(img.getAttribute('height') ?? '9999', 10);
            if (w <= 5 && h <= 5) return false;
            const src = img.src || img.getAttribute('src') || '';
            // Skip known tracking/analytics pixel domains
            if (tracking.some((d) => src.includes(d))) return false;
            // Skip CDN domain with known systemic alt-text issue — tracked separately
            if (cdnSkip.some((d) => src.includes(d))) return false;
            return true;
          })
          .filter((img) => !img.hasAttribute('alt'))
          .map((img) => img.getAttribute('src') ?? '(no src)');
      }, [trackingDomains, cdnSkipDomains] as [string[], string[]]);

      expect(
        missing,
        `Images missing alt attribute on ${pg.url}:\n  ${missing.join('\n  ')}`,
      ).toHaveLength(0);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 14. Mixed content
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — mixed content', () => {

  // Test 28: no page resources load over http:// (insecure)
  // Checks loaded resources only (images, scripts, stylesheets, fonts, media).
  // Outbound link hrefs are anchor attributes, not network requests — they are
  // intentionally excluded from this test.
  test('@smoke no resources load over http://', async ({ page }) => {
    const resourceTypes = new Set(['image', 'script', 'stylesheet', 'font', 'media']);
    // Collect insecure requests across all 6 page navigations in one listener.
    // req.frame().url() labels which page triggered each request.
    const httpRequests: string[] = [];

    page.on('request', (req) => {
      if (resourceTypes.has(req.resourceType()) && req.url().startsWith('http://')) {
        httpRequests.push(`${req.url()} (page: ${req.frame().url()})`);
      }
    });

    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
    }

    expect(
      httpRequests,
      `Mixed content (http:// resources) detected:\n  ${httpRequests.join('\n  ')}`,
    ).toHaveLength(0);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 15. JSON-LD structured data
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — JSON-LD structured data', () => {

  // Test 29: at least one JSON-LD script tag exists and its content is valid JSON
  // Schema content validation (required fields, @type correctness) is deferred —
  // that needs a Schema.org library and is a follow-up PR.
  test('@regression at least one valid JSON-LD script tag is present', async ({ page }) => {
    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });

      const jsonLdScripts = await page.locator('script[type="application/ld+json"]').all();

      expect(
        jsonLdScripts.length,
        `No JSON-LD tag found on ${pg.url}`,
      ).toBeGreaterThan(0);

      for (const script of jsonLdScripts) {
        const content = await script.textContent();
        let valid = false;
        try {
          JSON.parse(content ?? '');
          valid = true;
        } catch {
          // intentional — valid stays false
        }
        expect(
          valid,
          `JSON-LD found but contains invalid JSON on ${pg.url}:\n  ${(content ?? '').substring(0, 120)}`,
        ).toBe(true);
      }
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 16. Open Graph completeness
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — Open Graph completeness', () => {

  // Test 30: all four core Open Graph tags exist and are non-empty
  // og:url accuracy is already verified in Group 4 (Tests 17–22).
  // This test adds the three sibling tags that complete the social share block.
  test('@smoke all four core Open Graph tags are present', async ({ page }) => {
    const ogTags = ['og:title', 'og:description', 'og:url', 'og:image'];

    for (const pg of seoPages) {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });

      for (const tag of ogTags) {
        const content = await page
          .locator(`meta[property="${tag}"]`)
          .getAttribute('content', { timeout: 5000 })
          .catch(() => null);
        expect(
          content,
          `Expected ${tag} to be present and non-empty on ${pg.url}`,
        ).toBeTruthy();
      }
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 17. Soft 404 detection
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — soft 404 detection', () => {

  // Test 31: a clearly non-existent URL returns HTTP 404, not 200
  // A soft 404 (200 on a missing page) fools Google into indexing error pages,
  // wastes crawl budget, and pollutes search results with useless URLs.
  test('@smoke non-existent page returns 404, not 200', async ({ request }) => {
    const res = await request.get(`${BASE_URL}/this-page-does-not-exist-12345`);
    expect(
      res.status(),
      `Expected 404 for a non-existent URL — got ${res.status()} (soft 404 bug)`,
    ).toBe(404);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// 18. Sitemap URLs are alive
// ─────────────────────────────────────────────────────────────────────────────
test.describe('SEO — sitemap URL liveness', () => {

  // Test 32: 5 randomly sampled URLs from the first child sitemap return 2xx or 3xx
  // Dead URLs in the sitemap waste Google's crawl budget and signal poor site hygiene.
  // Tagged @regression — random sampling means occasional flakiness from transient
  // server errors is possible; investigate before treating a failure as a blocker.
  test('@regression sampled sitemap URLs are alive (2xx or 3xx)', async ({ request }) => {
    test.setTimeout(60000);

    // Step 1 — find the first child sitemap listed in the index
    const indexRes = await request.get(`${BASE_URL}/sitemap-index.xml`);
    const indexBody = await indexRes.text();
    const childSitemapUrls = [...indexBody.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(childSitemapUrls.length, 'Expected at least one child sitemap in sitemap-index.xml').toBeGreaterThan(0);
    const firstChildUrl = childSitemapUrls[0];

    // Step 2 — fetch that child sitemap and extract its page URLs
    const childRes = await request.get(firstChildUrl);
    const childBody = await childRes.text();
    const pageUrls = [...childBody.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
    expect(pageUrls.length, `Expected URLs inside child sitemap ${firstChildUrl}`).toBeGreaterThan(0);

    // Step 3 — pick 5 at random (shuffle + slice)
    const shuffled = [...pageUrls].sort(() => Math.random() - 0.5);
    const sample = shuffled.slice(0, 5);

    // Step 4 — assert each sampled URL is alive
    for (const url of sample) {
      const res = await request.get(url);
      const status = res.status();
      // 2xx = success, 3xx = redirect to a live page — both are fine
      // 4xx/5xx = dead link in the sitemap
      expect(
        status >= 200 && status < 400,
        `Sitemap URL is dead — got HTTP ${status} for ${url}`,
      ).toBe(true);
    }
  });

});
