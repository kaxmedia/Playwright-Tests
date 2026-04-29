import { Page, Locator, expect } from '@playwright/test';

export const SLOTS_PAGE = {
    url: 'https://www.gambling.com/uk/online-casinos/slots/games',
    title: /slots/i,
};

/** Read-only account for demo flows — prefer env overrides in CI */
export const TEST_USER = {
    /**
     * Sign-in modal expects the registered email. Order: `SLOTS_TEST_EMAIL`, else if `SLOTS_TEST_USER`
     * is already an email use it, else `${user}@gmail.com` (default test account is Gmail).
     */
    email:
        process.env.SLOTS_TEST_EMAIL ??
        (() => {
            const u = process.env.SLOTS_TEST_USER ?? 'testpot209';
            return u.includes('@') ? u : `${u}@gmail.com`;
        })(),
    username: process.env.SLOTS_TEST_USER ?? 'testpot209',
    password: process.env.SLOTS_TEST_PASSWORD ?? 'MyTest123',
};

/**
 * UK slot games listing — primary interactive widget uses `.automation-slot-game`
 * (search / filters / sort / grid). Embedded `.operator-item` blocks also appear in article body.
 */
export class SlotsGamesPage {
    readonly page: Page;

    /** Vue widget root — games grid, compare, play demo */
    readonly widgetRoot: Locator;

    readonly pageTitle: Locator;
    readonly logo: Locator;
    readonly mainNav: Locator;
    readonly footer: Locator;

    readonly slotWidget: Locator;
    readonly gameCards: Locator;
    readonly gameNames: Locator;
    readonly gameImages: Locator;

    readonly filterBar: Locator;
    readonly filterButtons: Locator;
    readonly sortDropdown: Locator;

    readonly searchInput: Locator;

    readonly pagination: Locator;
    readonly nextPageBtn: Locator;
    readonly prevPageBtn: Locator;

    readonly playFreeButtons: Locator;
    readonly playRealButtons: Locator;

    readonly compareCheckboxes: Locator;
    readonly compareBar: Locator;
    readonly compareButton: Locator;
    readonly compareModal: Locator;
    readonly compareModalLogos: Locator;
    readonly compareModalCloseBtn: Locator;

    readonly loginModal: Locator;
    /** Sign-in step uses email + password (`#signin-email` / `#signin-password`) */
    readonly loginEmailInput: Locator;
    readonly loginPasswordInput: Locator;
    readonly loginSubmitBtn: Locator;

    readonly gameInfoModal: Locator;
    readonly gameInfoPlayFreeBtn: Locator;
    readonly gameInfoPlayRealBtn: Locator;
    readonly gameInfoCloseBtn: Locator;

    readonly gameIframe: Locator;

    constructor(page: Page) {
        this.page = page;

        this.pageTitle = page.locator('h1.automation-section-title, h1').first();
        this.logo = page.locator('img.global-nav-logo').nth(1);
        this.mainNav = page.locator('nav').first();
        this.footer = page.locator('footer').first();

        this.widgetRoot = page.locator('.automation-slot-game').first();

        // Filters + search live in GDC filter wrapper above / beside the grid
        this.slotWidget = page.locator('.gdc-filter-wrapper').first();

        // One tile per column in the responsive grid
        this.gameCards = this.widgetRoot.locator('.gdc-filterable-items > div');

        this.gameImages = this.gameCards.locator('img');
        // Scoped to the slot widget so article/body links don’t pollute navigation tests
        this.gameNames = this.widgetRoot.locator(
            'a[href*="/games/"]:not([href*="/go/"]), a[href*="/slots/"]:not([href*="/go/"])'
        );

        this.filterBar = page.locator('.gdc-filter-wrapper').first();
        this.filterButtons = page.locator('.gdc-filter-wrapper .gdc-filter__attribute h3');
        this.sortDropdown = page.locator('button.dropbtn').filter({ hasText: /^\s*Sort\s*$/i }).first();

        this.searchInput = page.locator('input[placeholder*="Search slot" i]').first();

        this.pagination = page.locator('nav[aria-label*="pagination" i]').first();
        this.nextPageBtn = page.locator('a[rel="next"]').first();
        this.prevPageBtn = page.locator('a[rel="prev"]').first();

        this.playFreeButtons = this.gameCards.locator('button.play-demo-button');
        this.playRealButtons = this.gameCards.locator('a.automation-play-now-cta[href*="/go/"], a[href*="/go/"].exit-page-link');

        this.compareCheckboxes = this.gameCards.locator('input[type="checkbox"][id^="add-compare-"]');
        this.compareBar = page.locator('#slot-comparison-bar').last();
        this.compareButton = page.getByRole('button', { name: /^Compare$/i }).last();
        this.compareModal = page.locator('#slot-comparison-modal').first();
        this.compareModalLogos = this.compareModal.locator('img').filter({
            hasNot: page.locator('[class*="arrow"], [alt*="Arrow" i]'),
        });
        this.compareModalCloseBtn = this.compareModal.getByRole('button', { name: /close modal/i });

        this.loginModal = page.locator('#signup-modal').first();
        this.loginEmailInput = this.loginModal.locator('#signin-email');
        this.loginPasswordInput = this.loginModal.locator('#signin-password');
        this.loginSubmitBtn = this.loginModal.locator('button[type="submit"]').filter({ hasText: /^Sign In$/i });

        this.gameInfoModal = page.locator('#slot-game-demo-modal').first();
        // In-grid tiles use .play-demo-button; the post-login game overlay often exposes “Play Free Demo” by name only
        this.gameInfoPlayFreeBtn = this.gameInfoModal
            .getByRole('button', { name: /play free demo/i })
            .or(this.gameInfoModal.locator('button, a').filter({ hasText: /play free demo/i }))
            .or(this.gameInfoModal.getByText('Play Free Demo').first())
            .first();
        this.gameInfoPlayRealBtn = this.gameInfoModal
            .getByRole('link', { name: /play for real/i })
            .or(this.gameInfoModal.locator('a[href*="/go/"]').filter({ hasText: /play for real/i }))
            .first();
        this.gameInfoCloseBtn = this.gameInfoModal.getByRole('button', { name: /close/i }).first();

        this.gameIframe = this.gameInfoModal.locator('iframe[src*="game"], iframe').first();
    }

