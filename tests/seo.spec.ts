// ─────────────────────────────────────────────────────────────────────────────
// SEO Essentials Tests — gambling.com
//
// Covers three layers of SEO health:
//   1. Sitemap structure — sitemap-index.xml and global sitemap.xml
//   2. Crawler directives  — robots.txt content
//   3. HTML head tags      — canonical, hreflang, og:url, twitter:card, robots meta
//
// HTTP-level checks (sitemap + robots) use Playwright's APIRequestContext — no
// browser is needed; these are plain GET requests against static files.
//
// HTML head checks use page.goto() and query <head> elements directly. These
// run headed so you can watch the pages load.
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
// Each object in seoPages defines a URL and its expected canonical value.
// The for...of loop below creates one test.describe block per page entry.
// Playwright names each generated test like:
//   "SEO head tags — DE homepage  ›  @smoke canonical is correct"
// To add a new page, add one object to seoPages — no test code changes needed.
// ─────────────────────────────────────────────────────────────────────────────

// Pages to test — a mix of geo homepages and a deep review page
const seoPages = [
  {
    name: 'Global homepage',
    url: `${BASE_URL}/`,
    // Canonicals consistently omit the trailing slash even when the URL has one.
    // The server redirects /  →  no-trailing-slash form; the canonical matches that.
    expectedCanonical: BASE_URL,
  },
  {
    name: 'US homepage',
    url: `${BASE_URL}/us/`,
    expectedCanonical: `${BASE_URL}/us`,
  },
  {
    name: 'UK homepage',
    url: `${BASE_URL}/uk/`,
    expectedCanonical: `${BASE_URL}/uk`,
  },
  {
    name: 'DE homepage',
    url: `${BASE_URL}/de/`,
    expectedCanonical: `${BASE_URL}/de`,
  },
  {
    name: 'GR homepage',
    url: `${BASE_URL}/gr/`,
    expectedCanonical: `${BASE_URL}/gr`,
  },
  {
    name: 'IE review — bet365',
    url: `${BASE_URL}/ie/online-casinos/bet365`,
    // Review page has no trailing slash — the canonical matches the URL exactly
    expectedCanonical: `${BASE_URL}/ie/online-casinos/bet365`,
  },
];

// This loop runs test.describe once for every entry in seoPages.
// `pg` is a fresh const binding per iteration so each describe block captures
// its own copy of the page data — no shared-state problem between iterations.
for (const pg of seoPages) {

  test.describe(`SEO head tags — ${pg.name}`, () => {

    // Navigate to this page before each test — both tests in this block need it.
    // waitUntil: 'domcontentloaded' is sufficient because <head> tags are
    // part of the initial HTML and are fully parsed by domcontentloaded.
    test.beforeEach(async ({ page }) => {
      await page.goto(pg.url, { waitUntil: 'domcontentloaded' });
    });

    // Tests 11–16: canonical is self-referencing and hreflang tags are present
    test('@smoke canonical is present, self-referencing, and hreflang tags are present', async ({ page }) => {
      // Read the <link rel="canonical" href="..."> from the page <head>.
      // Using catch(() => null) gives a clearer failure message than a raw Timeout error
      // if the tag is completely missing.
      const canonical = await page
        .locator('link[rel="canonical"]')
        .getAttribute('href', { timeout: 5000 })
        .catch(() => null);

      // A missing canonical on any page is a serious SEO risk — Google may choose the
      // wrong URL to index (e.g. the trailing-slash version vs the canonical form)
      expect(canonical, `Expected a canonical tag on ${pg.url}`).not.toBeNull();

      // The canonical must point back to this exact page (self-referencing).
      // If it points somewhere else, this page's ranking signals are sent to a different URL.
      expect(canonical, `Expected canonical to be self-referencing on ${pg.url}`).toBe(pg.expectedCanonical);

      // Every page must carry at least one hreflang tag to tell Google which language/region
      // variant this is. Losing all hreflang tags would break international geo-targeting.
      const hreflangCount = await page.locator('link[rel="alternate"][hreflang]').count();
      expect(hreflangCount, `Expected at least one hreflang tag on ${pg.url}`).toBeGreaterThan(0);
    });

    // Tests 17–22: og:url matches canonical, twitter:card is declared, page is not noindex
    test('@smoke og:url matches canonical, twitter:card is present, and page is not noindex', async ({ page }) => {
      // og:url is the URL social platforms (Facebook, LinkedIn etc.) use when this page is shared.
      // It must agree with the canonical so social shares reinforce the correct canonical URL.
      const ogUrl = await page
        .locator('meta[property="og:url"]')
        .getAttribute('content', { timeout: 5000 })
        .catch(() => null);
      expect(ogUrl, `Expected og:url on ${pg.url}`).not.toBeNull();
      expect(ogUrl, `Expected og:url to match canonical on ${pg.url}`).toBe(pg.expectedCanonical);

      // twitter:card controls how this page renders when shared on X (Twitter).
      // Its presence also confirms the wider Open Graph / social meta block is intact.
      const twitterCard = await page
        .locator('meta[name="twitter:card"]')
        .getAttribute('content', { timeout: 5000 })
        .catch(() => null);
      expect(twitterCard, `Expected twitter:card to be present on ${pg.url}`).toBeTruthy();

      // The robots meta tag must never contain 'noindex' on a public content page.
      // A single noindex would immediately remove the page from Google's index.
      // Note: the global homepage has no robots meta tag at all — null means
      // index by default, which is correct and is not flagged as a failure here.
      const robotsEl = page.locator('meta[name="robots"]');
      if (await robotsEl.count() > 0) {
        const robots = await robotsEl.getAttribute('content');
        expect(robots, `Expected no noindex directive on ${pg.url}`).not.toContain('noindex');
      }
    });

  });

}
