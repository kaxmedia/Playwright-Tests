// ────────────────────────────────────────────────────────────────────────────
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
//   npx playwright test tests/journeys/other-verticals.spec.ts --grep @regression
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
import { GDC_ORIGIN, gotoOk } from '../helpers/journeys';

const URLS = {
    poker: `${GDC_ORIGIN}/ie/poker-sites`,
    bingo: `${GDC_ORIGIN}/ie/bingo-sites`,
    lottery: `${GDC_ORIGIN}/ie/lottery`,
    /** Legacy path — redirects to /ie/online-casinos/slots/games (slots hub). */
    casinoGames: `${GDC_ORIGIN}/ie/casino-games`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 6.1 — Poker
// Google search → poker toplist → compare rooms → click operator CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 6.1 — Poker toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        await gotoOk(page, URLS.poker, 'Poker sites page');
    });

    test('@regression poker toplist loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/poker-sites/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/poker/i);
    });

    test('@regression poker toplist lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(2) = at least 3 cards (live IE page has 6 operator rows)
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression poker toplist exposes operator name and logo @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });

    test('@regression poker toplist breadcrumb links back to IE homepage @journey', async ({ page }) => {
        // Live-verified 2026-10-08: /ie/poker-sites' breadcrumb markup has migrated to
        // nav.nh-hero__crumbs (the old nav.automation-breadcrumb no longer matches here) --
        // the same site-wide breadcrumb redesign already seen on the UK casino category
        // pages. Added as a fallback rather than a replacement, since #breadcrumb /
        // .automation-breadcrumb may still be correct on other pages this selector is
        // reused for.
        const homeBreadcrumb = page.locator(
            'nav#breadcrumb a[href="/ie"], nav.automation-breadcrumb a[href="/ie"], nav.nh-hero__crumbs a[href="/ie"]'
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
        await gotoOk(page, URLS.bingo, 'Bingo sites page');
    });

    test('@regression bingo toplist loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/bingo-sites/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/bingo/i);
    });

    test('@regression bingo toplist lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(2) = at least 3 cards (live IE page has 4 operator rows)
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression bingo toplist exposes operator name and logo @journey', async () => {
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
        await gotoOk(page, URLS.lottery, 'Lottery page');
    });

    test('@regression lottery page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/lottery/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/lott/i);
    });

    test('@regression lottery page lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(1) = at least 2 cards — lottery is a small vertical (live IE has 3 rows);
        // nth(2) would fail on any editorial drop to 2 operators.
        await expect(comparison.cards.nth(1)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression lottery page exposes operator name and logo @journey', async () => {
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
        await gotoOk(page, URLS.casinoGames, 'Casino games entry');
        // Explicit dismiss: 6.4 uses raw page.goto (not ComparisonPage.goto) and the
        // /casino-games → /slots/games redirect can surface the cookie banner here.
        await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    });

    test('@regression casino-games entry lands on slots/games hub with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/slots\/games/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/slot|game/i);
    });

    test('@regression slots/games hub exposes game or operator CTAs @journey', async ({ page }) => {
        const cta = page.locator('a[href*="/go/"], a[href*="/ie/online-casinos/slots/"]').first();
        await expect(cta).toBeAttached();
    });

    test('@regression slots/games hub breadcrumb links to casino toplist @journey', async ({ page }) => {
        // Live slots/games hub uses nav.nh-hero__crumbs (not #breadcrumb / .automation-breadcrumb).
        const casinoBreadcrumb = page.locator(
            'nav#breadcrumb a[href="/ie/online-casinos"], nav.automation-breadcrumb a[href="/ie/online-casinos"], nav.nh-hero__crumbs a[href="/ie/online-casinos"]'
        ).first();
        await expect(casinoBreadcrumb).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journeys 6.5–6.8 — UK Poker / Bingo / Lottery / Sweepstakes
//
// Added 2026-10-08. Previously these four journeys only had IE coverage
// (6.1–6.4 above); UK is the other flagship market and gets its own
// journeys here rather than folding into 6.1–6.4, so the existing IE
// journey names/results above are untouched (the dashboard's User Journeys
// page tracks journeys by these describe-block names).
//
// Every URL, card count, and breadcrumb selector below was checked live
// before being added -- not assumed from the IE pattern. Two genuine
// per-geo differences, confirmed live:
//   - UK's breadcrumb markup uses nav.nh-hero__crumbs, not
//     nav.automation-breadcrumb (see the note on 6.1's fix above -- IE's
//     poker page has now migrated to the same markup).
//   - UK has no /uk/casino-games legacy redirect (confirmed 404) -- the
//     direct /uk/online-casinos/slots/games URL is used as the entry point
//     instead, since that's the page IE's redirect lands on anyway.
// ─────────────────────────────────────────────────────────────────────────────

const UK_URLS = {
    poker: `${GDC_ORIGIN}/uk/poker-sites`,
    bingo: `${GDC_ORIGIN}/uk/bingo-sites`,
    lottery: `${GDC_ORIGIN}/uk/lottery`,
    /** No /uk/casino-games legacy redirect exists (confirmed live: 404) -- direct URL used. */
    slotsGamesHub: `${GDC_ORIGIN}/uk/online-casinos/slots/games`,
} as const;

test.describe('Journey 6.5 — UK Poker toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        await gotoOk(page, UK_URLS.poker, 'UK Poker sites page');
    });

    test('@regression UK poker toplist loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/uk\/poker-sites/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/poker/i);
    });

    test('@regression UK poker toplist lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(2) = at least 3 cards (live UK page has 6 operator rows, same as IE)
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression UK poker toplist exposes operator name and logo @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });

    test('@regression UK poker toplist breadcrumb links back to UK homepage @journey', async ({ page }) => {
        // Live-verified 2026-10-08: UK uses nav.nh-hero__crumbs, not nav.automation-breadcrumb.
        const homeBreadcrumb = page.locator('nav.nh-hero__crumbs a[href="/uk"]').first();
        await expect(homeBreadcrumb).toBeAttached();
    });
});

