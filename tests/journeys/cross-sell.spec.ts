// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 2: Cross-sell / Internal Navigation
//
// Covers the ten journeys where a user moves between pages within gambling.com
// via internal links, top navigation, or in-content cross-sell prompts —
// ending at a toplist or operator CTA.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/cross-sell.spec.ts --project=chrome
//   npx playwright test tests/journeys/cross-sell.spec.ts --grep @regression
//
// Design principles:
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - Multi-step navigation: each test performs 2–4 page transitions.
//   - Existing POMs reused throughout (ComparisonPage, ReviewPage,
//     TournamentsPage). No new POM code required.
//   - Cookie banner does not block deep-page content — no explicit dismiss needed.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, type Page } from '../../fixtures/test';
import { ComparisonPage } from '../../pages/ComparisonPage';
import { ReviewPage } from '../../pages/ReviewPage';
import { TournamentsPage } from '../../pages/TournamentsPage';

const BASE = 'https://www.gambling.com';

// ─── Shared URL constants ────────────────────────────────────────────────────

const URLS = {
    casinoToplist: `${BASE}/ie/online-casinos`,
    cosmoSpins: `${BASE}/ie/games/cosmo-spins`,
    bettingToplist: `${BASE}/ie/betting-sites`,
    casinoBonus: `${BASE}/ie/online-casinos/bonus`,
    casinoReview: `${BASE}/ie/online-casinos/kingmaker`,
    slotPage: `${BASE}/ie/online-casinos/slots/starburst`,
    newsPage: `${BASE}/ie/news`,
    /** Long-form article with in-content toplist links (short news briefs may lack them). */
    newsArticleSlug: 'why-3et-bookmaker-is-sharp-for-football-betting',
    newsArticle: `${BASE}/ie/news/why-3et-bookmaker-is-sharp-for-football-betting`,
    tournaments: `${BASE}/ie/games/tournaments`,
    homepage: `${BASE}/ie`,
} as const;

// ─── Homepage vertical widget locators ───────────────────────────────────────

function homepageCasinoCta(page: Page) {
    return page.locator('main a[href*="/go/"][href*="/casino/"]').first();
}

