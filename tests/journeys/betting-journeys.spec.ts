// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 5: Sports / Betting Journeys
//
// Covers the eleven sports/betting journeys where a user researches, compares,
// or follows tips and ends at a bookmaker CTA or predictor confirmation.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/betting-journeys.spec.ts --project=chrome
//   npx playwright test tests/journeys/betting-journeys.spec.ts --grep @regression
//
// Design principles:
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - URL notes:
//       * /in-play, /best-odds-guaranteed, and /bet-builder redirect to the IE
//         betting toplist — journeys assert landing URL and on-page section copy.
//       * /football and /horse-racing redirect away from IE — sport journeys use
//         named H2 sections on the main betting toplist instead.
//       * No dedicated /odds page on IE — Journey 5.7 uses /best-odds-guaranteed.
//       * No dedicated /acca page on IE — Journey 5.8 uses /bet-builder.
//       * No dedicated live-scores page on IE — Journey 5.9 uses the betting
//         toplist which features live score widgets / livescore-bet bookmaker.
//       * No dedicated tips page on IE — Journey 5.11 uses /ie/news which
//         hosts betting tips articles.
//       * World Cup predictor (Journey 5.12) uses /ie/games/tournaments —
//         the same tournaments page used in Section 2 journeys.
//   - Existing POMs reused: ComparisonPage, ReviewPage, TournamentsPage.
//   - No new POM code.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, type Page } from '../../fixtures/test';
import { ComparisonPage } from '../../pages/ComparisonPage';
import { ReviewPage } from '../../pages/ReviewPage';
import { TournamentsPage } from '../../pages/TournamentsPage';

const BASE = 'https://www.gambling.com';

const URLS = {
    bettingToplist: `${BASE}/ie/betting-sites`,
    bettingApps: `${BASE}/ie/betting-sites/apps`,
    freeBets: `${BASE}/ie/betting-sites/free-bets`,
    /** Legacy path — redirects to the betting toplist. */
    inPlay: `${BASE}/ie/betting-sites/in-play`,
    /** Legacy path — redirects to the homepage; sport content is on the toplist. */
    football: `${BASE}/ie/betting-sites/football`,
    horseRacing: `${BASE}/ie/betting-sites/horse-racing`,
    /** Legacy path — redirects to the betting toplist. */
    bestOdds: `${BASE}/ie/betting-sites/best-odds-guaranteed`,
    /** Legacy path — redirects to the betting toplist. */
    betBuilder: `${BASE}/ie/betting-sites/bet-builder`,
    bookmakerReview: `${BASE}/ie/betting-sites/bet365`,
    news: `${BASE}/ie/news`,
    tournaments: `${BASE}/ie/games/tournaments`,
} as const;