    /** Opens the email/password sign-in form inside `#signup-modal` (not the signup fields). */
    async prepareSignInForm(): Promise<void> {
        await this.loginModal.getByRole('button', { name: /^Sign In$/ }).click();
        await this.loginModal.getByRole('button', { name: /Continue with Email/i }).click();
        await expect(this.loginEmailInput).toBeVisible({ timeout: 10000 });
    }

    async goto(): Promise<void> {
        await this.page.goto(SLOTS_PAGE.url);
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
        await this.page.getByRole('button', { name: /no,? thanks/i }).click({ timeout: 4000 }).catch(() => {});
    }

    async getGameCount(): Promise<number> {
        return this.gameCards.count();
    }

    /**
     * Clicks **Play for Real** on a game tile (typically `target="_blank"`). Returns the new browser tab.
     */
    async openPlayForRealAffiliateTab(cardIndex = 0): Promise<Page> {
        const cta = this.playRealButtons.nth(cardIndex);
        await cta.scrollIntoViewIfNeeded();

        const popupPromise = this.page.context().waitForEvent('page');
        await cta.click();
        const newPage = await popupPromise;
        await newPage.waitForLoadState('domcontentloaded');
        return newPage;
    }

    /** Log in from Play Demo, reopen overlay; set `launchDemo: false` to assert modal CTAs without starting the iframe. */
    async playFreeDemoFlow(cardIndex = 0, options?: { launchDemo?: boolean }): Promise<void> {
        const launchDemo = options?.launchDemo ?? true;
        const card = this.gameCards.nth(cardIndex);
        const playFreeBtn = card.locator('button.play-demo-button').first();

        await playFreeBtn.scrollIntoViewIfNeeded();
        await playFreeBtn.click();

        await expect(this.loginModal).toBeVisible({ timeout: 8000 });
        await this.prepareSignInForm();
        await this.loginEmailInput.fill(TEST_USER.email);
        await this.loginPasswordInput.fill(TEST_USER.password);
        await this.loginSubmitBtn.click();

        await expect(this.loginModal).toBeHidden({ timeout: 20000 });

        await playFreeBtn.click();

        await expect(this.gameInfoModal).toBeVisible({ timeout: 12000 });
        await this.page.getByRole('button', { name: /no,? thanks/i }).click({ timeout: 3000 }).catch(() => {});

        await expect(this.gameInfoPlayFreeBtn).toBeVisible({ timeout: 12000 });
        if (!launchDemo) return;

        await this.gameInfoPlayFreeBtn.click();
    }

    async searchForGame(query: string): Promise<void> {
        await this.searchInput.scrollIntoViewIfNeeded();
        await this.searchInput.click();
        await this.searchInput.fill(query);
        await this.page.waitForTimeout(1500);
    }

    async clearSearch(): Promise<void> {
        await this.searchInput.clear();
        await this.page.keyboard.press('Enter').catch(() => {});
        await this.page.waitForTimeout(1200);
    }

    /**
     * Opens the Theme dropdown and selects an option (e.g. a niche theme) so the visible grid changes.
     */
    async selectThemeFilterOption(themeLabel: string | RegExp): Promise<void> {
        await this.filterBar.scrollIntoViewIfNeeded();
        // Panels order on UK slots listing: Volatility, Software, Theme, Feature
        const panel = this.page.locator('.gdc-filter__dropdown-panel').nth(2);
        await panel.locator('h3').first().click();
        await this.page.waitForTimeout(400);
        const option =
            typeof themeLabel === 'string'
                ? panel.locator('.gdc-filter__attribute-btn').filter({ hasText: new RegExp(`^${themeLabel}$`, 'i') })
                : panel.locator('.gdc-filter__attribute-btn').filter({ hasText: themeLabel });
        await option.first().click();
        await this.page.waitForTimeout(2000);
    }

    async tickCompareCheckbox(index: number): Promise<void> {
        const cb = this.compareCheckboxes.nth(index);
        await cb.scrollIntoViewIfNeeded();
        await cb.check({ force: true });
    }

    async openCompareModal(): Promise<void> {
        await this.tickCompareCheckbox(0);
        await this.tickCompareCheckbox(1);
        await this.page.waitForTimeout(800);
        await expect(this.compareButton).toBeVisible({ timeout: 15000 });
        await this.compareButton.click({ force: true });
        await expect(this.compareModal).toBeVisible({ timeout: 10000 });
    }

    async closeCompareModal(): Promise<void> {
        await this.compareModalCloseBtn.evaluate((el: HTMLElement) => el.click());
    }
}
