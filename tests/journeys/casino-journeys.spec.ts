// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 3: Casino Journeys
//
// Covers the twelve casino-specific journeys where a user researches, browses,
// or compares casino products and ends at an operator CTA.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/casino-journeys.spec.ts --project=chrome
//   npx playwright test tests/journeys/casino-journeys.spec.ts --grep @regression
//
// Design principles:
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - Every describe block has an HTTP 200 guard in beforeEach.
//   - Existing POMs reused (ComparisonPage, ReviewPage). No new POM code.
//   - URL note: several legacy IE sub-paths redirect to the main toplist or apps hub:
//     /live and /bitcoin → /ie/online-casinos; /mobile → /ie/online-casinos/apps.
//     Fast payout and live dealer are named sections on the main toplist.
//     Safe casinos journey uses the how-we-review guide (no /safe-casinos page).
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../../fixtures/test';
import { ComparisonPage } from '../../pages/ComparisonPage';
import { ReviewPage } from '../../pages/ReviewPage';

const BASE = 'https://www.gambling.com';

function resolveHref(href: string): string {
    return /^https?:\/\//i.test(href) ? href : `${BASE}${href}`;
}

// ─── URL constants ────────────────────────────────────────────────────────────

const URLS = {
    casinoToplist: `${BASE}/ie/online-casinos`,
    newCasinos: `${BASE}/ie/online-casinos/new`,
    slotsCasinos: `${BASE}/ie/online-casinos/slots`,
    liveCasinos: `${BASE}/ie/online-casinos/live`, // redirects to main toplist
    mobileCasinos: `${BASE}/ie/online-casinos/apps`, // /mobile redirects here
    cryptoCasinos: `${BASE}/ie/online-casinos/bitcoin`, // redirects to main toplist
    paymentCasinos: `${BASE}/ie/online-casinos/paypal`,
    howWeReview: `${BASE}/ie/reviews/casino`,
    casinoReview: `${BASE}/ie/online-casinos/kingmaker`,
    slotPage: `${BASE}/ie/online-casinos/slots/starburst`,
    strategyHub: `${BASE}/ie/online-casinos/strategy`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.1 — Casino Research
// Google search → casino toplist → compare operators → click operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.1 — Casino research via toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.casinoToplist);
        expect(response?.status(), 'Casino toplist should return HTTP 200').toBeLessThan(400);
    });

    test('@regression toplist loads with H1 and multiple operator cards @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(4) is the 5th card — confirms at least five operators without a non-retrying count().
        await expect(comparison.cards.nth(4)).toBeAttached();
    });

    test('@regression first operator card exposes logo, name, and affiliate CTA @journey', async ({ page }) => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.2 — New Casinos
// Google search → "new casinos" page → compare latest → operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.2 — New casinos page', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.newCasinos);
        expect(response?.status(), 'New casinos page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression new casinos page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/new/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/new.*casino|casino.*new/i);
    });

    test('@regression new casinos page exposes operator CTAs @journey', async ({ page }) => {
        const ctas = page.locator('a[href*="/go/"]');
        await expect(ctas.first()).toBeAttached();
        await expect(ctas.nth(2)).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.3 — Slots Casinos
// Google search → slots casino page → compare slot sites → operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.3 — Slots casinos page', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.slotsCasinos);
        expect(response?.status(), 'Slots casino page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression slots casino page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/slots\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/slot/i);
    });

    test('@regression slots casino page exposes operator CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression slots page links to individual slot game reviews @journey', async ({ page }) => {
        const slotLink = page.locator('a[href*="/ie/online-casinos/slots/"]').first();
        await expect(slotLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.4 — Live Casinos
// Google search → live casino page → compare live sites → operator CTA
// Note: /ie/online-casinos/live redirects to the main toplist. Live dealer
// operators live under #anchor_live_dealer_casinos on that page.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.4 — Live casinos (toplist section)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.liveCasinos);
        expect(response?.status(), 'Live casino entry URL should return HTTP 200').toBeLessThan(400);
    });

    test('@regression legacy live URL lands on the casino toplist @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@regression live dealer section is present on the toplist @journey', async ({ page }) => {
        await expect(page.getByRole('heading', { name: /live dealer/i }).first()).toBeAttached();
    });

    test('@regression live casino operators expose affiliate CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.5 — Mobile Casinos
// Google search → mobile casino page → compare apps → operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.5 — Mobile casinos / apps page', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.mobileCasinos);
        expect(response?.status(), 'Mobile casino apps page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression mobile casino apps page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/apps\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/mobile|app/i);
    });

    test('@regression mobile casino page exposes operator CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression apps page links back to main casino toplist @journey', async ({ page }) => {
        // Exact href — root toplist only; `href*=` would also match sub-pages like /bonus or /apps.
        const toplistLink = page.locator('a[href="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.6 — Fast Payouts
// Google search → fast-payout section on main toplist → operator CTA
// Note: No dedicated /fast-payout sub-page exists on IE. The fast-payout
// content is a named section within /ie/online-casinos itself.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.6 — Fast payout casinos (toplist section)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.casinoToplist);
        expect(response?.status(), 'Casino toplist should return HTTP 200').toBeLessThan(400);
    });

    test('@regression fast payout section or content is present on the casino toplist @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos/);
        // Fast payout content is a named section within the toplist page
        const fastPayoutContent = page.locator(
            '[id*="fast"], [id*="payout"], h2:has-text("Fast"), h3:has-text("Fast"), h2:has-text("Payout"), h3:has-text("Payout")'
        ).first();
        await expect(fastPayoutContent).toBeAttached();
    });

    test('@regression fast payout operators expose affiliate CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.7 — Crypto Casinos
// Google search → crypto casino page → compare by crypto → operator CTA
// Note: /ie/online-casinos/bitcoin redirects to the main toplist (no dedicated page).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.7 — Crypto / Bitcoin casinos (legacy URL → toplist)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.cryptoCasinos);
        expect(response?.status(), 'Bitcoin casino entry URL should return HTTP 200').toBeLessThan(400);
    });

    test('@regression legacy bitcoin URL lands on the casino toplist @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@regression redirected toplist exposes operator CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.8 — Payment Method
// Google search → PayPal/payment page → compare by method → operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.8 — Payment method casino page (PayPal)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.paymentCasinos);
        expect(response?.status(), 'PayPal casino page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression PayPal casino page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/paypal/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/paypal/i);
    });

    test('@regression PayPal casino page exposes operator CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression payment page links back to main casino toplist @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.9 — Safe / Licensed Casinos
// Google search → safe casinos / licensing guide → check licensing → operator CTA
// Note: No dedicated /safe-casinos page on IE. The "how we review" guide
// covers licensing, safety criteria, and links to the main toplist.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.9 — Safe / licensed casinos (how-we-review guide)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.howWeReview);
        expect(response?.status(), 'How-we-review page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression how-we-review guide loads with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/reviews\/casino/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@regression licensing / safety content is present in the guide @journey', async ({ page }) => {
        await expect(
            page.locator('main').getByText(/licens|regulat|safe|trusted/i).first()
        ).toBeAttached();
    });

    test('@regression guide links back to casino toplist for operator comparison @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.10 — Operator Review
// Brand search → operator review → read rating → click "Visit site" CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.10 — Operator review page', () => {
    let reviewPage: ReviewPage;

    test.beforeEach(async ({ page }) => {
        reviewPage = new ReviewPage(page);
        const response = await reviewPage.gotoUrl(URLS.casinoReview);
        expect(response?.status(), 'Casino review should return HTTP 200').toBeLessThan(400);
    });

    test('@regression review page loads with H1 and rating widget @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/kingmaker/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(reviewPage.ratingContainer).toBeVisible({ timeout: 15_000 });
        await expect(reviewPage.ratingScore).toBeVisible();
        const score = parseFloat((await reviewPage.ratingScore.innerText()).trim());
        expect(score).toBeGreaterThan(0);
        expect(score).toBeLessThanOrEqual(10);
    });

    test('@regression review exposes a primary Visit Site / Play Now affiliate CTA @journey', async ({ page }) => {
        await expect(reviewPage.ctaButton).toBeVisible();
        await expect(reviewPage.ctaButton).toHaveAttribute('href', /\/go\//);
    });

    test('@regression review hero shows a bonus offer block @journey', async ({ page }) => {
        await expect(reviewPage.bonusOfferBox).toBeVisible({ timeout: 15_000 });
        const text = await reviewPage.bonusOfferBox.innerText();
        expect(text.trim().length).toBeGreaterThan(0);
    });

    test('@regression review links back to the casino toplist @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.11 — Slot Game
// Google search → slot review/play page → read/demo → "Play for real" CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.11 — Slot game review / play page', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.slotPage);
        expect(response?.status(), 'Slot page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression slot page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/slots\/starburst/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/starburst/i);
    });

    test('@regression slot page exposes "Play for real" operator CTA @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
        await expect(page.locator('a[href*="/go/"]').first()).toBeVisible();
    });

    test('@regression slot page links to parent slots toplist @journey', async ({ page }) => {
        const slotsLink = page.locator('a[href*="/ie/online-casinos/slots"]').first();
        await expect(slotsLink).toBeAttached();
    });

    test('@regression slot page links back to casino toplist @journey', async ({ page }) => {
        const casinoLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(casinoLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 3.12 — Casino Strategy
// Google search → strategy guide → read how-to → click toplist link
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 3.12 — Casino strategy guide', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.strategyHub);
        expect(response?.status(), 'Strategy hub should return HTTP 200').toBeLessThan(400);
    });

    test('@regression strategy hub loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/strategy\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/strategy/i);
    });

    test('@regression strategy hub lists individual guide articles @journey', async ({ page }) => {
        // Article links render in a content container that is a sibling of <main>
        // (the <main> landmark holds only the breadcrumb), so scope by the article
        // URL pattern rather than the main landmark. The trailing slash excludes the
        // category card (/ie/online-casinos/strategy) and breadcrumb (/ie/strategy).
        const guideLinks = page.locator('a[href*="/ie/online-casinos/strategy/"]');
        await expect(guideLinks.first()).toBeAttached();
        await expect(guideLinks.nth(1)).toBeAttached();
    });

    test('@regression strategy hub exposes commercial paths to casino toplist @journey', async ({ page }) => {
        const toplistLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(toplistLink).toBeAttached();
    });

    test('@regression opening a strategy article exposes affiliate CTAs @journey', async ({ page }) => {
        const firstGuide = page.locator('a[href*="/ie/online-casinos/strategy/"]').first();
        await expect(firstGuide).toBeAttached();
        const href = await firstGuide.getAttribute('href') ?? '';
        expect(href.trim().length).toBeGreaterThan(0);
        await page.goto(resolveHref(href));
        await expect(page).toHaveURL(/\/ie\/online-casinos\/strategy\//);
        await expect(page.locator('main h1').first()).toBeVisible();
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});