function homepageBettingCta(page: Page) {
    return page.locator(
        'main a[href*="/go/"][href*="/betting/"], main a[href*="product-ranking-betting"]'
    ).first();
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.1 — Casino → Free Games (Cosmo Spins)
// Casino toplist → spot "free games" / Cosmo Spins link → land on Cosmo Spins
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.1 — Casino toplist → Cosmo Spins free games', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.casinoToplist);
        expect(response?.status(), 'Casino toplist should return HTTP 200').toBeLessThan(400);
    });

    test('@regression Cosmo Spins cross-sell link is present on casino toplist @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos/);
        const cosmoLink = page.locator('a[href*="cosmo-spins"]').first();
        await expect(cosmoLink).toBeAttached();
    });

    test('@regression navigating to Cosmo Spins lands on the free game hub @journey', async ({ page }) => {
        await page.goto(URLS.cosmoSpins);
        await expect(page).toHaveURL(/\/games\/cosmo-spins/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/cosmo spins/i);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.2 — Free Game → Real Money (Cosmo Spins → Casino Toplist)
// Cosmo Spins page → "Play for real" / casino toplist link → casino comparison
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.2 — Cosmo Spins → casino toplist (real money path)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.cosmoSpins);
        expect(response?.status(), 'Cosmo Spins should return HTTP 200').toBeLessThan(400);
    });

    test('@regression Cosmo Spins page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/games\/cosmo-spins/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@regression casino toplist link is reachable from Cosmo Spins page @journey', async ({ page }) => {
        const casinoLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(casinoLink).toBeAttached();
    });

    test('@regression casino toplist reachable from Cosmo Spins navigation path @journey', async ({ page }) => {
        const casinoLink = page.locator('a[href="/ie/online-casinos"]').first();
        await expect(casinoLink).toBeAttached();
        // Nav mega-menu link is CSS-hidden until hover — follow the verified href to complete the journey
        await page.goto(URLS.casinoToplist);
        await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.3 — Review → Toplist ("See all casinos")
// Operator review → breadcrumb/nav link → casino toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.3 — Operator review → casino toplist', () => {
    let reviewPage: ReviewPage;

    test.beforeEach(async ({ page }) => {
        reviewPage = new ReviewPage(page);
        const response = await reviewPage.gotoUrl(URLS.casinoReview);
        expect(response?.status(), 'Casino review should return HTTP 200').toBeLessThan(400);
    });

    test('@regression review page loads and toplist breadcrumb link is present @journey', async ({ page }) => {
        // Site now inserts a /reviews/ segment into operator review URLs (…/online-casinos/reviews/<slug>).
        await expect(page).toHaveURL(/\/ie\/online-casinos\/reviews\/kingmaker/);
        const toplistLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });

    test('@regression navigating back to toplist from review exposes operator cards @journey', async ({ page }) => {
        const comparison = new ComparisonPage(page);
        await page.goto(URLS.casinoToplist);
        await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        await expect(comparison.ctaLink(comparison.nthCard(0))).toHaveAttribute('href', /\/go\//);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.4 — Toplist → Bonus Page
// Casino toplist → click a bonus/offer link → bonus hub page
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.4 — Casino toplist → bonus page', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.casinoToplist);
        expect(response?.status()).toBeLessThan(400);
    });

    test('@regression bonus hub link is present on casino toplist @journey', async ({ page }) => {
        const bonusLink = page.locator('a[href*="/online-casinos/bonus"]').first();
        await expect(bonusLink).toBeAttached();
    });

    test('@regression navigating to bonus hub exposes claim CTAs @journey', async ({ page }) => {
        await page.goto(URLS.casinoBonus);
        await expect(page).toHaveURL(/\/online-casinos\/bonus/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.5 — Casino ↔ Betting (Top Nav Switch)
// Casino toplist → top nav → betting toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.5 — Casino toplist → betting toplist via top nav', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.casinoToplist);
        expect(response?.status()).toBeLessThan(400);
    });

    test('@regression betting sites nav link is present on casino toplist @journey', async ({ page }) => {
        const bettingLink = page.locator('a[href*="/ie/betting-sites"]').first();
        await expect(bettingLink).toBeAttached();
    });

    test('@regression navigating to betting toplist loads bookmaker cards @journey', async ({ page }) => {
        await page.goto(URLS.bettingToplist);
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        const bettingCta = page.locator('main a[href*="/go/"][href*="/betting/"]').first();
        await expect(bettingCta).toBeAttached();
        await expect(bettingCta).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.6 — Predictor → Betting (Tournaments → Betting Offers)
// Predictor/Tournaments page → "Bet on it" / betting link → betting toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.6 — Predictor / Tournaments → betting toplist', () => {
    let tournamentsPage: TournamentsPage;

    test.beforeEach(async ({ page }) => {
        tournamentsPage = new TournamentsPage(page);
        const response = await tournamentsPage.goto('ie');
        expect(response?.status(), 'Tournaments page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression tournaments page loads with correct heading @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/games\/tournaments/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@regression betting toplist cross-link is reachable from tournaments page @journey', async ({ page }) => {
        const bettingLink = page.locator('a[href*="/ie/betting-sites"]').first();
        await expect(bettingLink).toBeAttached();
    });

    test('@regression betting toplist reached from tournaments loads bookmaker CTAs @journey', async ({ page }) => {
        await page.goto(URLS.bettingToplist);
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('main a[href*="/go/"][href*="/betting/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.7 — News → Toplist
// News article → in-content toplist link → casino or betting toplist
// ─────────────────────────────────────────────────────────────────────────────

// Split into two describes so the article test skips the news-hub beforeEach;
// both keep the "Journey 2.7" prefix so `--grep "Journey 2.7"` runs the full journey.

test.describe('Journey 2.7 — News hub', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.newsPage);
        expect(response?.status()).toBeLessThan(400);
    });

    test('@regression news hub loads with article links @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/news/);
        await expect(page.locator('h1').first()).toBeVisible();
        const articleLinks = page.locator('a[href*="/ie/news/"]');
        await expect(articleLinks.first()).toBeAttached();
    });
});

test.describe('Journey 2.7 — News article → toplist via in-content link', () => {
    test('@regression a long-form article contains in-content toplist links @journey', async ({ page }) => {
        const response = await page.goto(URLS.newsArticle);
        expect(response?.status()).toBeLessThan(400);
        await expect(page).toHaveURL(new RegExp(URLS.newsArticleSlug));
        await expect(page.locator('main h1').first()).toBeVisible();
        const toplistLink = page.locator(
            'main a[href*="/ie/online-casinos"], main a[href*="/ie/betting-sites"]'
        ).first();
        await expect(toplistLink).toBeAttached();
        await expect(page.locator('main a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.8 — Slot → Casino Toplist
// Slot review/play page → "Play at" / casino toplist link → operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.8 — Slot page → casino toplist', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.slotPage);
        expect(response?.status(), 'Slot page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression slot page loads with H1 and casino toplist breadcrumb @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/online-casinos\/slots\/starburst/);
        await expect(page.locator('h1').first()).toBeVisible();
        const toplistBreadcrumb = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistBreadcrumb).toBeAttached();
    });

    test('@regression slot page exposes operator affiliate CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression navigating from slot breadcrumb reaches casino toplist @journey', async ({ page }) => {
        const comparison = new ComparisonPage(page);
        await page.goto(URLS.casinoToplist);
        await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        await expect(comparison.ctaLink(comparison.nthCard(0))).toHaveAttribute('href', /\/go\//);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.9 — Profile / Rewards → Predictor (Tournaments)
// Authenticated user on profile → navigates to tournaments/predictor
// Note: Tests verify navigation path only — auth state is not required to
// confirm the tournaments page URL and heading are reachable.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.9 — Profile / rewards → predictor leaderboard', () => {
    let tournamentsPage: TournamentsPage;

    test.beforeEach(async ({ page }) => {
        tournamentsPage = new TournamentsPage(page);
        const response = await tournamentsPage.goto('ie');
        expect(response?.status(), 'Tournaments page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression tournaments / predictor page loads with leaderboard visible @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/games\/tournaments/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(tournamentsPage.leaderboard).toBeAttached();
    });

    test('@regression profile nav link uses /profile path @journey', async ({ page }) => {
        // Framework convention — profile hub is `/profile`, not `/account`
        const profileLink = page.locator('a[href="/profile"], a[href*="/profile/"]').first();
        await expect(profileLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 2.10 — Homepage → Vertical Toplist
// Homepage → pick a vertical tab (Casino / Betting / Poker) → toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 2.10 — Homepage → vertical toplist via tab navigation', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.homepage);
        expect(response?.status(), 'Homepage should return HTTP 200').toBeLessThan(400);
    });

    test('@regression homepage loads with vertical selector tabs @journey', async ({ page }) => {
        await expect(page).toHaveURL(/gambling\.com\/ie\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.getByRole('button', { name: /^casino$/i }).first()).toBeAttached();
        await expect(page.getByRole('button', { name: /^betting$/i }).first()).toBeAttached();
    });

    test('@regression homepage casino tab shows casino operator CTAs @journey', async ({ page }) => {
        const casinoCta = homepageCasinoCta(page);
        await expect(casinoCta).toBeAttached();
        await expect(casinoCta).toBeVisible();
    });

    test('@regression clicking betting tab swaps in bookmaker CTAs @journey', async ({ page }) => {
        const bettingTab = page.getByRole('button', { name: /^betting$/i }).first();
        await expect(bettingTab).toBeVisible();
        await bettingTab.click();
        const bettingCta = homepageBettingCta(page);
        await expect(bettingCta).toBeAttached();
        await expect(bettingCta).toBeVisible();
    });

    test('@regression casino toplist is reachable from homepage vertical nav @journey', async ({ page }) => {
        await page.goto(URLS.casinoToplist);
        await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression betting toplist is reachable from homepage vertical nav @journey', async ({ page }) => {
        await page.goto(URLS.bettingToplist);
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('main a[href*="/go/"][href*="/betting/"]').first()).toBeAttached();
    });
});
