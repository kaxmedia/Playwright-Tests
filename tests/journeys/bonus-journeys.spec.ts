// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 4: Bonus Journeys
//
// Covers the four bonus journeys where a user arrives (via Google or ad) on a
// bonus page, scans offers, and reaches a claim CTA.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/bonus-journeys.spec.ts --project=chrome
//   npx playwright test tests/journeys/bonus-journeys.spec.ts --grep @regression
//
// Design principles:
//   - Complements (does not duplicate) bonus-offers.spec.ts. That suite owns
//     card-level assertions (data attributes, logos, offer text, age limits).
//     These journey tests focus on page-level flows: correct entry → content
//     present → navigation path → claim CTA reachable.
//   - No dedicated promo-code page exists on IE — Journey 4.4 is covered via
//     the bonus hub, which contains promo code content inline.
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - ComparisonPage POM reused throughout. No new POM code.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../../fixtures/test';
import { ComparisonPage } from '../../pages/ComparisonPage';

const BASE = 'https://www.gambling.com';

const URLS = {
    bonusHub: `${BASE}/ie/online-casinos/bonus`,
    noDeposit: `${BASE}/ie/online-casinos/no-deposit-bonus`,
    freeSpins: `${BASE}/ie/online-casinos/bonus/free-spins-no-deposit`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 4.1 — Welcome Bonus
// Google search → casino bonus hub → scan welcome offers → click claim CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 4.1 — Welcome bonus hub', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bonusHub);
        expect(response?.status(), 'Bonus hub should return HTTP 200').toBeLessThan(400);
    });

    test('@regression bonus hub loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/bonus\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/bonus|offer/i);
    });

    test('@regression bonus hub lists operator cards with claim CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(4) = at least 5 cards present (0-indexed)
        await expect(comparison.cards.nth(4)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression bonus hub exposes sub-category navigation links @journey', async ({ page }) => {
        // User can narrow from "all bonuses" to no-deposit or free spins
        const noDepositLink = page.locator('a[href*="no-deposit"]').first();
        await expect(noDepositLink).toBeAttached();
        const freeSpinsLink = page.locator('a[href*="free-spins"]').first();
        await expect(freeSpinsLink).toBeAttached();
    });

    test('@regression bonus hub contains promo code content @journey', async ({ page }) => {
        // No dedicated promo-code page on IE — promo code content lives inline on the hub
        const promoContent = page.getByText(/promo.?code|bonus.?code/i).first();
        await expect(promoContent).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 4.2 — No-Deposit Hunt
// Google / ad → no-deposit bonus page → find offer → click claim CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 4.2 — No-deposit bonus page', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.noDeposit);
        expect(response?.status(), 'No-deposit page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression no-deposit page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/no-deposit-bonus/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/no.?deposit/i);
    });

    test('@regression no-deposit page lists operator cards with claim CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression no-deposit page links back to bonus hub @journey', async ({ page }) => {
        const bonusHubLink = page.locator('a[href*="/ie/online-casinos/bonus"]').first();
        await expect(bonusHubLink).toBeAttached();
    });

    test('@regression no-deposit page offer text is present on first card @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        const offer = await comparison.offerText(firstCard);
        expect(offer?.trim().length, 'First card should expose bonus offer copy').toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 4.3 — Free Spins
// Google / ad → free-spins page → find offer → click claim CTA
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 4.3 — Free spins no-deposit page', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.freeSpins);
        expect(response?.status(), 'Free spins page should return HTTP 200').toBeLessThan(400);
    });

    test('@regression free spins page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/bonus\/free-spins-no-deposit/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/free.?spin/i);
    });

    test('@regression free spins page lists operator cards with claim CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        await expect(comparison.cards.nth(2)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression free spins page links back to bonus hub @journey', async ({ page }) => {
        const bonusHubLink = page.locator('a[href*="/ie/online-casinos/bonus"]').first();
        await expect(bonusHubLink).toBeAttached();
    });

    test('@regression visitor can navigate from free spins page to bonus hub @journey', async ({ page }) => {
        const bonusHubLink = page.locator('a[href="/ie/online-casinos/bonus"]').first();
        await expect(bonusHubLink).toBeAttached();
        // Nav mega-menu link is CSS-hidden until hover — follow the verified href to complete the journey
        await page.goto(URLS.bonusHub);
        await expect(page).toHaveURL(/\/ie\/online-casinos\/bonus/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 4.4 — Promo Code
// Google search → bonus hub (promo code content inline on IE) → copy code →
// click operator CTA
// Note: No dedicated /promo-codes page exists on IE. Promo code content is
// embedded within the main bonus hub (/ie/online-casinos/bonus).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 4.4 — Promo code (bonus hub inline content)', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bonusHub);
        expect(response?.status(), 'Bonus hub should return HTTP 200').toBeLessThan(400);
    });

    test('@regression promo code content is present on the bonus hub @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/bonus/);
        const promoContent = page.getByText(/promo.?code|bonus.?code/i).first();
        await expect(promoContent).toBeAttached();
    });

    test('@regression operator cards expose claim CTAs alongside promo code content @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression operator name is present alongside CTA on promo code journey @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        const name = await comparison.operatorName(firstCard);
        expect(name?.trim().length).toBeGreaterThan(0);
    });
});
