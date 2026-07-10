// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 9: Content & Discovery
//
// Covers the four content and discovery journeys where a user finds gambling.com
// content via search, a guide, game rules, or an author/expert page.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/content-discovery.spec.ts --project=chrome
//   npx playwright test tests/journeys/content-discovery.spec.ts --grep @smoke
//
// Design principles:
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - URL notes:
//       * How-to guide hub: /ie/online-casinos/strategy — confirmed 200 with
//         strategy article links and /go/ CTAs.
//       * Game rules: /ie/online-casinos/blackjack used as canonical game-rules
//         page — covers rules, strategy, and operator CTAs on one template.
//       * Site search: search input uses class .search-input; results page
//         renders at /?s={query} — no dedicated /search path on IE. The input is
//         in the IE nav DOM (attached) but the interactive panel opens on the
//         global homepage `/` — SearchPage reused for open/fill (same as search.spec).
//       * Author page: /authors/larry-henry used as representative author.
//         /ie/authors redirects to /authors (global, not IE-specific).
//   - SearchPage POM reused for Journey 9.3 interactive search. Otherwise raw locators.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../../fixtures/test';
import { SearchPage } from '../../pages/SearchPage';

const BASE = 'https://www.gambling.com';

const URLS = {
    strategyHub: `${BASE}/ie/online-casinos/strategy`,
    gameRules: `${BASE}/ie/online-casinos/blackjack`,
    homepage: `${BASE}/ie`,
    /** Global homepage — header search panel opens here (not on /ie nav). */
    globalHomepage: `${BASE}/`,
    /** Global author hub — /ie/authors redirects here. */
    authorsHub: `${BASE}/authors`,
    /** Representative author page — confirmed 200 on live site. */
    authorPage: `${BASE}/authors/larry-henry`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 9.1 — How-to Guide
// Google search → beginner guide / strategy hub → read → click toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 9.1 — How-to guide (strategy hub)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.strategyHub);
        expect(response?.status(), 'Strategy hub should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke strategy hub loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/strategy\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/strategy/i);
    });

    test('@smoke strategy hub lists individual guide articles @journey', async ({ page }) => {
        // Article links render in a container that is a sibling of <main> (the
        // <main> landmark holds only the breadcrumb), so scope by the article URL
        // pattern rather than main. The trailing slash excludes the category card
        // (/ie/online-casinos/strategy) and breadcrumb (/ie/strategy).
        const guideLinks = page.locator('a[href*="/ie/online-casinos/strategy/"]');
        await expect(guideLinks.first()).toBeAttached();
        // nth(1) = at least 2 guides present
        await expect(guideLinks.nth(1)).toBeAttached();
    });

    test('@smoke strategy hub exposes commercial toplist link @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });

    test('@regression opening a strategy article exposes operator CTAs @journey', async ({ page }) => {
        const firstGuide = page.locator('a[href*="/ie/online-casinos/strategy/"]').first();
        await expect(firstGuide).toBeAttached();
        const href = await firstGuide.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : `${BASE}${href}`;
        await page.goto(fullUrl);
        await expect(page).toHaveURL(/\/ie\/online-casinos\/strategy\//);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 9.2 — Game Rules
// Google search → rules explainer → read → click operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 9.2 — Game rules (blackjack rules page)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.gameRules);
        expect(response?.status(), 'Game rules page should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke game rules page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/blackjack/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/blackjack/i);
    });

    test('@smoke game rules page exposes operator CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@smoke game rules page links to casino toplist or strategy guide @journey', async ({ page }) => {
        const relatedLink = page.locator(
            'a[href*="/ie/online-casinos/strategy/"], a[href*="/ie/online-casinos"]'
        ).first();
        await expect(relatedLink).toBeAttached();
    });

    test('@regression game rules page has meaningful in-page content @journey', async ({ page }) => {
        // Rules/how-to content section is present in the page body
        const rulesContent = page.locator('main').getByText(/how to play|rules|card/i).first();
        await expect(rulesContent).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 9.3 — Site Search
// On any page → search box → enter query → open result → result page
// Note: Search results render at /?s={query}. The input is attached in the IE nav
// DOM; the interactive search panel opens on the global homepage — SearchPage
// handles the nav icon DOM click. Results-page test navigates directly to /?s=.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 9.3 — Site search', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.homepage);
        expect(response?.status(), 'Homepage should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke search input is present on the homepage @journey', async ({ page }) => {
        await expect(page).toHaveURL(/gambling\.com\/ie\/?$/);
        const searchInput = page.locator('input.search-input').first();
        await expect(searchInput).toBeAttached();
    });

    test('@smoke search input accepts text input @journey', async ({ page }) => {
        // Interactive search panel opens on global `/`, not the IE geo nav —
        // navigates away from the beforeEach URL intentionally (same pattern as §4/5/7).
        await page.goto(URLS.globalHomepage);
        const searchPage = new SearchPage(page);
        await searchPage.searchFor('blackjack');
        await expect(searchPage.searchInput).toHaveValue('blackjack');
    });

    test('@regression search results page loads for a known query @journey', async ({ page }) => {
        // Direct /?s= navigation — leaves beforeEach IE URL intentionally.
        await page.goto(`${BASE}/?s=blackjack`);
        await expect(page).toHaveURL(/[?&]s=blackjack/);
        await expect(page.locator('main.body_content h1').first()).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 9.4 — Author / Expert Page
// Search → author page → read their picks → open a review
// Note: /ie/authors redirects to /authors (global). Individual author pages
// confirmed at /authors/{slug}.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 9.4 — Author / expert page', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.authorsHub);
        expect(response?.status(), 'Authors hub should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke authors hub loads with H1 and author links @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/authors\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/author/i);
        // Individual author card links present
        const authorLinks = page.locator('a[href*="/authors/"]');
        await expect(authorLinks.first()).toBeAttached();
    });

    test('@smoke individual author page loads with H1 @journey', async ({ page }) => {
        await page.goto(URLS.authorPage);
        await expect(page).toHaveURL(/\/authors\/larry-henry/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/larry/i);
    });

    test('@smoke author page exposes their published articles or reviews @journey', async ({ page }) => {
        await page.goto(URLS.authorPage);
        const authorContent = page.locator('a[href*="/news/"], a[href*="/online-casinos/"]').first();
        await expect(authorContent).toBeAttached();
    });

    test('@regression author article exposes operator CTAs via linked content @journey', async ({ page }) => {
        await page.goto(URLS.authorPage);
        // Geo-agnostic — Larry Henry's articles are /us/news/…; any news article
        // in the author body has in-content affiliate links once opened.
        const articleLink = page.locator('main.body_content a[href*="/news/"]').first();
        await expect(articleLink).toBeAttached();
        const href = await articleLink.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : `${BASE}${href}`;
        await page.goto(fullUrl);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.locator('main a[href*="/go/"]').first()).toBeAttached();
    });
});