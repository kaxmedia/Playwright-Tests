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
//   npx playwright test tests/journeys/content-discovery.spec.ts --grep @regression
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
import { GDC_ORIGIN, IE_URLS, gotoOk, resolveGdcHref, assertMainGoCtaPresent } from '../helpers/journeys';

const URLS = {
    strategyHub: IE_URLS.strategyHub,
    gameRules: `${GDC_ORIGIN}/ie/online-casinos/blackjack`,
    homepage: IE_URLS.homepage,
    /** Global homepage — header search panel opens here (not on /ie nav). */
    globalHomepage: `${GDC_ORIGIN}/`,
    /** Global author hub — /ie/authors redirects here. */
    authorsHub: `${GDC_ORIGIN}/authors`,
    /** Representative author page — confirmed 200 on live site. */
    authorPage: `${GDC_ORIGIN}/authors/larry-henry`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 9.1 — How-to Guide
// Google search → beginner guide / strategy hub → read → click toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 9.1 — How-to guide (strategy hub)', () => {
    test.beforeEach(async ({ page }) => {
        await gotoOk(page, URLS.strategyHub, 'Strategy hub');
    });

    test('@regression strategy hub loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/strategy\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/strategy/i);
    });

    test('@regression strategy hub lists individual guide articles @journey', async ({ page }) => {
        // Article links render in a container that is a sibling of <main> (the
        // <main> landmark holds only the breadcrumb), so scope by the article URL
        // pattern rather than main. The trailing slash excludes the category card
        // (/ie/online-casinos/strategy) and breadcrumb (/ie/strategy).
        const guideLinks = page.locator('a[href*="/ie/online-casinos/strategy/"]');
        await expect(guideLinks.first()).toBeAttached();
        // nth(1) = at least 2 guides present
        await expect(guideLinks.nth(1)).toBeAttached();
    });

    test('@regression strategy hub exposes commercial toplist link @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });

    test('@regression opening a strategy article exposes operator CTAs @journey', async ({ page }) => {
        const firstGuide = page.locator('a[href*="/ie/online-casinos/strategy/"]').first();
        await expect(firstGuide).toBeAttached();
        const href = await firstGuide.getAttribute('href');
        const fullUrl = resolveGdcHref(href ?? '');
        await page.goto(fullUrl);
        await expect(page).toHaveURL(/\/ie\/online-casinos\/strategy\//);
        await expect(page.locator('main h1').first()).toBeVisible();
        await assertMainGoCtaPresent(page);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 9.2 — Game Rules
// Google search → rules explainer → read → click operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 9.2 — Game rules (blackjack rules page)', () => {
    test.beforeEach(async ({ page }) => {
        await gotoOk(page, URLS.gameRules, 'Game rules page');
    });

    test('@regression game rules page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/blackjack/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/blackjack/i);
    });

    test('@regression game rules page exposes operator CTAs @journey', async ({ page }) => {
        await assertMainGoCtaPresent(page);
    });

    test('@regression game rules page links to casino toplist or strategy guide @journey', async ({ page }) => {
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
        await gotoOk(page, URLS.homepage, 'Homepage');
    });

    test('@regression search input is present on the homepage @journey', async ({ page }) => {
        await expect(page).toHaveURL(/gambling\.com\/ie\/?$/);
        const searchInput = page.locator('input.search-input').first();
        await expect(searchInput).toBeAttached();
    });

    test('@regression search input accepts text input @journey', async ({ page }) => {
        // Interactive search panel opens on global `/`, not the IE geo nav —
        // navigates away from the beforeEach URL intentionally (same pattern as §4/5/7).
        await page.goto(URLS.globalHomepage);
        const searchPage = new SearchPage(page);
        await searchPage.searchFor('blackjack');
        await expect(searchPage.searchInput).toHaveValue('blackjack');
    });

    test('@regression search results page loads for a known query @journey', async ({ page }) => {
        // Direct /?s= navigation — leaves beforeEach IE URL intentionally.
        await gotoOk(page, `${GDC_ORIGIN}/?s=blackjack`, 'Search results page');
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
        await gotoOk(page, URLS.authorsHub, 'Authors hub');
    });

    test('@regression authors hub loads with H1 and author links @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/authors\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/author/i);
        // Individual author card links present
        const authorLinks = page.locator('a[href*="/authors/"]');
        await expect(authorLinks.first()).toBeAttached();
    });

    test('@regression individual author page loads with H1 @journey', async ({ page }) => {
        await gotoOk(page, URLS.authorPage, 'Author page');
        await expect(page).toHaveURL(/\/authors\/larry-henry/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/larry/i);
    });

    test('@regression author page exposes their published articles or reviews @journey', async ({ page }) => {
        await gotoOk(page, URLS.authorPage, 'Author page');
        const authorContent = page.locator('a[href*="/news/"], a[href*="/online-casinos/"]').first();
        await expect(authorContent).toBeAttached();
    });

    test('@regression author article exposes operator CTAs via linked content @journey', async ({ page }) => {
        await gotoOk(page, URLS.authorPage, 'Author page');
        // Geo-agnostic — Larry Henry's articles are /us/news/…. The NEWEST linked article isn't
        // guaranteed to carry an in-content /go/ CTA: legislative, "WATCH" video, and responsible-
        // gambling pieces legitimately have none, and the newest slot rotates between runs (so the
        // old blind .first() failed intermittently on a different article each time — verified live
        // 2026-08). Sample several recent linked articles and assert AT LEAST ONE exposes an
        // operator CTA, mirroring the Journey 8.8 news-reader fix.
        const hrefs = await page.locator('main.body_content a[href*="/news/"]').evaluateAll((els) =>
            [...new Set(els.map((e) => e.getAttribute('href')))]
                .filter((h): h is string => !!h && /\/news\/[^/?#]+/.test(h))
                .slice(0, 6)
        );
        expect(hrefs.length, 'Expected linked news articles in the author body').toBeGreaterThan(0);

        let found = false;
        for (const href of hrefs) {
            await page.goto(resolveGdcHref(href));
            await expect(page.locator('main h1').first()).toBeVisible();
            if ((await page.locator('main a[href*="/go/"]').count()) > 0) {
                found = true;
                break;
            }
        }
        expect(found, 'Expected at least one recent author-linked article to expose an operator /go/ CTA').toBe(true);
    });
});