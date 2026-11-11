import { test, expect, type Page } from '../fixtures/test';
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

/**
 * Open a logged-in Rewards page (all under /ie: the shared E2E account resolves to IE; its header
 * "Go to Rewards" link points to /ie/rewards-overview from /, /uk and /ie, and every /uk/... rewards
 * route redirects to /ie/..., live-verified 2026-11-10).
 *
 * US visitors can't reach the Rewards pages: /ie/rewards-overview loads (200), then the page itself
 * navigates to /us, and /us/rewards-overview is a 404 (confirmed from CI run 42848437635's trace,
 * 2026-11-10). CI's GitHub runners are US, so this block only really runs from non-US IPs (local
 * runs). The skip is limited to that exact bounce; any other outcome still fails.
 */
async function openRewardsPage(page: Page, path: string): Promise<void> {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    const heading = page.getByRole('main').getByRole('heading', { level: 1 });
    const outcome = await Promise.race([
        heading.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'rewards' as const),
        page.waitForURL((url) => /^\/us(\/|$)/.test(url.pathname), { timeout: 20000 }).then(() => 'us' as const),
    ]).catch(() => 'neither' as const);
    test.skip(outcome === 'us', 'Rewards pages bounce US visitors to /us (no US Rewards); CI runners are US');
    await expect(heading).toBeVisible();
    // Still on the requested page, not bounced elsewhere or to a signed-out page.
    await expect(page).toHaveURL(new RegExp(`${path}(\\?|$)`));
}

// Store and notification writes that no test may ever send (see the store tests' BROWSE ONLY note).
const STORE_WRITES = /cart|checkout|order|redeem|purchase/i;
const NOTIFICATION_WRITES = /notification/i;

/**
 * Abort every non-GET request whose URL matches `pattern`, and return the list of what was aborted, so a
 * test can assert nothing (or only an expected request) was attempted. GETs pass through.
 */
async function blockWrites(page: Page, pattern: RegExp): Promise<string[]> {
    const blocked: string[] = [];
    await page.route(pattern, async (route) => {
        if (route.request().method() === 'GET') return route.continue();
        blocked.push(`${route.request().method()} ${route.request().url()}`);
        await route.abort();
    });
    return blocked;
}

/** The store's per-item chip prices: paragraphs whose whole text is "N Chips" (not "Balance N Chips"). */
const storePrices = (page: Page) =>
    page.getByRole('main').getByRole('paragraph').filter({ hasText: /^\s*\d[\d,]*\s+chips\s*$/i });
const chipNumber = (text: string) => Number(text.replace(/[^\d]/g, ''));

/** Open the store and wait for real catalog items (it loads ~4s after the page, behind skeleton cards). */
async function openStoreCatalog(page: Page): Promise<void> {
    await openRewardsPage(page, '/ie/reward-store');
    await expect(storePrices(page).first(), 'catalog items never loaded').toBeVisible({ timeout: 30000 });
}