/** Betting reviews use operator-item-v2 hero CTAs, not casino `btn-cta-play-now`. */
function bettingReviewCta(page: Page) {
    return page.locator(
        'main.body_content a.automation-play-now-cta[href*="/go/"], main.body_content a.operator-item__cta_link[href*="/go/"]'
    ).first();
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.1 — Betting Research
// Google search → betting toplist → compare bookmakers → bookmaker CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.1 — Betting research via toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bettingToplist);
        expect(response?.status(), 'Betting toplist should return HTTP 200').toBeLessThan(400);
    });

    test('@regression toplist loads with H1 and operator cards @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(4) = at least 5 cards present (0-indexed)
        await expect(comparison.cards.nth(4)).toBeAttached();
    });

    test('@regression first bookmaker card exposes logo, name, and affiliate CTA @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.2 — Betting Apps
// Google search → betting apps page → compare apps → bookmaker CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.2 — Betting apps page', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bettingApps);
        expect(response?.status(), 'Betting apps page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression betting apps page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/apps/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/app/i);
    });

    test('@regression betting apps page exposes bookmaker CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.3 — Free Bets
// Google search → free-bets page → find offer → click claim CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.3 — Free bets page', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.freeBets);
        expect(response?.status(), 'Free bets page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression free bets page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/free-bets/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/free.?bet/i);
    });

    test('@regression free bets page exposes bookmaker CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression free bets page links back to betting toplist @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/betting-sites"]').first();
        await expect(toplistLink).toBeAttached();
    });

    test('@regression free bets offer text is present on first card @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        const offer = await comparison.offerText(firstCard);
        expect(offer?.trim().length, 'First card should expose free bet offer copy').toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.4 — In-Play Betting
// Google search → in-play page (redirects to toplist) → live betting content → CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.4 — In-play betting (betting toplist)', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.inPlay);
        expect(response?.status(), 'In-play entry should return HTTP 200').toBeLessThan(400);
    });

    test('@regression in-play entry lands on betting toplist with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(page.locator('main.body_content h1').first()).toBeVisible();
    });

    test('@regression in-play journey surfaces live betting content and bookmaker CTAs @journey', async ({ page }) => {
        await expect(page.locator('main.body_content').getByText(/live betting/i).first()).toBeAttached();
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.5 — Event Offers
// Search / event → event-offer page → grab sign-up offer → bookmaker CTA
// Note: No dedicated event-offers page on IE. Free-bets page is the closest
// equivalent — it surfaces time-limited sign-up offers tied to events.
// Intentionally reuses the same URL and assertions as Journey 5.3 so each
// Confluence journey ID maps to its own describe block in this file.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.5 — Event offers (free-bets page)', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.freeBets);
        expect(response?.status(), 'Free bets / event offers page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression event offers page loads with sign-up offers @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/free-bets/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
    });

    test('@regression event offer CTAs are present for each bookmaker @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.6 — Sport-Specific
// Google search → football or racing page → compare sites → bookmaker CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.6 — Sport-specific pages (football & horse racing)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.bettingToplist);
        expect(response?.status(), 'Betting toplist should return HTTP 200').toBeLessThan(400);
    });

    test('@regression football betting section is present on the toplist with bookmaker CTAs @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(
            page.locator('main.body_content h2').filter({ hasText: /football betting/i }).first()
        ).toBeAttached();
        await expect(page.locator('main.body_content a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression horse racing betting section is present on the toplist with bookmaker CTAs @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(
            page.locator('main.body_content h2').filter({ hasText: /horse racing betting/i }).first()
        ).toBeAttached();
        await expect(page.locator('main.body_content a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression sport-specific pages link back to betting toplist @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/betting-sites"]').first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.7 — Odds Comparison
// Google search → odds page → compare prices → best odds CTA
// Note: No plain /odds page on IE. /best-odds-guaranteed is the canonical
// odds-focused page — covers best odds guaranteed promotions.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.7 — Odds comparison (best-odds-guaranteed page)', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bestOdds);
        expect(response?.status(), 'Best odds page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression best odds entry lands on betting toplist with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(page.locator('main.body_content h1').first()).toBeVisible();
        await expect(page.locator('main.body_content').getByText(/best odds/i).first()).toBeAttached();
    });

    test('@regression best odds page exposes bookmaker CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.8 — Acca / Bet Builder
// Search → bet-builder offers → read offer → bookmaker CTA
// Note: No /acca page on IE. /bet-builder is the canonical acca/builder page.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.8 — Acca / bet builder page', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.betBuilder);
        expect(response?.status(), 'Bet builder page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression bet builder entry lands on betting toplist with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        await expect(page.locator('main.body_content h1').first()).toBeVisible();
        await expect(page.locator('main.body_content').getByText(/bet builder|acca/i).first()).toBeAttached();
    });

    test('@regression bet builder page exposes bookmaker CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression bet builder page links back to betting toplist @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/betting-sites"]').first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.9 — Live Scores
// Search → scores/results page → check a result → bookmaker CTA
// Note: No dedicated live-scores page on IE. The betting toplist features
// livescore-bet as a listed bookmaker and surfaces live score content.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.9 — Live scores (betting toplist)', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bettingToplist);
        expect(response?.status(), 'Betting toplist should return HTTP 200').toBeLessThan(400);
    });

    test('@regression betting toplist references live scores / livescore bookmaker @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/?$/);
        // Livescore-bet is listed as a bookmaker on the toplist
        const livescoreLink = page.locator('a[href*="livescore"]').first();
        await expect(livescoreLink).toBeAttached();
    });

    test('@regression bookmaker CTAs are present for live-score journey @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.10 — Bookmaker Review
// Brand search → bookmaker review → read rating → click "Visit site" CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.10 — Bookmaker review page', () => {
    let reviewPage: ReviewPage;

    test.beforeEach(async ({ page }) => {
        reviewPage = new ReviewPage(page);
        const response = await reviewPage.gotoUrl(URLS.bookmakerReview);
        expect(response?.status(), 'Bookmaker review should return HTTP 200').toBeLessThan(400);
    });

    test('@regression bookmaker review loads with H1 and rating score @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/betting-sites\/bet365/);
        await expect(page.locator('main.body_content h1').first()).toBeVisible();
        await expect(reviewPage.ratingContainer).toBeVisible({ timeout: 15_000 });
        await expect(reviewPage.ratingScore).toBeVisible();
        const score = parseFloat((await reviewPage.ratingScore.innerText()).trim());
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(10);
    });

    test('@regression bookmaker review exposes Visit Site affiliate CTA @journey', async ({ page }) => {
        const cta = bettingReviewCta(page);
        await expect(cta).toBeVisible();
        await expect(cta).toHaveAttribute('href', /\/go\//);
    });

    test('@regression bookmaker review shows a bonus offer block @journey', async () => {
        await expect(reviewPage.bonusOfferBox).toBeVisible({ timeout: 15_000 });
        const text = await reviewPage.bonusOfferBox.innerText();
        expect(text.trim().length).toBeGreaterThan(0);
    });

    test('@regression bookmaker review links back to betting toplist @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/betting-sites"]').first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.11 — Betting Tips
// Google / social → tips article → read tips → bookmaker CTA
// Note: No dedicated /betting-tips page on IE. Betting tips content lives in
// news articles on /ie/news — the same pattern as Journey 1.4 / 2.7.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.11 — Betting tips (news article)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.news);
        expect(response?.status(), 'News hub should return HTTP 200').toBeLessThan(400);
    });

    test('@regression news hub loads with article links for tips content @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/news/);
        await expect(page.locator('h1').first()).toBeVisible();
        const articleLinks = page.locator('a[href*="/ie/news/"]');
        await expect(articleLinks.first()).toBeAttached();
    });

    test('@regression an article from the news hub contains in-content bookmaker links @journey', async ({ page }) => {
        // Newest hub stories are often corporate/news without bookmaker CTAs — scan
        // recent articles until one exposes a betting toplist or /go/ link.
        const articles = page.locator('a[href*="/ie/news/"]');
        const articleCount = await articles.count();
        expect(articleCount, 'News hub should list article links').toBeGreaterThan(0);

        let foundBettingLink = false;
        const checkUpTo = Math.min(articleCount, 12);
        for (let i = 0; i < checkUpTo; i++) {
            const href = await articles.nth(i).getAttribute('href');
            if (!href || href.replace(/\/$/, '').endsWith('/ie/news')) continue;
            const fullUrl = href.startsWith('http') ? href : `${BASE}${href}`;
            await page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
            if (!/\/ie\/news\//.test(page.url())) continue;
            await expect(page.locator('main h1').first()).toBeVisible();
            const bettingLink = page.locator(
                'main a[href*="/ie/betting-sites"], main a[href*="/go/"], main a[href*="/betting"]'
            ).first();
            if (await bettingLink.count()) {
                await expect(bettingLink).toBeAttached();
                foundBettingLink = true;
                break;
            }
        }
        expect(
            foundBettingLink,
            'Expected at least one recent IE news article with in-content betting /go/ links',
        ).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 5.12 — World Cup Predictor
// Homepage → predictor game → make predictions → submit → confirmation
// Note: Tests verify UI state only — no form submissions are made.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 5.12 — World Cup / tournament predictor', () => {
    let tournamentsPage: TournamentsPage;

    test.beforeEach(async ({ page }) => {
        tournamentsPage = new TournamentsPage(page);
        const response = await tournamentsPage.goto('ie');
        expect(response?.status(), 'Tournaments page should return HTTP 200').toBeLessThan(400);
        test.skip(!(await tournamentsPage.hasActiveTournament()), 'No active tournament currently live');
    });

    test('@regression predictor page loads with H1 and leaderboard @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/games\/tournaments/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(tournamentsPage.leaderboard).toBeAttached();
    });

    test('@regression predictor entry mechanism is present on the page @journey', async () => {
        await expect(tournamentsPage.unauthCta).toBeAttached();
    });

    test('@regression homepage exposes a link to the predictor @journey', async ({ page }) => {
        await page.goto(`${BASE}/ie`);
        const predictorLink = page.locator('a[href*="/ie/games/tournaments"]').first();
        await expect(predictorLink).toBeAttached();
    });
});