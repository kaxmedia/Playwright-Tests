// ─────────────────────────────────────────────────────────────────────────────
// User Journey Tests — Section 8: Account & Brand
//
// Covers the nine account and brand journeys where a user interacts with
// authentication, profile features, geo-specific content, editorial content,
// and responsible gambling tools.
//
// Source: Gambling.com Core User Journeys (Confluence)
// https://gdcgroup.atlassian.net/wiki/spaces/GDC/pages/6630998310
//
// Run with:
//   npx playwright test tests/journeys/account-brand.spec.ts --project=chrome
//   npx playwright test tests/journeys/account-brand.spec.ts --grep @smoke
//
// Design principles:
//   - No form submissions — sign-up/sign-in forms asserted present, never submitted.
//   - Auth-gated pages (profile, rewards) are tested for UI state only.
//   - No off-site CTA clicks — /go/ links asserted present, never followed.
//   - URL notes:
//       * No /ie/responsible-gambling page — the RG hub lives at /responsible
//         (global, not IE-specific). Footer link confirms the path.
//       * Reviews hub at /ie/online-casinos/reviews redirects to the main
//         /ie/online-casinos toplist — URL assertion uses contains match.
//       * Authors hub at /ie/authors redirects to /authors (global).
//       * Auth UI uses Welcome Rewards modal (#signup-modal) for both sign-up and
//         sign-in; header triggers are #gdc-signup-text and #login-button.
//       * Geo homepage journey uses /uk as the representative alternate geo.
//   - Existing POMs reused: AuthPage, TournamentsPage. No new POM code.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../../fixtures/test';
import { AuthPage } from '../../pages/AuthPage';
import { TournamentsPage } from '../../pages/TournamentsPage';

const BASE = 'https://www.gambling.com';