// Logged in, the Rewards V2 pages for the shared E2E account (IE). All display-only.
// Live-verified 2026-11-10 (chrome, firefox, webkit, two loads each):
//   - /ie/rewards-overview: a Chips card (<article> with a "Chips" label and the balance, e.g. "208") and
//     an XP card ("XP" label, the XP total e.g. "2,508", and the tier name, e.g. "Voyager").
//   - /ie/user-missions ("Earn"): missions/challenges as links or buttons named "<title> <progress>
//     <+reward>", e.g. "Play Daily Cosmo Game 0/1 +13" (15+ of them).
//   - /ie/user-wallet: a "Chips History" ledger <article> (rows of description, dd/mm/yyyy date, signed
//     amount, e.g. "Founding Bonus · 10/11/2026 · +200") and a "Purchase History" article. The wallet
//     page itself has no balance figure; the balance shown on it is the header chip badge
//     ("Go to Rewards", e.g. "208").
//   - /ie/reward-store: "Balance N Chips", and 24 catalog items, each an image named "<brand> €<value>",
//     the brand, a chip price ("850 Chips") and an action button ("Not Enough Chips", disabled at the
//     account's balance; it becomes add-to-cart once the account can afford an item).
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
    });

    test.afterEach(() => {
        authLock?.release();
        authLock = undefined;
    });

    test('@smoke @regression Chips balance card shows a balance', async ({ page }) => {
        await openRewardsPage(page, '/ie/rewards-overview');
        const chipsCard = page.getByRole('main').getByRole('article').filter({
            has: page.getByText('Chips', { exact: true }),
        });
        await expect(chipsCard).toBeVisible();
        await expect(chipsCard.getByText(/^\d[\d,]*$/).first(), 'chips balance').toBeVisible();
    });

    test('@smoke @regression XP card shows an XP total and a tier', async ({ page }) => {
        await openRewardsPage(page, '/ie/rewards-overview');
        const xpCard = page.getByRole('main').getByRole('article').filter({
            has: page.getByText('XP', { exact: true }),
        });
        await expect(xpCard).toBeVisible();
        await expect(xpCard, 'XP total').toContainText(/\d[\d,]*/);
        // Tier name: the card's last line (e.g. "Voyager"); any non-numeric word.
        await expect(xpCard.getByRole('paragraph').last(), 'tier name').toHaveText(/^[A-Za-z][A-Za-z ]*$/);
    });

    test('@smoke @regression Earn page lists at least one mission with progress and a chip reward', async ({ page }) => {
        await openRewardsPage(page, '/ie/user-missions');
        // Read-only: mission entries are links/buttons, but none is ever clicked here.
        const missionName = /\b\d+\s*\/\s*\d+\b.*\+\s*\d[\d,]*/;
        const main = page.getByRole('main');
        const missions = main.getByRole('link', { name: missionName }).or(main.getByRole('button', { name: missionName }));
        await expect(missions.first()).toBeVisible({ timeout: 15000 });
        expect(await missions.count(), 'no missions listed').toBeGreaterThan(0);
    });

    test('@smoke @regression Wallet shows the chip balance and a chips history ledger', async ({ page }) => {
        await openRewardsPage(page, '/ie/user-wallet');
        // The wallet page has no balance figure of its own; the balance on it is the header chip badge.
        const balanceBadge = page.getByRole('link', { name: /go to rewards/i }).filter({ visible: true });
        await expect(balanceBadge.first(), 'header chip balance').toHaveText(/^\s*\d[\d,]*\s*$/);

        const ledger = page.getByRole('main').getByRole('article').filter({
            has: page.getByRole('heading', { name: /chips history/i }),
        });
        await expect(ledger).toBeVisible();
        // At least one ledger row: a dd/mm/yyyy date and a signed/zero chip amount. Every account has at
        // least its "Opening balance" row.
        await expect(ledger.getByText(/^\d{2}\/\d{2}\/\d{4}$/).first(), 'ledger row date').toBeVisible();
        await expect(ledger.getByText(/^[+-]?\d[\d,]*$/).first(), 'ledger row amount').toBeVisible();
    });

    test('@smoke @regression Store catalog shows at least one item with a chip price (browse only)', async ({ page }) => {
        // BROWSE ONLY. The store has real, money-backed fulfilment (gift cards and physical goods via
        // CatalogAPI): this test never adds to cart, opens the cart, checks out or orders, and no test ever
        // may. Safety net: any non-GET request to a cart/checkout/order/redeem/purchase URL is aborted and
        // fails the test, so an accidental click in a future edit can't place an order.
        const blocked = await blockWrites(page, STORE_WRITES);

        await openRewardsPage(page, '/ie/reward-store');
        const main = page.getByRole('main');
        // The catalog loads after the page (grey skeleton cards first), so wait for real items: each item's
        // image is named "<brand> <value>", e.g. "adidas €10.00". Attached, not visible: product images
        // lazy-load and WebKit reports an unloaded one as not visible.
        await expect(main.getByRole('img', { name: /[€£$]\s*\d/ }).first(), 'catalog items never loaded').toBeAttached({ timeout: 30000 });
        // Item chip price: a paragraph whose whole text is "N Chips". Matching paragraphs (not any text)
        // keeps the "Balance 208 Chips" line out: its "208 Chips" is a span inside that paragraph.
        const chipPrices = main.getByRole('paragraph').filter({ hasText: /^\s*\d[\d,]*\s+chips\s*$/i });
        await expect(chipPrices.first(), 'catalog item chip price').toBeVisible();
        expect(await chipPrices.count(), 'no catalog items with a chip price').toBeGreaterThan(0);

        expect(blocked, 'store test must not send any cart/checkout/order request').toEqual([]);
    });

    // ── Phase 3 (GDCU-9156 / GDCU-9305): store UI, Earn detail, referral, notifications ──────────────
    // Store tests are BROWSE ONLY like the one above: they use search/sort/filters and open the (empty)
    // cart view, but never add to cart, check out or order, and the same guard fails the test if any
    // cart/checkout/order/redeem/purchase write is attempted. Live-verified 2026-11-11 (store layout:
    // Search, Sort with "Chips: low to high" / "Chips: high to low" / "A - Z", Filters panel with Brand /
    // Category / Type of Product / Affordability dropdowns plus "Apply filters" / "Clear"; each item shows
    // name, brand, "N Chips" and an action button).

    test('@regression Store search narrows the catalog to matching items (browse only)', async ({ page }) => {
        const blocked = await blockWrites(page, STORE_WRITES);
        await openStoreCatalog(page);
        const prices = storePrices(page);
        const main = page.getByRole('main');
        const before = await prices.count();

        await main.getByPlaceholder(/search products/i).fill('adidas');
        // Each item's brand line is its own paragraph ("Adidas"); every remaining item must be an Adidas one.
        const adidasBrand = main.getByRole('paragraph').filter({ hasText: /^\s*adidas\s*$/i });
        await expect.poll(async () => (await prices.count()) > 0 && (await prices.count()) < before, { timeout: 15000 }).toBe(true);
        await expect.poll(async () => (await adidasBrand.count()) === (await prices.count()), { timeout: 15000 }).toBe(true);

        await main.getByPlaceholder(/search products/i).fill('');
        await expect.poll(() => prices.count(), { timeout: 15000 }).toBe(before);
        expect(blocked, 'store test must not send any cart/checkout/order request').toEqual([]);
    });

    test('@regression Store sort orders items by chip price both ways (browse only)', async ({ page }) => {
        const blocked = await blockWrites(page, STORE_WRITES);
        await openStoreCatalog(page);
        const main = page.getByRole('main');
        const prices = storePrices(page);
        const values = async () => (await prices.allInnerTexts()).map(chipNumber);
        const isSorted = (v: number[], dir: 1 | -1) => v.length > 1 && v.every((x, i) => i === 0 || (x - v[i - 1]) * dir >= 0);

        // High-to-low first: the default order is already low-to-high, so this proves the sort really applied.
        await main.getByRole('button', { name: /^sort$/i }).click();
        await main.getByRole('button', { name: /chips:\s*high to low/i }).click();
        await expect.poll(async () => isSorted(await values(), -1), { message: 'prices not high-to-low', timeout: 15000 }).toBe(true);

        await main.getByRole('button', { name: /chips:\s*high to low/i }).click(); // the Sort control now shows the active option
        await main.getByRole('button', { name: /chips:\s*low to high/i }).click();
        await expect.poll(async () => isSorted(await values(), 1), { message: 'prices not low-to-high', timeout: 15000 }).toBe(true);
        expect(blocked, 'store test must not send any cart/checkout/order request').toEqual([]);
    });

    test('@regression Store filters panel filters by brand and clears (browse only)', async ({ page }) => {
        const blocked = await blockWrites(page, STORE_WRITES);
        await openStoreCatalog(page);
        const main = page.getByRole('main');
        const prices = storePrices(page);
        const before = await prices.count();

        await main.getByRole('button', { name: /^filters$/i }).click();
        for (const name of ['Brand', 'Category', 'Type of Product', 'Affordability']) {
            await expect(main.getByRole('combobox', { name }), `${name} filter`).toBeVisible();
        }
        // Pick the first real brand (data-driven: options read "<Brand> (<count>)"), apply, expect that count.
        const brand = main.getByRole('combobox', { name: 'Brand' });
        const option = (await brand.getByRole('option').allInnerTexts()).find((o) => !/^all brands/i.test(o) && /\(\d+\)\s*$/.test(o));
        expect(option, 'no brand option with a count').toBeTruthy();
        const [, brandName, brandCount] = option!.match(/^(.*?)\s*\((\d+)\)\s*$/)!;
        await brand.selectOption({ label: option! });
        await main.getByRole('button', { name: /^apply filters$/i }).click();
        await expect.poll(() => prices.count(), { message: `Brand=${brandName} should list ${brandCount} item(s)`, timeout: 15000 })
            .toBe(Math.min(Number(brandCount), before));

        await main.getByRole('button', { name: /^clear$/i }).click();
        await expect.poll(() => prices.count(), { timeout: 15000 }).toBe(before);
        expect(blocked, 'store test must not send any cart/checkout/order request').toEqual([]);
    });

    test('@regression Store blocks unaffordable items and the cart shows no checkout when empty (browse only)', async ({ page }) => {
        const blocked = await blockWrites(page, STORE_WRITES);
        await openStoreCatalog(page);
        const main = page.getByRole('main');

        // Overspend protection: every item priced above the balance has a disabled "Not Enough Chips"
        // button, so it can't be added at all. Computed from the live balance (the account earns daily).
        const balance = chipNumber(await main.getByText(/^balance\s+[\d,]+\s+chips$/i).first().innerText());
        const unaffordable = (await storePrices(page).allInnerTexts()).map(chipNumber).filter((p) => p > balance).length;
        const notEnough = main.getByRole('button', { name: /not enough chips/i });
        await expect(notEnough, `items priced above the ${balance}-chip balance`).toHaveCount(unaffordable);
        for (let i = 0; i < unaffordable; i++) await expect(notEnough.nth(i)).toBeDisabled();

        // Cart view (opening it is a read): the shared account's cart is empty and offers no checkout.
        // This assumes nobody leaves items in the shared E2E account's cart by hand.
        await main.getByRole('button', { name: /view cart/i }).click();
        await expect(page.getByText('My Cart', { exact: true })).toBeVisible();
        await expect(page.getByText(/^0 items$/i)).toBeVisible();
        await expect(page.getByText(/your cart is empty/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /checkout|place order/i }), 'no checkout control on an empty cart').toHaveCount(0);
        expect(blocked, 'store test must not send any cart/checkout/order request').toEqual([]);
    });

    // Earn page values are the documented ones (Confluence "Rewards V2 — How the system works", section 6,
    // Challenges table), which matched live on 2026-11-11.
    test('@regression Earn page lists the streak milestones with their documented chip values, in order', async ({ page }) => {
        await openRewardsPage(page, '/ie/user-missions');
        const text = await page.getByRole('main').innerText();
        const streaks: Array<[number, string]> = [[3, '4'], [7, '13'], [30, '65'], [60, '130'], [90, '250'], [120, '380'], [365, '1,250']];
        for (const [day, chips] of streaks) {
            expect(text, `${day} Day Streak: progress x/${day} and +${chips}`).toMatch(new RegExp(`${day} Day Streak\\s+\\d+\\s*/\\s*${day}\\s+\\+${chips}(?![\\d,])`));
        }
        // Grouped: the milestones appear as one consecutive run, shortest first.
        const order = streaks.map(([day]) => text.indexOf(`${day} Day Streak`));
        expect(order.every((pos, i) => pos >= 0 && (i === 0 || pos > order[i - 1])), 'streak milestones out of order').toBe(true);
    });

    test('@regression Earn page review mission shows +20 chips and the 3-per-week cap', async ({ page }) => {
        await openRewardsPage(page, '/ie/user-missions');
        // Documented: t_review_submit = 20 chips, max 3 rewards per rolling 7 days. Display-only, never clicked.
        await expect(page.getByRole('main').getByRole('button', { name: /^submit a review\s+\d+\s*\/\s*3\s*\(3 max\.? per week[^)]*\)\s*\+20$/i })).toBeVisible();
    });

    test('@regression Refer & Earn shows the referrer reward of 85 chips', async ({ page }) => {
        await page.goto('/profile/refer', { waitUntil: 'domcontentloaded' });
        // /profile/refer isn't under openRewardsPage's /us bounce check. Skip the same way for visitors the
        // site places outside Rewards V2 (GB/IE/CA), e.g. CI's US runners; profile.spec.ts skips this page in
        // CI for the same reason. Only when the country is known: otherwise the test runs and fails loudly.
        const country = await page.evaluate(() => (window as unknown as { getIpConfig?: () => { ipcountry?: string } }).getIpConfig?.()?.ipcountry?.toUpperCase()).catch(() => undefined);
        test.skip(country !== undefined && !['GB', 'IE', 'CA'].includes(country), `Refer & Earn is Rewards V2 content; site places this visitor in ${country} (outside GB/IE/CA)`);
        await expect(page).toHaveURL(/\/profile\/refer/);
        const main = page.getByRole('main').first();
        // Documented: t_referral = 85 chips to BOTH sides. Only the referrer's 85 is asserted: the referee's
        // 85 is only visible to the referred user after they sign up.
        await expect(main.getByText(/refer friends and earn 85 chips/i)).toBeVisible({ timeout: 20000 });
        await expect(main.getByText(/receive \+85 chips/i)).toBeVisible();
        // Unlock condition asserted as rendered, not as documented: the doc says the referral triggers when
        // the referred user reaches 50 XP, but live copy (2026-11-11) says "your friend must gain 200 chips".
        // Flagged as a doc-vs-live discrepancy; this only checks that a numeric unlock condition is shown.
        await expect(main.getByText(/friend must (gain|reach) \d[\d,]*\s*(chips|xp)/i)).toBeVisible();
    });

    // Notifications: opening the bell POSTs /rewards/notifications/clear-badge, which would clear the shared
    // account's unread badge. That request is aborted here (account state untouched), and the test never
    // clicks "Mark all as read". Unread count is only checked for format: it depends on real account activity.
    test('@regression notification bell opens a panel listing notifications (read-only)', async ({ page }) => {
        const blocked = await blockWrites(page, NOTIFICATION_WRITES);
        await openRewardsPage(page, '/ie/rewards-overview');
        const bell = page.getByRole('button', { name: /^notifications(,\s*\d+\s+new)?$/i }).filter({ visible: true }).first();
        await expect(bell).toBeVisible();
        await bell.click();

        const panel = page.getByRole('dialog', { name: 'Notifications' });
        await expect(panel.getByRole('heading', { name: 'Notifications' })).toBeVisible();
        await expect(panel.getByRole('button', { name: /^all$/i })).toBeVisible();
        await expect(panel.getByRole('button', { name: /^unread(\s+\d+)?$/i })).toBeVisible();
        // A notification entry is a button carrying a title and an age ("15h", "1d", "107d"); the panel's
        // other controls (All / Unread tabs, "Mark all as read") have no age.
        const entries = panel.getByRole('button').filter({ hasText: /\b\d+\s*(m|h|d|w)\s*$/ });
        await expect(entries.first(), 'no notifications listed').toBeVisible();
        await expect(entries.first(), 'notification entry has a title').toHaveText(/[a-z]{3,}/i);

        expect(blocked.every((r) => /notifications\/clear-badge/.test(r)), `unexpected notification write: ${blocked.join(', ')}`).toBe(true);
    });
});

