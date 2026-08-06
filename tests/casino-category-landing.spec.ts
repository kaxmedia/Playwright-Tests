import { test, expect } from '../fixtures/test';
import { DECasinoPage, DE_CASINO } from '../pages/DECasinoPage';
import { UKCasinoPage, UK_CASINO } from '../pages/UKCasinoPage';
import { registerCasinoLandingSmoke, type CasinoLandingPageLike } from './helpers/casinoLandingSmoke';

// ─── Category Landing Page Tests — UK & DE ────────────────────────────────────
//
// Shared fundamentals, oplist, anchor, FAQ, and footer smoke live in
// registerCasinoLandingSmoke. Geo-specific behaviour (currency, compare, DE quirks)
// stays in the "geo specifics" describe blocks below.
// ─────────────────────────────────────────────────────────────────────────────

registerCasinoLandingSmoke({
    describeTitle: 'Category Landing — UK Online Casinos',
    expectedUrl: UK_CASINO.url,
    goHrefContains: '/go/',
    createPage: (page) => new UKCasinoPage(page),
});

test.describe('Category Landing — UK Online Casinos — geo specifics', () => {
    let ukPage: UKCasinoPage;

    test.beforeEach(async ({ page }) => {
        ukPage = new UKCasinoPage(page);
        await ukPage.goto();
    });

    test('@regression primary row CTAs are visible (one per operator row)', async () => {
        const rowLimit = Math.min(await ukPage.operatorRows.count(), 3);
        for (let r = 0; r < rowLimit; r++) {
            const rowCta = ukPage.operatorRows.nth(r).locator(
                '.operator-main a.operator-item__cta_link[href*="/go/uk/"], .operator-main a.operator-item__cta_link[href*="/go/ie/"]'
            ).first();
            await rowCta.evaluate((el: HTMLElement) => el.scrollIntoView({ block: 'center' }));
            await expect(rowCta).toBeVisible({ timeout: 8000 });
        }
    });

    test('@regression clicking an anchor link updates the operator list', async () => {
        await ukPage.getOperatorCount();

        const firstLink = ukPage.anchorLinks.first();
        await firstLink.scrollIntoViewIfNeeded();
        await firstLink.click();
        await ukPage.page.waitForTimeout(2000);

        const afterCount = await ukPage.getOperatorCount();
        expect(afterCount).toBeGreaterThanOrEqual(1);
    });

    test('@regression clicking a second anchor link also renders a list', async () => {
        const links = ukPage.anchorLinks;
        const linkCount = await links.count();

        if (linkCount >= 2) {
            const secondLink = links.nth(1);
            await secondLink.scrollIntoViewIfNeeded();
            await secondLink.click();
            await ukPage.page.waitForTimeout(2000);

            const afterCount = await ukPage.getOperatorCount();
            expect(afterCount).toBeGreaterThanOrEqual(1);
        }
    });

    test('@regression compare checkboxes are present on operator rows', async () => {
        const count = await ukPage.compareCheckboxes.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression ticking a compare checkbox does not throw an error', async () => {
        await ukPage.goto();
        const cbCount = await ukPage.compareCheckboxes.count();
        if (cbCount > 0) {
            await ukPage.tickCompareCheckbox(0);
            const isChecked = await ukPage.compareCheckboxes.first().isChecked();
            expect(isChecked).toBe(true);
        }
    });

    test('@regression compare bar appears after ticking 2 operators', async () => {
        await ukPage.goto();
        const cbCount = await ukPage.compareCheckboxes.count();
        if (cbCount >= 2) {
            await ukPage.tickCompareCheckbox(0);
            await ukPage.tickCompareCheckbox(1);
            await ukPage.page.waitForTimeout(800);
            await expect(ukPage.compareButton).toBeVisible({ timeout: 15000 });
        }
    });

    test('@regression clicking Compare opens a modal', async () => {
        await ukPage.goto();
        const cbCount = await ukPage.compareCheckboxes.count();
        expect(
            cbCount,
            'UK online casinos category page must expose at least two compare checkboxes'
        ).toBeGreaterThanOrEqual(2);

        await ukPage.openCompareModal();
        await expect(ukPage.compareModal).toBeVisible();
    });

    test('@regression compare modal contains operator logos', async () => {
        await ukPage.goto();
        const cbCount = await ukPage.compareCheckboxes.count();
        expect(
            cbCount,
            'UK online casinos category page must expose at least two compare checkboxes'
        ).toBeGreaterThanOrEqual(2);

        await ukPage.openCompareModal();

        const logoCount = await ukPage.compareModalLogos.count();
        expect(logoCount).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < logoCount; i++) {
            await expect(ukPage.compareModalLogos.nth(i)).toBeVisible();
            const src = await ukPage.compareModalLogos.nth(i).getAttribute('src');
            expect(src).toBeTruthy();
        }
    });

    test('@regression compare modal contains CTA buttons with valid /go/ hrefs', async () => {
        await ukPage.goto();
        const cbCount = await ukPage.compareCheckboxes.count();
        expect(
            cbCount,
            'UK online casinos category page must expose at least two compare checkboxes'
        ).toBeGreaterThanOrEqual(2);

        await ukPage.openCompareModal();

        const ctaCount = await ukPage.compareModalCTAs.count();
        expect(ctaCount).toBeGreaterThanOrEqual(2);

        for (let i = 0; i < ctaCount; i++) {
            await expect(ukPage.compareModalCTAs.nth(i)).toBeVisible();
            const href = await ukPage.compareModalCTAs.nth(i).evaluate((el: HTMLAnchorElement) => el.href);
            expect(href).toContain('/go/');
            expect(href).not.toBe('#');
        }
    });

    test('@regression expanding an attribute section in the compare modal reveals content', async () => {
        await ukPage.goto();
        const cbCount = await ukPage.compareCheckboxes.count();
        expect(
            cbCount,
            'UK online casinos category page must expose at least two compare checkboxes'
        ).toBeGreaterThanOrEqual(2);

        await ukPage.openCompareModal();

        const sectionCount = await ukPage.compareModalSections.count();
        expect(sectionCount, 'Compare modal must include at least one expandable attribute section').toBeGreaterThan(0);

        const bonusGridLabel = ukPage.compareModal.getByText(/Minimum Deposit to Qualify/i);
        await expect(bonusGridLabel).toBeVisible();

        await ukPage.expandModalSection(0);
        await expect(bonusGridLabel).toBeHidden({ timeout: 8000 });

        await ukPage.expandModalSection(0);
        await expect(bonusGridLabel).toBeVisible({ timeout: 8000 });
    });

    test('@regression compare modal exposes a dismiss control', async () => {
        await ukPage.goto();
        const cbCount = await ukPage.compareCheckboxes.count();
        expect(
            cbCount,
            'UK online casinos category page must expose at least two compare checkboxes'
        ).toBeGreaterThanOrEqual(2);

        await ukPage.openCompareModal();
        await expect(ukPage.compareModal).toBeVisible();
        await expect(ukPage.compareModalCloseBtn).toBeVisible();

        await ukPage.closeCompareModal();
        await expect(ukPage.compareModal).toHaveAttribute('aria-hidden', 'true', { timeout: 15000 });
        await expect(ukPage.compareModal).toBeHidden();
    });

    test('@regression explainer block has substantive body copy', async () => {
        const count = await ukPage.faqItems.count();
        expect(count).toBeGreaterThanOrEqual(1);
        const bodyText = await ukPage.openFaqItem(0);
        expect(bodyText.trim().length).toBeGreaterThan(50);
    });

    test('@regression What is an Online Casino section is visible with content', async () => {
        await ukPage.faqSection.scrollIntoViewIfNeeded();
        await expect(ukPage.faqSection.getByRole('heading', { name: 'What is an Online Casino?' })).toBeVisible();
        const answerText = await ukPage.openFaqItem(0);
        expect(answerText.trim().length).toBeGreaterThan(10);
    });

    test('@regression page contains £ currency symbol (UK-specific content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(UK_CASINO.currency);
    });

    test('@regression document locale stays English for UK category page', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('lang', /^(en|en-)/);
    });

    test('@regression footer contains links', async () => {
        const links = ukPage.footer.locator('a');
        const count = await links.count();
        expect(count).toBeGreaterThan(5);
    });
});