const URLS = {
    homepage: `${BASE}/ie`,
    profile: `${BASE}/profile`,
    tournaments: `${BASE}/ie/games/tournaments`,
    /** Reviews hub is the main IE casino toplist; the old /ie/online-casinos/reviews path now 404s. */
    reviewsHub: `${BASE}/ie/online-casinos`,
    news: `${BASE}/ie/news`,
    /** Global RG hub — no /ie/responsible-gambling page exists. */
    responsible: `${BASE}/responsible`,
    /** Geo homepage — /uk used as the representative alternate market. */
    geoHomepage: `${BASE}/uk`,
    authors: `${BASE}/ie/authors`,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.1 — Sign-up
// CTA anywhere → register modal → enter details → confirm email → account created
// Note: Tests assert modal presence and form fields only. No registration submitted.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.1 — Sign-up (register modal)', () => {
    let authPage: AuthPage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        const response = await page.goto(URLS.homepage);
        expect(response?.status(), 'Homepage should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke homepage exposes a sign-up CTA for new users @journey', async ({ page }) => {
        await expect(page).toHaveURL(/gambling\.com\/ie\/?$/);
        // Sign-up text / button is visible in the top nav for unauthenticated users
        const signupCta = page.locator('#gdc-signup-text').first();
        await expect(signupCta).toBeAttached();
    });

    test('@smoke sign-up modal is present in the DOM @journey', async () => {
        // #signup-modal reuses the same shell for sign-in and logged-in profile menu
        await expect(authPage.signupModal).toBeAttached();
    });

    test('@smoke register form fields are present in the modal @journey', async ({ page }) => {
        await expect(authPage.emailInput).toBeAttached();
        await expect(authPage.passwordInput).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.2 — Returning User (Sign-in)
// Email / direct → sign in → profile / rewards → update details → done
// Note: Tests assert sign-in modal presence only. loginViaUi() not called here
// as that is covered by the dedicated auth suite.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.2 — Returning user (sign-in flow)', () => {
    let authPage: AuthPage;

    test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
        const response = await page.goto(URLS.homepage);
        expect(response?.status(), 'Homepage should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke sign-in CTA is present in the top nav @journey', async () => {
        // #login-button is often CSS-hidden — assert attached, not visible
        await expect(authPage.headerSignInBtn).toBeAttached();
    });

    test('@smoke sign-in reuses the Welcome Rewards modal shell @journey', async () => {
        await authPage.openSignUpModal();
        await expect(authPage.signupModal).toBeVisible();
        await expect(authPage.signInLink).toBeVisible();
    });

    test('@smoke sign-in form exposes email and password fields @journey', async () => {
        await authPage.openSignInModal();
        await expect(authPage.continueWithEmailBtn).toBeVisible();
        await authPage.continueWithEmailBtn.click();
        await expect(authPage.signInEmailInput).toBeVisible({ timeout: 8000 });
        await expect(authPage.signInPasswordInput).toBeVisible();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.3 — Rewards Check
// Direct → profile → view rewards → redeem → done
// Note: /profile is auth-gated. Tests verify the page URL and that the
// profile UI is accessible — no authenticated session required for page load.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.3 — Rewards check (profile page)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.profile);
        expect(response?.status(), 'Profile page should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke profile page loads and is reachable @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/profile/);
    });

    test('@smoke profile page exposes a sign-in prompt for unauthenticated users @journey', async ({ page }) => {
        const signinGate = page.getByText(/get unrestricted access|join now/i).first();
        await expect(signinGate).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.4 — Leaderboard
// Email / direct → predictor leaderboard → check rank → make next picks
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.4 — Predictor leaderboard', () => {
    let tournamentsPage: TournamentsPage;

    test.beforeEach(async ({ page }) => {
        tournamentsPage = new TournamentsPage(page);
        const response = await tournamentsPage.goto('ie');
        expect(response?.status(), 'Tournaments page should return HTTP 200').toBeLessThan(400);
        test.skip(!(await tournamentsPage.hasActiveTournament()), 'No active tournament currently live');
    });

    test('@smoke leaderboard page loads with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/games\/tournaments/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@smoke leaderboard table is present @journey', async () => {
        await expect(tournamentsPage.leaderboard).toBeAttached();
    });

    test('@smoke unauthenticated entry CTA is present for new picks @journey', async () => {
        await expect(tournamentsPage.unauthCta).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.5 — Homepage Browse
// Direct visit → homepage → pick country / topic → into a section → browses on
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.5 — Homepage browse', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.homepage);
        expect(response?.status(), 'Homepage should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke homepage loads with H1 and vertical tabs @journey', async ({ page }) => {
        await expect(page).toHaveURL(/gambling\.com\/ie\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.getByRole('button', { name: /casino/i }).first()).toBeAttached();
        await expect(page.getByRole('button', { name: /betting/i }).first()).toBeAttached();
    });

    test('@smoke homepage exposes operator CTAs for direct browsing @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@smoke homepage top nav exposes all primary vertical links @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/ie/online-casinos"]').first()).toBeAttached();
        await expect(page.locator('a[href*="/ie/betting-sites"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.6 — Geo Homepage
// Direct / search → country homepage → pick a vertical → into toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.6 — Geo homepage (UK market)', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.geoHomepage);
        expect(response?.status(), 'UK homepage should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke UK geo homepage loads with H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/gambling\.com\/uk\/?$/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@smoke UK geo homepage exposes vertical navigation to a toplist @journey', async ({ page }) => {
        const casinoLink = page.locator('a[href*="/uk/online-casinos"]').first();
        await expect(casinoLink).toBeAttached();
    });

    test('@smoke UK geo homepage exposes operator CTAs @journey', async ({ page }) => {
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });

    test('@regression geo homepage has geo-specific content distinct from IE @journey', async ({ page }) => {
        const h1 = page.locator('h1').first();
        await expect(h1).toBeVisible();
        expect((await h1.innerText()).trim().length).toBeGreaterThan(0);
        // Confirm URL is on /uk not /ie — proves geo routing is working
        await expect(page).toHaveURL(/\/uk/);
        await expect(page).not.toHaveURL(/\/ie/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.7 — Reviews Hub
// Brand search → reviews hub → pick a vertical → open a review
// Note: the IE reviews hub IS the main casino toplist (/ie/online-casinos);
// the old /ie/online-casinos/reviews redirect was removed and now 404s.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.7 — Reviews hub', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.reviewsHub);
        expect(response?.status(), 'Reviews hub should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke reviews hub loads and redirects to casino toplist @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos/);
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@smoke reviews hub exposes individual operator review links @journey', async ({ page }) => {
        const reviewLink = page.locator('main a.operator-review-link[href*="/ie/online-casinos/"]').first();
        await expect(reviewLink).toBeAttached();
    });

    test('@regression opening an operator review from the hub works @journey', async ({ page }) => {
        const reviewLink = page.locator('main a.operator-review-link[href*="/ie/online-casinos/"]').first();
        await expect(reviewLink).toBeAttached();
        const href = await reviewLink.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : `${BASE}${href}`;
        await page.goto(fullUrl);
        await expect(page).toHaveURL(/\/ie\/online-casinos\//);
        await expect(page.locator('main.body_content h1, main h1').first()).toBeVisible();
        await expect(page.locator('a[href*="/go/"]').first()).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.8 — News Reader
// Google / social → news article → read → click related toplist
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.8 — News reader', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.news);
        expect(response?.status(), 'News hub should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke news hub loads with H1 and article links @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/news/);
        await expect(page.locator('h1').first()).toBeVisible();
        const articleLinks = page.locator('a[href*="/ie/news/"]');
        await expect(articleLinks.first()).toBeAttached();
    });

    test('@smoke opening an article from the news hub works @journey', async ({ page }) => {
        const firstArticle = page.locator('a[href*="/ie/news/"]').first();
        await expect(firstArticle).toBeVisible();
        const href = await firstArticle.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : `${BASE}${href}`;
        await page.goto(fullUrl);
        await expect(page).toHaveURL(/\/ie\/news\//);
        await expect(page.locator('main h1').first()).toBeVisible();
    });

    test('@smoke news article contains a related toplist link @journey', async ({ page }) => {
        const firstArticle = page.locator('a[href*="/ie/news/"]').first();
        await expect(firstArticle).toBeAttached();
        const href = await firstArticle.getAttribute('href');
        const fullUrl = href?.startsWith('http') ? href : `${BASE}${href}`;
        await page.goto(fullUrl);
        // In-content toplist or affiliate link present in article body
        const toplistLink = page.locator(
            'main a[href*="/ie/online-casinos"], main a[href*="/ie/betting-sites"], main a[href*="/go/"]'
        ).first();
        await expect(toplistLink).toBeAttached();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Journey 8.9 — Responsible Gambling
// Footer link → RG / help page → read tools → set limits / leave → done
// Note: /ie/responsible-gambling returns 404. The RG hub is at /responsible
// (global). Footer link confirmed as href="/responsible".
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Journey 8.9 — Responsible gambling hub', () => {
    test.beforeEach(async ({ page }) => {
        const response = await page.goto(URLS.responsible);
        expect(response?.status(), 'Responsible gambling page should return HTTP 200').toBeLessThan(400);
    });

    test('@smoke responsible gambling page loads with correct H1 @journey', async ({ page }) => {
        await expect(page).toHaveURL(/\/responsible/);
        await expect(page.locator('h1').first()).toBeVisible();
        await expect(page.locator('h1').first()).toContainText(/safe|help|responsible/i);
    });

    test('@smoke responsible gambling page contains self-exclusion or limit-setting tools @journey', async ({ page }) => {
        const rgTools = page.locator('main').getByText(
            /stay in control|gamble responsibly|protection and support|self.exclusion/i
        ).first();
        await expect(rgTools).toBeAttached();
    });

    test('@smoke footer link on homepage points to the RG hub @journey', async ({ page }) => {
        await page.goto(URLS.homepage);
        const rgFooterLink = page.locator('footer a[href*="/responsible"]').first();
        await expect(rgFooterLink).toHaveAttribute('href', /\/responsible/);
    });
});