// Rewards V2 is live only in GB/IE/CA-ON/CA-AB; every other market is a "shell" with no rewards nav at
// all (this is also why Iceland's nav is small: see ICELAND_NAV_LINK_FLOOR_REASON). Live-verified
// 2026-11-10, logged out: /uk, /ie and /ca show a visible "Rewards" -> /rewards nav link; /is, /is/en and
// /de show none. Logged out, no market shows the "Go to Rewards" chip-balance badge (it's logged-in only).
// Every market, shell or live, has a HIDDEN "Chips"/"Flísar" -> /profile sign-up CTA in the nav, so that
// link doesn't tell them apart and isn't asserted.
test.describe('Rewards — geofencing (logged out)', () => {
    test.beforeEach(async ({ page }) => {
        // Bypass the site-wide market redirect (office egress is DE: /is would bounce to /de); see
        // norway-geo-block.spec.ts. Nav presence is decided by the URL's market, not the visitor's IP.
        await page.addInitScript(() => {
            const ua = navigator.userAgent;
            Object.defineProperty(navigator, 'userAgent', { get: () => `${ua} headless` });
        });
    });

    const rewardsNavLink = (page: Page) =>
        page.getByRole('navigation').getByRole('link', { name: 'Rewards', exact: true }).filter({ visible: true });

    for (const geo of [{ name: 'Iceland', path: '/is' }, { name: 'Germany', path: '/de' }]) {
        test(`@smoke @regression shell market ${geo.name} (${geo.path}) shows no Rewards nav or chip balance`, async ({ page }) => {
            await page.goto(geo.path, { waitUntil: 'domcontentloaded' });
            await expect(page).toHaveURL(new RegExp(`${geo.path}(\\/|\\?|$)`));
            await expect(page.getByRole('navigation').first()).toBeVisible();
            await expect(rewardsNavLink(page), `${geo.path} should have no Rewards nav link`).toHaveCount(0);
            await expect(page.getByRole('link', { name: /go to rewards/i }), `${geo.path} should have no chip badge`).toHaveCount(0);
        });
    }

    // Positive control: the same locator finds the link on a live Rewards V2 market, so the shell
    // assertions above can't pass just because the nav markup changed.
    test('@smoke @regression live market Ireland (/ie) shows the Rewards nav link', async ({ page }) => {
        await page.goto('/ie', { waitUntil: 'domcontentloaded' });
        await expect(rewardsNavLink(page).first()).toBeVisible();
        await expect(rewardsNavLink(page).first()).toHaveAttribute('href', '/rewards');
    });
});
