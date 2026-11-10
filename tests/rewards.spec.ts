import { test, expect } from '../fixtures/test';
import { AuthPage } from '../pages/AuthPage';
import { acquireSharedAuthLock, signInAsTestUserUnlocked, type AuthLockHandle } from '../fixtures/auth';

// ─── Rewards V2 (GDCU-9156) — read-only smoke ─────────────────────────────────
//
// Deliberately NOT covered: redeeming, purchasing, spending chips, or any store/mission flow.
// Display-only assertions; nothing here clicks a CTA that could start a transaction.
// Copy, numbers and brand names aren't pinned, so content edits don't break this.
// ─────────────────────────────────────────────────────────────────────────────

// Logged out, /rewards is the Rewards V2 marketing page. Live-verified 2026-11-10 (chrome, firefox,
// webkit, two loads each): H1 hero ("Earn chips. Save up. Buy real stuff."), a stats bar
// ("40,000+ Members", "£100k In Winnings Given Away since 2025") and 4 reward catalog cards, each an
// <article> with a chip threshold ("1,000+"), an item image (alt names the item, e.g. "Adidas gift
// card") and a description. The tier cards further down are also <article>s but have no "N+"
// threshold, which is what separates the two.
test.describe('Rewards — landing page smoke', () => {
    test.beforeEach(async ({ page }) => {
        const res = await page.goto('/rewards', { waitUntil: 'domcontentloaded' });
        expect(res?.status(), '/rewards did not load').toBe(200);
    });

    test('@smoke @regression page loads with the Rewards title and a hero heading', async ({ page }) => {
        // 15s, not the 5s default: under heavy parallel load Firefox/WebKit briefly reported an
        // empty title on this large page (a sequential re-run passed 12/12).
        await expect(page).toHaveTitle(/gambling\.com rewards/i, { timeout: 15000 });
        // Hero copy isn't hardcoded (it changed for V2 and may change again): just a non-empty H1.
        const hero = page.getByRole('heading', { level: 1 }).first();
        await expect(hero).toBeVisible();
        await expect(hero).toHaveText(/\S/);
    });

    test('@smoke @regression stats bar shows a members count and winnings given away', async ({ page }) => {
        // The page has two <main> elements (the second wraps the sign-up form); the first is the page.
        const main = page.getByRole('main').first();
        await expect(main.getByText(/\d[\d,.]*\s*[km]?\+?\s*members/i).first()).toBeVisible({ timeout: 15000 });
        await expect(main.getByText(/[£€$]?\s*\d[\d,.]*\s*[km]?\+?\s*in winnings given away/i).first()).toBeVisible();
    });

    test('@smoke @regression reward catalog cards each show a chip threshold, an item and a description', async ({ page }) => {
        const cards = page.getByRole('main').first().getByRole('article').filter({ hasText: /\d[\d,]*\+/ });
        await expect(cards.first()).toBeVisible({ timeout: 15000 });

        const count = await cards.count();
        expect(count, 'no reward catalog cards').toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            await expect(card, `card ${i + 1}: chip threshold`).toContainText(/\d[\d,]*\+/);
            await expect(card.getByRole('img').first(), `card ${i + 1}: item image with a name`).toHaveAccessibleName(/\S/);
            await expect(card.getByRole('paragraph').first(), `card ${i + 1}: description`).toHaveText(/\S{3,}/);
        }
    });
});

// Logged in, /ie/rewards-overview is the Rewards dashboard. Live-verified 2026-11-10 (chrome, firefox,
// webkit, two loads each) with the shared E2E account: a Chips card (<article> with a "Chips" label and
// the balance, e.g. "208") and an XP card ("XP" label, the XP total e.g. "2,508", and the tier name,
// e.g. "Voyager").
test.describe('Rewards — logged-in dashboard smoke', () => {
    let authLock: AuthLockHandle | undefined;

    test.beforeEach(async ({ page }) => {
        // Sign-in alone can take up to 3 password candidates x 26s (fixtures/auth.ts), plus up to 20s for
        // the dashboard; WebKit in CI ran out of the default 60s inside sign-in (run 42851023022).
        test.slow();
        // The site-wide market redirect sends visitors from markets with their own site (the office
        // egress geolocates to DE) from /ie to their own homepage ~1s after load; CI's US runners
        // aren't redirected. It skips bot user agents, so append that token in page JS only (same as
        // norway-geo-block.spec.ts). Requests still carry the real browser UA.
        await page.addInitScript(() => {
            const ua = navigator.userAgent;
            Object.defineProperty(navigator, 'userAgent', { get: () => `${ua} headless` });
        });
        // "Our new Rewards programme is live" announcement covers the dashboard on load. Close it with
        // its ✕ only, never its "Earn More Chips" / "Visit Our Store" CTAs.
        const announcement = page.getByRole('dialog', { name: /rewards programme is live/i });
        await page.addLocatorHandler(announcement, async () => {
            await announcement.getByRole('button', { name: 'Close' }).click();
        });

        // Hold the shared-account lock for the whole test so chrome/firefox/webkit sign-ins don't
        // invalidate each other's Supabase sessions mid-run (same pattern as profile.spec.ts).
        authLock = await acquireSharedAuthLock();
        const authPage = new AuthPage(page);
        await authPage.goto();
        await signInAsTestUserUnlocked(authPage);

        await page.goto('/ie/rewards-overview', { waitUntil: 'domcontentloaded' });
        // US visitors can't reach the dashboard: /ie/rewards-overview loads (200), then the page itself
        // navigates to /us, and /us/rewards-overview is a 404 (confirmed from CI run 42848437635's trace,
        // 2026-11-10). CI's GitHub runners are US, so this block only really runs from non-US IPs (local
        // runs). The skip is limited to that exact bounce; any other outcome still fails.
        const dashboardHeading = page.getByRole('main').getByRole('heading', { level: 1 });
        const outcome = await Promise.race([
            dashboardHeading.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'dashboard' as const),
            page.waitForURL((url) => /^\/us(\/|$)/.test(url.pathname), { timeout: 20000 }).then(() => 'us' as const),
        ]).catch(() => 'neither' as const);
        test.skip(outcome === 'us', 'Rewards dashboard bounces US visitors to /us (no US dashboard); CI runners are US');
        await expect(dashboardHeading).toBeVisible();
        // Still on the dashboard, not bounced elsewhere or to a signed-out page.
        await expect(page).toHaveURL(/\/ie\/rewards-overview/);
    });

    test.afterEach(() => {
        authLock?.release();
        authLock = undefined;
    });

    test('@smoke @regression Chips balance card shows a balance', async ({ page }) => {
        const chipsCard = page.getByRole('main').getByRole('article').filter({
            has: page.getByText('Chips', { exact: true }),
        });
        await expect(chipsCard).toBeVisible();
        await expect(chipsCard.getByText(/^\d[\d,]*$/).first(), 'chips balance').toBeVisible();
    });

    test('@smoke @regression XP card shows an XP total and a tier', async ({ page }) => {
        const xpCard = page.getByRole('main').getByRole('article').filter({
            has: page.getByText('XP', { exact: true }),
        });
        await expect(xpCard).toBeVisible();
        await expect(xpCard, 'XP total').toContainText(/\d[\d,]*/);
        // Tier name: the card's last line (e.g. "Voyager"); any non-numeric word.
        await expect(xpCard.getByRole('paragraph').last(), 'tier name').toHaveText(/^[A-Za-z][A-Za-z ]*$/);
    });
});
