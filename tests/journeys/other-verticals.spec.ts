// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 6: Other Verticals
//
// Covers the four other-vertical journeys: Poker, Bingo, Lottery, and
// Sweepstakes/Social. Each journey follows the same pattern: Google search →
// vertical toplist → compare operators → click operator CTA.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/other-verticals.spec.ts --project=chrome
//   npx playwright test tests/journeys/other-verticals.spec.ts --grep @smoke
//
// Design principles:
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - URL notes:
//       * Poker: /ie/poker-sites (not /ie/poker — 404 on IE)
//       * Bingo: /ie/bingo-sites and /ie/online-bingo both return 200 with the
//         same content — /ie/bingo-sites used as canonical.
//       * Lottery: /ie/lottery (not /ie/lotto — 404 on IE)
//       * Sweepstakes/Social: no dedicated sweepstakes page exists on IE.
//         Journey 6.4 uses /ie/casino-games — legacy path redirects to
//         /ie/online-casinos/slots/games (slot games hub, not an operator oplist).
//   - ComparisonPage POM reused for 6.1–6.3 toplists. Journey 6.4 uses raw
//     locators because the slots/games hub is a game grid, not operator cards.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../../fixtures/test';
import { ComparisonPage } from '../../pages/ComparisonPage';

const BASE = 'https://www.gambling.com';

const URLS = {
    poker: `${BASE}/ie/poker-sites`,
    bingo: `${BASE}/ie/bingo-sites`,
    lottery: `${BASE}/ie/lottery`,
    /** Legacy path — redirects to /ie/online-casinos/slots/games (slots hub). */
    casinoGames: `${BASE}/ie/casino-games`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 6.1 — Poker
// Google search → poker toplist → compare rooms → click operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 6.1 — Poker toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.poker);
        expect(response?.status(), 'Poker sites page should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke poker toplist loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/poker-sites/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/poker/i);
    });

    test('@smoke poker toplist lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(2) = at least 3 cards (live IE page has 6 operator rows)
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@smoke poker toplist exposes operator name and logo @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });

    test('@regression poker toplist breadcrumb links back to IE homepage @journey', async ({ page }) => {
        const homeBreadcrumb = page.locator(
            'nav#breadcrumb a[href="/ie"], nav.automation-breadcrumb a[href="/ie"]'
        ).first();
        await expect(homeBreadcrumb).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 6.2 — Bingo
// Google search → bingo toplist → compare bingo sites → click operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 6.2 — Bingo toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bingo);
        expect(response?.status(), 'Bingo sites page should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke bingo toplist loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/bingo-sites/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/bingo/i);
    });

    test('@smoke bingo toplist lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(2) = at least 3 cards (live IE page has 4 operator rows)
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@smoke bingo toplist exposes operator name and logo @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 6.3 — Lottery
// Google search → lottery page → compare lotteries → click operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 6.3 — Lottery toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.lottery);
        expect(response?.status(), 'Lottery page should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke lottery page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/lottery/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/lott/i);
    });

    test('@smoke lottery page lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(1) = at least 2 cards — lottery is a small vertical (live IE has 3 rows);
        // nth(2) would fail on any editorial drop to 2 operators.
        await expect(comparison.cards.nth(1)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@smoke lottery page exposes operator name and logo @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 6.4 — Sweepstakes / Social Casino
// Ad / search → sweepstakes page → compare free brands → click operator CTA
// Note: No dedicated sweepstakes/social page exists on IE. /ie/casino-games
// redirects to /ie/online-casinos/slots/games — a slot games hub (game grid),
// not a ComparisonPage-style operator oplist. Raw locators used throughout.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 6.4 — Sweepstakes / social casino (slots/games hub)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.casinoGames, { waitUntil: 'domcontentloaded' });
        expect(response?.status(), 'Casino games entry should return HTTP 200').toBeLessThan(400);
        // Explicit dismiss: 6.4 uses raw page.goto (not ComparisonPage.goto) and the
        // /casino-games → /slots/games redirect can surface the cookie banner here.
        await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    });

    test('@smoke casino-games entry lands on slots/games hub with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/slots\/games/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/slot|game/i);
    });

    test('@smoke slots/games hub exposes game or operator CTAs @journey', async ({ page }) => {
        const cta = page.locator('a[href*="/go/"], a[href*="/ie/online-casinos/slots/"]').first();
        await expect(cta).toBeAttached();
    });

    test('@smoke slots/games hub breadcrumb links to casino toplist @journey', async ({ page }) => {
        const casinoBreadcrumb = page.locator(
            'nav#breadcrumb a[href="/ie/online-casinos"], nav.automation-breadcrumb a[href="/ie/online-casinos"]'
        ).first();
        await expect(casinoBreadcrumb).toBeAttached();
    });
});