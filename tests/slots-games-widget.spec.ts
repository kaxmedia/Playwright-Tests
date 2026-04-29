import { test, expect } from '@playwright/test';
import { SlotsGamesPage, SLOTS_PAGE, TEST_USER } from '../pages/SlotsGamesPage';

// ─── Slots Games Widget Tests ─────────────────────────────────────────────────
//
// Primary focus: the slot widget at gambling.com/uk/online-casinos/slots/games
//
// Covers:
//   1. Page fundamentals
//   2. Game grid — cards, images, names
//   3. Filters & sort
//   4. Search
//   5. Pagination
//   6. Play for Real — hrefs, and click-through to /go/ in a new tab
//   7. Play Free Demo — full login flow + game iframe
//   8. Game name → review page navigation
//   9. Compare modal — same pattern as brand compare
//  10. Key page checks — footer, responsible gambling
//
// Default sign-in email resolves to {SLOTS_TEST_USER}@gmail.com (testpot209@gmail.com). Override with SLOTS_TEST_EMAIL.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slots Games Widget — UK', () => {
    let slotsPage: SlotsGamesPage;

    test.beforeEach(async ({ page }) => {
        slotsPage = new SlotsGamesPage(page);
        await slotsPage.goto();
    });

    // ── 1. Page fundamentals ───────────────────────────────────────────────────

    test('@smoke page loads with correct URL and non-empty title', async ({ page }) => {
        await expect(page).toHaveURL(SLOTS_PAGE.url);
        const title = await page.title();
        expect(title).not.toBe('');
        expect(title.toLowerCase()).not.toContain('404');
        expect(title.toLowerCase()).not.toContain('error');
    });

    test('@smoke H1 is visible and non-empty', async () => {
        await expect(slotsPage.pageTitle).toBeVisible();
        const h1Text = await slotsPage.pageTitle.innerText();
        expect(h1Text.trim()).not.toBe('');
    });

    test('@smoke logo is visible', async () => {
        await expect(slotsPage.logo).toBeVisible();
    });

    test('@smoke main navigation is visible', async () => {
        await expect(slotsPage.mainNav).toBeVisible();
    });

    // ── 2. Game grid ───────────────────────────────────────────────────────────

    test('@smoke slot widget is present on the page', async () => {
        await expect(slotsPage.slotWidget).toBeVisible();
    });

    test('@smoke game grid renders at least 10 game cards', async () => {
        const count = await slotsPage.getGameCount();
        expect(count).toBeGreaterThanOrEqual(10);
    });

    test('@regression each game card has a visible image', async () => {
        const count = await slotsPage.gameCards.count();
        const limit = Math.min(count, 12);
        for (let i = 0; i < limit; i++) {
            const img = slotsPage.gameCards.nth(i).locator('img').first();
            await expect(img).toBeVisible();
            const src = await img.getAttribute('src');
            expect(src).toBeTruthy();
        }
    });

    test('@regression each game card has a visible name', async () => {
        const count = await slotsPage.gameCards.count();
        const limit = Math.min(count, 12);
        for (let i = 0; i < limit; i++) {
            const name = slotsPage.gameCards.nth(i)
                .locator('[class*="game-name"], [class*="game-title"], a[href*="/slots/"], a[href*="/games/"]')
                .first();
            const text = await name.innerText().catch(() => '');
            expect(text.trim()).not.toBe('');
        }
    });

    test('@smoke game cards have Play Free Demo buttons', async () => {
        const count = await slotsPage.playFreeButtons.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('@smoke game cards have Play for Real buttons', async () => {
        const count = await slotsPage.playRealButtons.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    // ── 3. Filters & sort ──────────────────────────────────────────────────────

    test('@smoke filter bar is visible', async () => {
        await expect(slotsPage.filterBar).toBeVisible();
    });

    test('@smoke filter bar has at least 2 filter options', async () => {
        const count = await slotsPage.filterButtons.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('@regression search narrows the visible grid (widget reacts to controls)', async () => {
        const beforeCount = await slotsPage.getGameCount();
        await slotsPage.searchForGame('starburst');
        await slotsPage.page.waitForTimeout(1500);
        const afterCount = await slotsPage.getGameCount();
        expect(afterCount).toBeGreaterThanOrEqual(1);
        expect(afterCount).toBeLessThanOrEqual(beforeCount);
    });

    test('@regression selecting a theme filter updates the visible grid', async () => {
        const firstCardBefore = await slotsPage.gameCards.first().innerText();
        await slotsPage.selectThemeFilterOption('Christmas');
        const firstCardAfter = await slotsPage.gameCards.first().innerText();
        expect(firstCardAfter).not.toBe(firstCardBefore);
    });

    test('@regression clicking a second filter also populates the grid', async () => {
        const filterCount = await slotsPage.filterButtons.count();
        if (filterCount >= 2) {
            await slotsPage.filterButtons.nth(1).click();
            await slotsPage.page.waitForTimeout(1500);
            const count = await slotsPage.getGameCount();
            expect(count).toBeGreaterThanOrEqual(1);
        }
    });

    test('@smoke sort dropdown is present', async () => {
        await slotsPage.sortDropdown.scrollIntoViewIfNeeded();
        await expect(slotsPage.sortDropdown).toBeVisible();
    });

    // ── 4. Search ──────────────────────────────────────────────────────────────

    test('@smoke search input is visible', async () => {
        await slotsPage.searchInput.scrollIntoViewIfNeeded();
        await expect(slotsPage.searchInput).toBeVisible();
    });

    test('@regression searching for a game name returns results', async () => {
        await slotsPage.searchForGame('starburst');
        const count = await slotsPage.getGameCount();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('@regression search results are relevant to the query', async () => {
        await slotsPage.searchForGame('starburst');
        const count = await slotsPage.gameCards.count();
        const limit = Math.min(count, 5);

        // At least one result should contain the search term in name or visible text
        let found = false;
        for (let i = 0; i < limit; i++) {
            const text = await slotsPage.gameCards.nth(i).innerText();
            if (text.toLowerCase().includes('starburst')) {
                found = true;
                break;
            }
        }
        expect(found, 'At least one search result should match the query "starburst"').toBe(true);
    });

    test('@regression clearing search restores full game grid', async () => {
        await slotsPage.searchForGame('starburst');
        const filteredCount = await slotsPage.getGameCount();

        await slotsPage.clearSearch();
        const restoredCount = await slotsPage.getGameCount();

        // Grid should restore to at least as many results as before
        expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
    });

    test('@regression searching for a non-existent game shows no results or empty state', async ({ page }) => {
        await slotsPage.searchForGame('zzznomatchgamexxx');
        await slotsPage.page.waitForTimeout(1000);

        const count = await slotsPage.getGameCount();
        const bodyText = await page.locator('body').innerText();
        const hasEmptyState = bodyText.toLowerCase().includes('no results') ||
            bodyText.toLowerCase().includes('no games') ||
            bodyText.toLowerCase().includes('not found');

        // Either no cards OR an empty state message
        expect(count === 0 || hasEmptyState).toBe(true);
    });

    // ── 5. Pagination (UK slot games listing is usually a single-page grid) ────

    test('@smoke pagination controls are visible when present', async () => {
        const hasNext = (await slotsPage.nextPageBtn.count()) > 0;
        test.skip(!hasNext, 'No rel=next control — listing has no numbered pagination');
        await slotsPage.nextPageBtn.scrollIntoViewIfNeeded();
        await expect(slotsPage.nextPageBtn).toBeVisible();
    });

    test('@regression clicking next page loads a new set of games', async () => {
        test.skip((await slotsPage.nextPageBtn.count()) === 0, 'Pagination not available on this layout');
        const firstPageNames: string[] = [];
        const firstCount = await slotsPage.gameCards.count();
        const limit = Math.min(firstCount, 5);
        for (let i = 0; i < limit; i++) {
            const text = await slotsPage.gameCards.nth(i).innerText().catch(() => '');
            firstPageNames.push(text.trim());
        }

        await slotsPage.nextPageBtn.scrollIntoViewIfNeeded();
        await slotsPage.nextPageBtn.click();
        await slotsPage.page.waitForLoadState('domcontentloaded');
        await slotsPage.page.waitForTimeout(1500);

        const secondPageCount = await slotsPage.getGameCount();
        expect(secondPageCount).toBeGreaterThanOrEqual(1);

        const firstNewName = await slotsPage.gameCards.first().innerText().catch(() => '');
        expect(firstPageNames).not.toContain(firstNewName.trim());
    });

    test('@regression previous page button navigates back', async () => {
        test.skip(
            (await slotsPage.nextPageBtn.count()) === 0 || (await slotsPage.prevPageBtn.count()) === 0,
            'Pagination controls not present'
        );
        await slotsPage.nextPageBtn.scrollIntoViewIfNeeded();
        await slotsPage.nextPageBtn.click();
        await slotsPage.page.waitForTimeout(1500);

        await slotsPage.prevPageBtn.scrollIntoViewIfNeeded();
        await slotsPage.prevPageBtn.click();
        await slotsPage.page.waitForTimeout(1500);

        const count = await slotsPage.getGameCount();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    // ── 6. Play for Real ───────────────────────────────────────────────────────

    test('@smoke Play for Real buttons have valid /go/ affiliate hrefs', async () => {
        const count = await slotsPage.playRealButtons.count();
        expect(count).toBeGreaterThanOrEqual(1);

        const limit = Math.min(count, 5);
        for (let i = 0; i < limit; i++) {
            const href = await slotsPage.playRealButtons.nth(i).evaluate((el: HTMLAnchorElement) => el.href);
            expect(href).toContain('/go/');
            expect(href).not.toBe('#');
        }
    });

    test('@regression Play for Real buttons do not use dead # hrefs', async () => {
        const count = await slotsPage.playRealButtons.count();
        const limit = Math.min(count, 5);
        for (let i = 0; i < limit; i++) {
            const href = await slotsPage.playRealButtons.nth(i).getAttribute('href');
            expect(href).not.toBe('#');
        }
    });

    test('@regression clicking Play for Real opens the affiliate /go/ flow in a new tab', async ({ page }) => {
        const cta = slotsPage.playRealButtons.first();
        await expect(cta).toBeVisible();

        const href = await cta.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toContain('/go/');

        const affiliateTab = await slotsPage.openPlayForRealAffiliateTab(0);

        await expect
            .poll(() => affiliateTab.url(), { timeout: 20000 })
            .not.toMatch(/^about:blank$/);

        const url = affiliateTab.url();
        expect(url).not.toContain('/uk/online-casinos/slots/games');
        if (url.includes('gambling.com')) {
            expect(url, 'On-site affiliate hops must stay on /go/').toContain('/go/');
        } else {
            expect(url, 'Off-site redirect should be https').toMatch(/^https:\/\//);
        }

        await affiliateTab.close();
        await expect(page).toHaveURL(SLOTS_PAGE.url);
    });

    // ── 7. Play Free Demo — full login flow ────────────────────────────────────

    test('@smoke clicking Play Free Demo triggers the login modal', async () => {
        const firstPlayFree = slotsPage.playFreeButtons.first();
        await firstPlayFree.scrollIntoViewIfNeeded();
        await firstPlayFree.click();
        await expect(slotsPage.loginModal).toBeVisible({ timeout: 8000 });
    });

    test('@smoke login modal has email, password and Sign In submit', async () => {
        const firstPlayFree = slotsPage.playFreeButtons.first();
        await firstPlayFree.scrollIntoViewIfNeeded();
        await firstPlayFree.click();
        await expect(slotsPage.loginModal).toBeVisible({ timeout: 8000 });

        await slotsPage.prepareSignInForm();
        await expect(slotsPage.loginEmailInput).toBeVisible();
        await expect(slotsPage.loginPasswordInput).toBeVisible();
        await expect(slotsPage.loginSubmitBtn).toBeVisible();
    });

    test('@regression full Play Free Demo flow — login, game modal, iframe', async () => {
        // Run the full multi-step flow
        await slotsPage.playFreeDemoFlow(0);

        // After clicking Play Free Demo inside the game info modal,
        // the game should launch in an iframe
        await expect(slotsPage.gameIframe).toBeVisible({ timeout: 15000 });

        // Iframe should have a valid game src
        const src = await slotsPage.gameIframe.getAttribute('src');
        expect(src).toBeTruthy();
        expect(src).not.toBe('');
    });

    test('@regression login modal closes after successful sign in', async () => {
        const firstPlayFree = slotsPage.playFreeButtons.first();
        await firstPlayFree.scrollIntoViewIfNeeded();
        await firstPlayFree.click();

        await expect(slotsPage.loginModal).toBeVisible({ timeout: 8000 });
        await slotsPage.prepareSignInForm();
        await slotsPage.loginEmailInput.fill(TEST_USER.email);
        await slotsPage.loginPasswordInput.fill(TEST_USER.password);
        await slotsPage.loginSubmitBtn.click();

        await expect(slotsPage.loginModal).toBeHidden({ timeout: 15000 });
    });

    test('@regression game info modal contains Play Free Demo and Play for Real buttons', async () => {
        await slotsPage.playFreeDemoFlow(0, { launchDemo: false });
        // Overlay CTA is inside `#slot-game-demo-modal`; “Play for Real” stays on the same tile row as `/go/` links
        await expect(slotsPage.gameInfoPlayFreeBtn).toBeVisible({ timeout: 5000 });
        await expect(
            slotsPage.gameCards.nth(0).getByRole('link', { name: 'Play for Real', exact: true })
        ).toBeVisible({ timeout: 5000 });
    });

    // ── 8. Game name → review page navigation ─────────────────────────────────

    test('@smoke clicking a game name navigates to a slot review page', async ({ page }) => {
        const firstGameName = slotsPage.gameNames.first();
        await firstGameName.scrollIntoViewIfNeeded();

        const href = await firstGameName.evaluate((el: HTMLAnchorElement) => el.href);
        expect(href).toBeTruthy();
        expect(href).toMatch(/slots|games/i);
        expect(href).not.toBe('#');

        await firstGameName.click();
        await page.waitForLoadState('domcontentloaded');

        // Should have navigated to a different URL — not back to the games list
        await expect(page).not.toHaveURL(SLOTS_PAGE.url);
    });

    test('@regression game name links have valid hrefs before clicking', async () => {
        const count = await slotsPage.gameNames.count();
        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            const href = await slotsPage.gameNames.nth(i).evaluate((el: HTMLAnchorElement) => el.href);
            expect(href).toBeTruthy();
            expect(href).not.toBe('#');
            expect(href).toMatch(/gambling\.com/i);
        }
    });

    // ── 9. Compare modal ───────────────────────────────────────────────────────

    test('@regression compare checkboxes are present on game cards', async () => {
        const count = await slotsPage.compareCheckboxes.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('@regression ticking a compare checkbox checks it', async () => {
        const count = await slotsPage.compareCheckboxes.count();
        expect(count, 'Slot games page must have at least one compare checkbox').toBeGreaterThanOrEqual(1);

        await slotsPage.tickCompareCheckbox(0);
        const isChecked = await slotsPage.compareCheckboxes.first().isChecked();
        expect(isChecked).toBe(true);
    });

    test('@regression compare bar appears after ticking 2 games', async () => {
        const count = await slotsPage.compareCheckboxes.count();
        expect(count, 'Slot games page must have at least two compare checkboxes').toBeGreaterThanOrEqual(2);

        await slotsPage.tickCompareCheckbox(0);
        await slotsPage.tickCompareCheckbox(1);
        await slotsPage.page.waitForTimeout(800);
        await expect(slotsPage.compareButton).toBeVisible({ timeout: 15000 });
    });

    test('@smoke clicking Compare opens a modal', async () => {
        const count = await slotsPage.compareCheckboxes.count();
        expect(count, 'Slot games page must have at least two compare checkboxes').toBeGreaterThanOrEqual(2);

        await slotsPage.openCompareModal();
        await expect(slotsPage.compareModal).toBeVisible();
    });

    test('@regression compare modal contains game logos', async () => {
        const count = await slotsPage.compareCheckboxes.count();
        expect(count, 'Slot games page must have at least two compare checkboxes').toBeGreaterThanOrEqual(2);

        await slotsPage.openCompareModal();

        const logoCount = await slotsPage.compareModalLogos.count();
        expect(logoCount).toBeGreaterThanOrEqual(1);

        for (let i = 0; i < logoCount; i++) {
            await expect(slotsPage.compareModalLogos.nth(i)).toBeVisible();
            const src = await slotsPage.compareModalLogos.nth(i).getAttribute('src');
            expect(src).toBeTruthy();
        }
    });

    test('@regression compare modal can be closed', async () => {
        const count = await slotsPage.compareCheckboxes.count();
        expect(count, 'Slot games page must have at least two compare checkboxes').toBeGreaterThanOrEqual(2);

        await slotsPage.openCompareModal();
        await expect(slotsPage.compareModal).toBeVisible();

        await slotsPage.closeCompareModal();
        await expect(slotsPage.compareModal).toHaveAttribute('aria-hidden', 'true', { timeout: 15000 });
        await expect(slotsPage.compareModal).toBeHidden();
    });

    // ── 10. Key page checks ────────────────────────────────────────────────────

    test('@smoke footer is visible', async () => {
        await slotsPage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(slotsPage.footer).toBeVisible();
    });

    test('@regression footer contains links', async () => {
        const links = slotsPage.footer.locator('a');
        const count = await links.count();
        expect(count).toBeGreaterThan(5);
    });

    test('@smoke responsible gambling disclaimer is visible in footer', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const footerText = await slotsPage.footer.innerText();
        expect(footerText.toLowerCase()).toMatch(/responsible|addictive|gamble aware|gamstop/i);
    });

});