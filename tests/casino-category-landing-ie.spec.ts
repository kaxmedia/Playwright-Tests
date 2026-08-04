import { test, expect } from '../fixtures/test';
import { IECasinoPage, IE_CASINO } from '../pages/IECasinoPage';
import { registerCasinoLandingSmoke } from './helpers/casinoLandingSmoke';

registerCasinoLandingSmoke({
    describeTitle: 'Category Landing — IE Online Casinos',
    expectedUrl: IE_CASINO.url,
    goHrefContains: '/go/ie/',
    createPage: (page) => new IECasinoPage(page),
});

test.describe('Category Landing — IE Online Casinos — geo specifics', () => {
    let iePage: IECasinoPage;

    test.beforeEach(async ({ page }) => {
        iePage = new IECasinoPage(page);
        await iePage.goto();
    });

    test('@regression clicking an anchor link updates the operator list', async () => {
        const firstLink = iePage.anchorLinks.first();
        await firstLink.scrollIntoViewIfNeeded();
        await firstLink.click();
        await iePage.page.waitForTimeout(2000);

        const afterCount = await iePage.getOperatorCount();
        expect(afterCount).toBeGreaterThanOrEqual(1);
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

    test('@regression page contains € currency symbol (IE-specific content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(IE_CASINO.currency);
    });

    test('@regression page does not contain £ symbol (wrong geo content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        // A shared UK/ROI operator bonus disclaimer legitimately writes amounts in combined
        // "£/€" notation (e.g. "Min. cash wagering £/€10 … New UK/ROI gaming players") — one
        // operator's terms serve both markets. That is NOT wrong-geo content: every actual price
        // on the IE page uses € exclusively (live-verified 2026-08 on /ie/online-casinos). So flag
        // only a STANDALONE £ (a genuine GBP price/label) — strip the combined £/€ (and €/£) tokens
        // first, then assert no £ remains.
        const standalonePounds = (bodyText.replace(/£\s*\/\s*€|€\s*\/\s*£/g, '').match(/£/g) ?? []).length;
        expect(standalonePounds, 'IE page should show € only (no standalone £ outside a combined £/€ UK/ROI disclaimer)').toBe(0);
    });

    test('@regression document locale matches en-IE for IE category page', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('lang', /^en-IE/i);
    });

    test('@regression footer contains links', async () => {
        const links = iePage.footer.locator('a');
        const count = await links.count();
        expect(count).toBeGreaterThan(5);
    });
});
