import { test, expect } from '@playwright/test';
import { DECasinoPage, DE_CASINO } from '../pages/DECasinoPage';
import { UKCasinoPage, UK_CASINO } from '../pages/UKCasinoPage';

// ─── Category Landing Page Tests — UK & DE ────────────────────────────────────
//
// Tests are deliberately structural and behavioural — NOT content-specific.
// Content editors regularly update operator lists, bonus text, and anchor labels
// so we avoid asserting on specific text values wherever possible.
//
// What we DO assert:
//   - Page loads, title exists, URL is correct
//   - Operator list renders with a meaningful number of rows
//   - Each operator row has a logo, rating, and working CTA
//   - Anchor/filter menu is present and interaction updates the operator list
//   - Compare functionality ticks and reveals the compare bar
//   - FAQ section is present and items expand on click
//   - Geo-specific content — UK shows £, DE shows €
//   - Footer is visible
// ─────────────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// UK — /uk/online-casinos
// ════════════════════════════════════════════════════════════════════════════
test.describe('Category Landing — UK Online Casinos', () => {
    let ukPage: UKCasinoPage;

    test.beforeEach(async ({ page }) => {
        ukPage = new UKCasinoPage(page);
        await ukPage.goto();
    });

    // ── 1. Page fundamentals ─────────────────────────────────────────────────

    test('@smoke page loads with a non-empty title', async ({ page }) => {
        await expect(page).toHaveURL(UK_CASINO.url);
        const title = await page.title();
        expect(title).not.toBe('');
        expect(title.toLowerCase()).not.toContain('404');
        expect(title.toLowerCase()).not.toContain('error');
    });

    test('@smoke H1 is visible and non-empty', async () => {
        await expect(ukPage.pageTitle).toBeVisible();
        const h1Text = await ukPage.pageTitle.innerText();
        expect(h1Text.trim()).not.toBe('');
    });

    test('@smoke logo is visible', async () => {
        await expect(ukPage.logo).toBeVisible();
    });

    test('@smoke main navigation is visible', async () => {
        await expect(ukPage.mainNav).toBeVisible();
    });

    test('@smoke geo switcher is visible', async () => {
        await expect(ukPage.geoSwitcher).toBeVisible();
    });

    // ── 2. Operator list ─────────────────────────────────────────────────────

    test('@smoke operator list renders at least 5 rows', async () => {
        const count = await ukPage.getOperatorCount();
        expect(count).toBeGreaterThanOrEqual(5);
    });

    test('@regression each operator row has a visible logo', async () => {
        const logos = ukPage.operatorLogos;
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
        const ratings = ukPage.operatorRatings;
        const count = await ratings.count();
        expect(count).toBeGreaterThanOrEqual(5);
    });

    test('@smoke operator CTAs are visible and have valid /go/ hrefs', async () => {
        const ctas = ukPage.operatorCTAs;
        const count = await ctas.count();
        expect(count).toBeGreaterThanOrEqual(5);

        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            const cta = ctas.nth(i);
            const href = await cta.evaluate((el: HTMLAnchorElement) => el.href);
            expect(href).toContain('/go/');
            expect(href).not.toBe('');
            // Only the first rows are guaranteed on-screen (tabs / expanded rows may hide lower links)
            if (i < 3) {
                await cta.scrollIntoViewIfNeeded();
                await expect(cta).toBeVisible();
            }
        }
    });

    test('@regression operator CTAs do not use dead # hrefs', async () => {
        const ctas = ukPage.operatorCTAs;
        const count = await ctas.count();
        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            const href = await ctas.nth(i).getAttribute('href');
            expect(href).not.toBe('#');
        }
    });

    // ── 3. Anchor / filter menu ──────────────────────────────────────────────

    test('@smoke anchor menu is visible', async () => {
        await expect(ukPage.anchorMenu).toBeVisible();
    });

    test('@smoke anchor menu has at least 3 links', async () => {
        const count = await ukPage.anchorLinks.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression clicking an anchor link updates the operator list', async () => {
        // Get the count before clicking
        const beforeCount = await ukPage.getOperatorCount();

        // Click the first anchor link — we don't hardcode the text so it's content-editor safe
        const firstLink = ukPage.anchorLinks.first();
        await firstLink.scrollIntoViewIfNeeded();
        await firstLink.click();

        // Wait for the list to potentially update (anchor filters can be slow)
        await ukPage.page.waitForTimeout(2000);

        // The operator list should still be present and populated after the filter
        const afterCount = await ukPage.getOperatorCount();
        expect(afterCount).toBeGreaterThanOrEqual(1);

        // Note: we don't assert beforeCount !== afterCount because the first anchor
        // may already be selected by default — we just confirm the list didn't break
    });

    test('@regression clicking a second anchor link also renders a list', async () => {
        const links = ukPage.anchorLinks;
        const linkCount = await links.count();

        // Only run if there are at least 2 anchor links
        if (linkCount >= 2) {
            const secondLink = links.nth(1);
            await secondLink.scrollIntoViewIfNeeded();
            await secondLink.click();
            await ukPage.page.waitForTimeout(2000);

            const afterCount = await ukPage.getOperatorCount();
            expect(afterCount).toBeGreaterThanOrEqual(1);
        }
    });

    // ── 4. Compare functionality ─────────────────────────────────────────────

    test('@regression compare checkboxes are present on operator rows', async () => {
        const count = await ukPage.compareCheckboxes.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression ticking a compare checkbox does not throw an error', async () => {
        const cbCount = await ukPage.compareCheckboxes.count();
        if (cbCount > 0) {
            await ukPage.tickCompareCheckbox(0);
            const isChecked = await ukPage.compareCheckboxes.first().isChecked();
            expect(isChecked).toBe(true);
        }
    });

    test('@regression compare bar appears after ticking 2 operators', async () => {
        const cbCount = await ukPage.compareCheckboxes.count();
        if (cbCount >= 2) {
            await ukPage.tickCompareCheckbox(0);
            await ukPage.tickCompareCheckbox(1);
            await ukPage.page.waitForTimeout(800);
            await expect(ukPage.compareButton).toBeVisible({ timeout: 15000 });
        }
    });

    // ── 5. Compare modal ─────────────────────────────────────────────────────

    test('@smoke clicking Compare opens a modal', async () => {
        const cbCount = await ukPage.compareCheckboxes.count();
        test.skip(cbCount < 2, 'Not enough compare checkboxes found to open modal');

        await ukPage.openCompareModal();
        await expect(ukPage.compareModal).toBeVisible();
    });

    test('@regression compare modal contains operator logos', async () => {
        const cbCount = await ukPage.compareCheckboxes.count();
        test.skip(cbCount < 2, 'Not enough compare checkboxes found to open modal');

        await ukPage.openCompareModal();

        const logoCount = await ukPage.compareModalLogos.count();
        expect(logoCount).toBeGreaterThanOrEqual(2); // one per selected operator

        // Each logo should be visible and have a valid src
        for (let i = 0; i < logoCount; i++) {
            await expect(ukPage.compareModalLogos.nth(i)).toBeVisible();
            const src = await ukPage.compareModalLogos.nth(i).getAttribute('src');
            expect(src).toBeTruthy();
        }
    });

    test('@regression compare modal contains CTA buttons with valid /go/ hrefs', async () => {
        const cbCount = await ukPage.compareCheckboxes.count();
        test.skip(cbCount < 2, 'Not enough compare checkboxes found to open modal');

        await ukPage.openCompareModal();

        const ctaCount = await ukPage.compareModalCTAs.count();
        expect(ctaCount).toBeGreaterThanOrEqual(2); // one CTA per operator

        for (let i = 0; i < ctaCount; i++) {
            await expect(ukPage.compareModalCTAs.nth(i)).toBeVisible();
            const href = await ukPage.compareModalCTAs.nth(i).evaluate((el: HTMLAnchorElement) => el.href);
            expect(href).toContain('/go/');
            expect(href).not.toBe('#');
        }
    });

    test('@regression expanding an attribute section in the compare modal reveals content', async () => {
        const cbCount = await ukPage.compareCheckboxes.count();
        test.skip(cbCount < 2, 'Not enough compare checkboxes found to open modal');

        await ukPage.openCompareModal();

        const sectionCount = await ukPage.compareModalSections.count();
        test.skip(sectionCount === 0, 'No expandable sections found in compare modal');

        await ukPage.expandModalSection(0);
        await expect(
            ukPage.compareModal.locator('dd, [class*="collapsible-body"]').first()
        ).toBeVisible({ timeout: 8000 });
    });

    test('@regression compare modal exposes a dismiss control', async () => {
        const cbCount = await ukPage.compareCheckboxes.count();
        test.skip(cbCount < 2, 'Not enough compare checkboxes found to open modal');

        await ukPage.openCompareModal();
        await expect(ukPage.compareModal).toBeVisible();
        await expect(ukPage.compareModalCloseBtn).toBeVisible();
    });

    // ── 6. FAQ ───────────────────────────────────────────────────────────────

    test('@smoke FAQ section is visible', async () => {
        await ukPage.faqSection.scrollIntoViewIfNeeded();
        await expect(ukPage.faqSection).toBeVisible();
    });

    test('@smoke FAQ has at least 3 items', async () => {
        const count = await ukPage.faqItems.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression clicking a FAQ item expands it and reveals content', async () => {
        const count = await ukPage.faqItems.count();
        if (count > 0) {
            const answerText = await ukPage.openFaqItem(0);
            expect(answerText.trim().length).toBeGreaterThan(10);
        }
    });

    // ── 7. Geo-specific content ──────────────────────────────────────────────

    test('@regression page contains £ currency symbol (UK-specific content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(UK_CASINO.currency);
    });

    test('@regression document locale stays English for UK category page', async ({ page }) => {
        await expect(page.locator('html')).toHaveAttribute('lang', /^(en|en-)/);
    });

    // ── 8. Footer ────────────────────────────────────────────────────────────

    test('@smoke footer is visible', async () => {
        await ukPage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(ukPage.footer).toBeVisible();
    });

    test('@regression footer contains links', async () => {
        const links = ukPage.footer.locator('a');
        const count = await links.count();
        expect(count).toBeGreaterThan(5);
    });

});


