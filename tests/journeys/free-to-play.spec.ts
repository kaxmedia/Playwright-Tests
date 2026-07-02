// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 7: Free-to-play & Lead Funnel
//
// Covers the five free-to-play and lead funnel journeys where a user arrives
// via display ad or email, engages with a free game or offer, and either plays,
// signs up, or claims a weekly offer.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/free-to-play.spec.ts --project=chrome
//   npx playwright test tests/journeys/free-to-play.spec.ts --grep @smoke
//
// Design principles:
//   - No form submissions — email/signup forms asserted present, never submitted.
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - URL notes:
//       * Journeys 7.1 and 7.2 both use /ie/games/cosmo-spins — the daily free
//         spin mechanism lives on the same page as the free game itself.
//       * Journey 7.3 (email lead funnel) — the email capture input is embedded
//         within the Cosmo Spins page, not a standalone landing page.
//       * Journey 7.4 (weekly offers) — no dedicated weekly-offers page exists
//         on IE; /ie/online-casinos/bonus is the canonical offers hub.
//       * Journey 7.5 (newsletter signup) — the .email-account-signup element
//         is present in the DOM but CSS-hidden until auth state triggers it.
//         IE homepage has no footer email input; lead capture is the header
//         Welcome Rewards signup modal (#signup-email). Tests assert DOM presence
//         (toBeAttached), not visibility, and never submit forms.
//   - No new POM code — raw locators throughout.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../../fixtures/test';
import { ComparisonPage } from '../../pages/ComparisonPage';

const BASE = 'https://www.gambling.com';

const URLS = {
    cosmoSpins: `${BASE}/ie/games/cosmo-spins`,
    gamesHub: `${BASE}/ie/games`,
    bonusHub: `${BASE}/ie/online-casinos/bonus`,
    homepage: `${BASE}/ie`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 7.1 — Free Game
// Display ad / email → game page (Cosmo Spins) → play → leaves / converts
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 7.1 — Free game (Cosmo Spins)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.cosmoSpins);
        expect(response?.status(), 'Cosmo Spins should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke Cosmo Spins page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/games\/cosmo-spins/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/cosmo.?spin/i);
    });

    test('@smoke free game mechanism is present on the page @journey', async ({ page }) => {
        // The spin wheel / game canvas is the primary engagement element
        const gameElement = page.locator(
            '[class*="cosmo"], [class*="spin"], [class*="wheel"], canvas, [id*="game"]'
        ).first();
        await expect(gameElement).toBeAttached();
    });

    test('@smoke casino toplist link is present for post-play conversion @journey', async ({ page }) => {
        // After playing, user is shown casino toplist links to convert to real money
        const casinoLink = page.locator('a[href*="/ie/online-casinos"]').first();
        await expect(casinoLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 7.2 — Daily Free Game
// Email / social → "Stable Stars" / daily game page → play / sign up → submit
// Note: /ie/news/stable-stars returns 404 on IE. Daily free game journey is
// covered via Cosmo Spins which runs a daily spin mechanic.
// Intentionally reuses the same URL and page.goto as Journey 7.1 so each
// Confluence journey ID maps to its own describe block in this file.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 7.2 — Daily free game (Cosmo Spins daily spin)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.cosmoSpins);
        expect(response?.status(), 'Cosmo Spins should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke daily spin page loads with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/games\/cosmo-spins/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@smoke sign-up prompt is present to convert free player to registered user @journey', async ({ page }) => {
        const signupCta = page.locator('#gdc-signup-text').first();
        await expect(signupCta).toBeAttached();
    });

    test('@smoke games hub link is reachable from daily game page @journey', async ({ page }) => {
        const gamesLink = page.locator('a[href*="/ie/games"]').first();
        await expect(gamesLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 7.3 — Email Lead Funnel
// Email / ad → landing page → fill form → submit → confirmation
// Note: Email capture is embedded within Cosmo Spins, not a standalone page.
// Tests assert the form element is present; submission is never triggered.
// Intentionally reuses the same URL and page.goto as Journeys 7.1/7.2 so each
// Confluence journey ID maps to its own describe block in this file.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 7.3 — Email lead funnel (Cosmo Spins email capture)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.cosmoSpins);
        expect(response?.status(), 'Cosmo Spins should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke email capture input is present on the Cosmo Spins page @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/games\/cosmo-spins/);
        const emailInput = page.locator('input[type="email"]').first();
        await expect(emailInput).toBeAttached();
    });

    test('@smoke email form submit element is present @journey', async ({ page }) => {
        // Submit button / CTA adjacent to the email input
        const submitEl = page.locator(
            'button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Sign")'
        ).first();
        await expect(submitEl).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 7.4 — Weekly Offers
// Email → offers landing page → browse offers → click claim CTA
// Note: No dedicated weekly-offers page on IE. /ie/online-casinos/bonus is the
// canonical offers hub covering current promotions and welcome offers.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 7.4 — Weekly offers (bonus hub)', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
        comparison = new ComparisonPage(page);
        const response = await comparison.goto(URLS.bonusHub);
        expect(response?.status(), 'Bonus hub should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke bonus hub loads with H1 for weekly offers entry @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos\/bonus/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/bonus|offer/i);
    });

    test('@smoke bonus hub lists offers with claim CTAs @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        // nth(4) = at least 5 offers present (0-indexed)
        await expect(comparison.cards.nth(4)).toBeAttached();
        const firstCard = comparison.nthCard(0);
        await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
    });

    test('@regression weekly offer text is non-empty on first card @journey', async () => {
        await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
        const firstCard = comparison.nthCard(0);
        const offer = await comparison.offerText(firstCard);
        expect(offer?.trim().length, 'First card should expose offer copy').toBeGreaterThan(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 7.5 — Newsletter Signup
// Footer / popup → email capture → enter email → submit → confirmation
// Note: The .email-account-signup element is in the DOM but CSS-hidden until
// auth state triggers visibility. IE homepage has no footer email input — lead
// capture is the header Welcome Rewards modal (#signup-email).
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 7.5 — Newsletter signup (homepage email capture)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.homepage);
        expect(response?.status(), 'Homepage should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke homepage loads and email signup element is present in DOM @journey', async ({ page }) => {
        await expect(page).toHaveURL(/gambling\.com\/ie\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        // Element is CSS-hidden until auth state — assert attached (in DOM), not visible
        const emailSignup = page.locator('.email-account-signup').first();
        await expect(emailSignup).toBeAttached();
    });

    test('@smoke sign-up CTA is reachable from homepage for new user lead capture @journey', async ({ page }) => {
        const signupCta = page.locator('#gdc-signup-text').first();
        await expect(signupCta).toBeAttached();
    });

    test('@regression homepage signup email field is present in DOM for popup capture @journey', async ({ page }) => {
        // No footer email input on IE — Welcome Rewards modal hosts #signup-email
        const signupEmail = page.locator('#signup-email').first();
        await expect(signupEmail).toBeAttached();
    });
});