registerCasinoLandingSmoke({
    describeTitle: 'Category Landing — DE Online Casinos',
    expectedUrl: DE_CASINO.url,
    goHrefContains: '/go/de/',
    hasRatings: false,
    hasGeoSwitcher: false,
    createPage: (page): CasinoLandingPageLike =>
        Object.assign(new DECasinoPage(page), {
            geoSwitcher: page
                .locator('[class*="geo"], [class*="country"], [class*="region"], [data-testid*="geo"]')
                .first(),
        }),
});

test.describe('Category Landing — DE Online Casinos — geo specifics', () => {
    let dePage: DECasinoPage;

    test.beforeEach(async ({ page }) => {
        dePage = new DECasinoPage(page);
        await dePage.goto();
    });

    test('@regression header geo switcher is not present in nav (DE has no UK-style geo control)', async ({
        page,
    }) => {
        const headerGeo = page
            .locator('nav')
            .locator('[class*="geo"], [class*="country"], [class*="region"], [data-testid*="geo"]');
        await expect(headerGeo).toHaveCount(0);
    });

    test('@regression clicking an anchor link does not break the operator list', async () => {
        const firstLink = dePage.anchorLinks.first();
        await firstLink.scrollIntoViewIfNeeded();
        await firstLink.click();
        await dePage.page.waitForTimeout(2000);

        const afterCount = await dePage.getOperatorCount();
        expect(afterCount).toBeGreaterThanOrEqual(1);
    });

    test('@regression FAQ has at least 3 items', async () => {
        const count = await dePage.faqItems.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression clicking a FAQ item expands it and reveals content', async () => {
        const count = await dePage.faqItems.count();
        if (count > 0) {
            const answerText = await dePage.openFaqItem(0);
            expect(answerText.trim().length).toBeGreaterThan(10);
        }
    });

    test('@regression page contains € currency symbol (DE-specific content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(DE_CASINO.currency);
    });

    test('@regression page does not contain £ symbol (wrong geo content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain(UK_CASINO.currency);
    });

    test('@regression page language is German — html lang attribute is "de"', async ({ page }) => {
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toMatch(/^de/);
    });

    test('@regression footer contains links', async () => {
        const links = dePage.footer.locator('a');
        const count = await links.count();
        expect(count).toBeGreaterThan(5);
    });
});