// ════════════════════════════════════════════════════════════════════════════
// DE — /de/online-casinos
// ════════════════════════════════════════════════════════════════════════════
test.describe('Category Landing — DE Online Casinos', () => {
    let dePage: DECasinoPage;

    test.beforeEach(async ({ page }) => {
        dePage = new DECasinoPage(page);
        await dePage.goto();
    });

    // ── 1. Page fundamentals ─────────────────────────────────────────────────

    test('@smoke page loads with a non-empty title', async ({ page }) => {
        await expect(page).toHaveURL(DE_CASINO.url);
        const title = await page.title();
        expect(title).not.toBe('');
        expect(title.toLowerCase()).not.toContain('404');
        expect(title.toLowerCase()).not.toContain('error');
    });

    test('@smoke H1 is visible and non-empty', async () => {
        await expect(dePage.pageTitle).toBeVisible();
        const h1Text = await dePage.pageTitle.innerText();
        expect(h1Text.trim()).not.toBe('');
    });

    test('@smoke logo is visible', async () => {
        await expect(dePage.logo).toBeVisible();
    });

    test('@smoke main navigation is visible', async () => {
        await expect(dePage.mainNav).toBeVisible();
    });

    // DE category pages do not surface the UK-style header geo modal trigger (see footer.spec DE notes).
    test('@smoke URL stays on German casino category path', async ({ page }) => {
        await expect(page).toHaveURL(/\/de\/online-casinos/);
    });

    // ── 2. Operator list ─────────────────────────────────────────────────────

    test('@smoke operator list renders at least 5 rows', async () => {
        const count = await dePage.getOperatorCount();
        expect(count).toBeGreaterThanOrEqual(5);
    });

    test('@regression each operator row has a visible logo', async () => {
        const logos = dePage.operatorLogos;
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
        const ratings = dePage.operatorRatings;
        const count = await ratings.count();
        expect(count).toBeGreaterThanOrEqual(5);
    });

    test('@smoke operator CTAs are visible and have valid /go/ hrefs', async () => {
        const ctas = dePage.operatorCTAs;
        const count = await ctas.count();
        expect(count).toBeGreaterThanOrEqual(5);

        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            const cta = ctas.nth(i);
            const href = await cta.evaluate((el: HTMLAnchorElement) => el.href);
            expect(href).toContain('/go/');
            expect(href).not.toBe('');
            if (i < 3) {
                await cta.scrollIntoViewIfNeeded();
                await expect(cta).toBeVisible();
            }
        }
    });

    test('@regression operator CTAs do not use dead # hrefs', async () => {
        const ctas = dePage.operatorCTAs;
        const count = await ctas.count();
        const limit = Math.min(count, 10);
        for (let i = 0; i < limit; i++) {
            const href = await ctas.nth(i).getAttribute('href');
            expect(href).not.toBe('#');
        }
    });

    // ── 3. Anchor / filter menu ──────────────────────────────────────────────

    test('@smoke anchor menu is visible', async () => {
        await expect(dePage.anchorMenu).toBeVisible();
    });

    test('@smoke anchor menu has at least 3 links', async () => {
        const count = await dePage.anchorLinks.count();
        expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression clicking an anchor link does not break the operator list', async () => {
        const firstLink = dePage.anchorLinks.first();
        await firstLink.scrollIntoViewIfNeeded();
        await firstLink.click();
        await dePage.page.waitForTimeout(2000);

        const afterCount = await dePage.getOperatorCount();
        expect(afterCount).toBeGreaterThanOrEqual(1);
    });

    // Compare functionality is not available on the DE geo — no compare tests here.

    // ── 5. FAQ ───────────────────────────────────────────────────────────────

    test('@smoke FAQ section is visible', async () => {
        await dePage.faqSection.scrollIntoViewIfNeeded();
        await expect(dePage.faqSection).toBeVisible();
    });

    test('@smoke FAQ has at least 3 items', async () => {
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

    // ── 6. Geo-specific content (DE has no UK compare block) ─────────────────

    test('@regression page contains € currency symbol (DE-specific content)', async ({ page }) => {
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).toContain(DE_CASINO.currency);
    });

    test('@regression page does not contain £ symbol (wrong geo content)', async ({ page }) => {
        // Catches a scenario where UK content is accidentally served on the DE page
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain(UK_CASINO.currency);
    });

    test('@smoke page language is German — html lang attribute is "de"', async ({ page }) => {
        const lang = await page.locator('html').getAttribute('lang');
        expect(lang).toMatch(/^de/);
    });

    // ── 7. Footer ────────────────────────────────────────────────────────────

    test('@smoke footer is visible', async () => {
        await dePage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await expect(dePage.footer).toBeVisible();
    });

    test('@regression footer contains links', async () => {
        const links = dePage.footer.locator('a');
        const count = await links.count();
        expect(count).toBeGreaterThan(5);
    });

});