test.describe('Journey 6.6 — UK Bingo toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        await gotoOk(page, UK_URLS.bingo, 'UK Bingo sites page');
    });

    test('@regression UK bingo toplist loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/uk\/bingo-sites/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/bingo/i);
    });

    test('@regression UK bingo toplist lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(2) = at least 3 cards (live UK page has 24 operator rows -- a much larger
        // market than IE's 4, but the same floor of 3 is a safe regression check either way)
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression UK bingo toplist exposes operator name and logo @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });
});

test.describe('Journey 6.7 — UK Lottery toplist', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        await gotoOk(page, UK_URLS.lottery, 'UK Lottery page');
    });

    test('@regression UK lottery page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/uk\/lottery/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/lott/i);
    });

    test('@regression UK lottery page lists operator cards with CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(1) = at least 2 cards (live UK page has 3 rows, same as IE)
        await expect(comparison.cards.nth(1)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression UK lottery page exposes operator name and logo @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.logoImg(firstCard)).toBeVisible();
        expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });
});

test.describe('Journey 6.8 — UK Sweepstakes / social casino (slots/games hub)', () => {
    test.beforeEach(async ({ page }) => {
        await gotoOk(page, UK_URLS.slotsGamesHub, 'UK slots/games hub entry');
        await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    });

    test('@regression UK slots/games hub loads with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/uk\/online-casinos\/slots\/games/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/slot|game/i);
    });

    test('@regression UK slots/games hub exposes game or operator CTAs @journey', async ({ page }) => {
        const cta = page.locator('a[href*="/go/"], a[href*="/uk/online-casinos/slots/"]').first();
        await expect(cta).toBeAttached();
    });

    test('@regression UK slots/games hub breadcrumb links to casino toplist @journey', async ({ page }) => {
        const casinoBreadcrumb = page.locator('nav.nh-hero__crumbs a[href="/uk/online-casinos"]').first();
        await expect(casinoBreadcrumb).toBeAttached();
    });
});
