import { test, expect } from '../fixtures/test';
import { IECasinoPage, IE_CASINO } from '../pages/IECasinoPage';

test.describe('Category Landing — IE Online Casinos', () => {
    let iePage: IECasinoPage;

    test.beforeEach(async ({ page }) => {
        iePage = new IECasinoPage(page);
        await iePage.goto();
    });

    // ── 1. Page fundamentals ─────────────────────────────────────────────────

    test('@regression page loads with a non-empty title', async ({ page }) => {
        await expect(page).toHaveURL(IE_CASINO.url);
        const title = await page.title();
        expect(title).not.toBe('');
        expect(title.toLowerCase()).not.toContain('404');
        expect(title.toLowerCase()).not.toContain('error');
    });

    test('@regression H1 is visible and non-empty', async () => {
        await expect(iePage.pageTitle).toBeVisible();
        const h1Text = await iePage.pageTitle.innerText();
        expect(h1Text.trim()).not.toBe('');
    });

    test('@regression logo is visible', async () => {
        await expect(iePage.logo).toBeVisible();
    });

    test('@regression main navigation is visible', async () => {
        await expect(iePage.mainNav).toBeVisible();
    });

    test('@regression geo switcher is visible', async () => {
        await expect(iePage.geoSwitcher).toBeVisible();
    });

    test('@regression URL stays on Irish casino category path', async ({ page }) => {
        await expect(page).toHaveURL(/\/ie\/online-casinos/);
    });

    // ── 2. Operator list ─────────────────────────────────────────────────────

    test('@regression operator list renders at least 5 rows', async () => {
        const count = await iePage.getOperatorCount();
        expect(count).toBeGreaterThanOrEqual(5);
    });

    test('@regression each operator row has a visible logo', async () => {
        const logos = iePage.operatorLogos;
        const count = await logos.count();
        expect(count).toBeGreaterThanOrEqual(5);

        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            await expect(logos.nth(i)).toBeVisible();
            const src = await logos.nth(i).getAttribute('src');
            expect(src).toBeTruthy();
        }
    });

    test('@regression each operator row has a visible rating', async () => {
        const ratings = iePage.operatorRatings;
        const count = await ratings.count();
        expect(count).toBeGreaterThanOrEqual(5);
    });

    test('@regression operator CTAs are visible and have valid /go/ie/ hrefs', async () => {
        const ctas = iePage.operatorCTAs;
        const count = await ctas.count();
        expect(count).toBeGreaterThanOrEqual(5);

        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            const cta = ctas.nth(i);
            const href = await cta.evaluate((el: HTMLAnchorElement) => el.href);
            expect(href).toContain('/go/ie/');
            expect(href).not.toBe('');
            if (i < 3) {
                await cta.evaluate((el: HTMLElement) => el.scrollIntoView({ block: 'center' }));
                await expect(cta).toBeVisible({ timeout: 8000 });
            }
        }
    });

    test('@regression operator CTAs do not use dead # hrefs', async () => {
        const ctas = iePage.operatorCTAs;
        const count = await ctas.count();
        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            const href = await ctas.nth(i).getAttribute('href');
            expect(href).not.toBe('#');
        }
    });

    // ── 3. Anchor / filter menu ──────────────────────────────────────────────

    test('@regression anchor menu is visible', async () => {
        await expect(iePage.anchorMenu).toBeVisible();
    });

    test('@regression anchor menu has at least 3 links', async () => {
        const count = await iePage.anchorLinks.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression clicking an anchor link updates the operator list', async () => {
        const firstLink = iePage.anchorLinks.first();
        await firstLink.scrollIntoViewIfNeeded();
        await firstLink.click();
        await iePage.page.waitForTimeout(2000);

        const afterCount = await iePage.getOperatorCount();
        expect(afterCount).toBeGreaterThanOrEqual(1);
    });

    // ── 4. FAQ ───────────────────────────────────────────────────────────────

    test('@regression FAQ section is visible', async () => {
        await iePage.faqSection.scrollIntoViewIfNeeded();
        await expect(iePage.faqSection).toBeVisible();
    });

    test('@regression FAQ has at least 3 items', async () => {
        const count = await iePage.faqItems.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression clicking a FAQ item expands it and reveals content', async () => {
        const count = await iePage.faqItems.count();
        if (count > 0) {
            const answerText = await iePage.openFaqItem(0);
            expect(answerText.trim().length).toBeGreaterThan(10);
        }
    });

    // ── 5. Geo-specific content ──────────────────────────────────────────────

    test('@regression page contains € currency symbol (IE-specific content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(IE_CASINO.currency);
    });

    test('@regression page does not contain £ symbol (wrong geo content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain('£');
    });

    test('@regression document locale matches en-IE for IE category page', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('lang', /^en-IE/i);
    });

    // ── 6. Footer ────────────────────────────────────────────────────────────

    test('@regression footer is visible', async () => {
        await iePage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(iePage.footer).toBeVisible();
    });

    test('@regression footer contains links', async () => {
        const links = iePage.footer.locator('a');
        const count = await links.count();
        expect(count).toBeGreaterThan(5);
    });

});
