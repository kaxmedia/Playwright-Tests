import { Page, Locator, expect } from '@playwright/test';
import { globalNavLogo } from './globalNavLogo';

export const UK_CASINO = {
    url: 'https://www.gambling.com/uk/online-casinos',
    geo: 'uk',
    currency: '£',
    language: 'en',
};

export class UKCasinoPage {
    readonly page: Page;

    // ── Page structure ──────────────────────────────────────────────────────────
    readonly pageTitle: Locator; // H1
    readonly logo: Locator;
    readonly mainNav: Locator;

    // ── Geo switcher ────────────────────────────────────────────────────────────
    readonly geoSwitcher: Locator;

    // ── Operator list ───────────────────────────────────────────────────────────
    readonly operatorList: Locator; // wrapper around all operator rows
    readonly operatorRows: Locator; // individual operator rows
    readonly operatorLogos: Locator;
    readonly operatorRatings: Locator;
    readonly operatorCTAs: Locator; // "Visit Site" / "Get Bonus" buttons

    // ── Anchor / filter menu ────────────────────────────────────────────────────
    readonly anchorMenu: Locator;
    readonly anchorLinks: Locator;

    // ── Compare functionality ───────────────────────────────────────────────────
    readonly compareCheckboxes: Locator;
    readonly compareBar: Locator; // sticky bar that appears when brands selected

    // ── Compare modal ───────────────────────────────────────────────────────────
    readonly compareButton: Locator; // "Compare" button inside the compare bar
    readonly compareModal: Locator; // the modal overlay itself
    readonly compareModalLogos: Locator; // operator logos inside the modal
    readonly compareModalCTAs: Locator; // CTA buttons inside the modal
    readonly compareModalSections: Locator; // expandable attribute sections inside the modal
    readonly compareModalCloseBtn: Locator; // close / dismiss button

    // ── FAQ ─────────────────────────────────────────────────────────────────────
    readonly faqSection: Locator;
    readonly faqItems: Locator;

    // ── Footer ──────────────────────────────────────────────────────────────────
    readonly footer: Locator;

    constructor(page: Page) {
        this.page = page;

        // Page structure — use the main nav home link (responsive logos toggle lg:hidden / lg:block)
        this.pageTitle = page.locator('h1').first();
        this.logo = globalNavLogo(page);
        this.mainNav = page.locator('nav').first();

        // Geo switcher — covers dropdown and button variants
        this.geoSwitcher = page.locator('[class*="geo"], [class*="country"], [class*="region"], [data-testid*="geo"]').first();

        // Operator list — `.operator-item` rows + primary ranking CTAs (matches live oplist markup)
        this.operatorList = page.locator('main .operator-list').first();
        this.operatorRows = page.locator('main .operator-list:not([data-disabled]) .operator-item');
        this.operatorLogos = this.operatorRows.locator('a[href*="/go/uk/"] > img, a[href*="/go/ie/"] > img');
        this.operatorRatings = this.operatorRows.locator('.operator-column-ranking-v2');
        // Primary product bonus line per row (avoids duplicate hidden tab-panel CTAs)
        this.operatorCTAs = this.operatorRows.locator(
            'a[data-gtm*="gtm-operator-content"][href*="/go/uk/"], a[data-gtm*="gtm-operator-content"][href*="/go/ie/"]'
        );

        // Sticky operator-list anchor strip (desktop #oplistNav, mobile #oplistNavMobile)
        // Desktop tests: use the md+ strip only — mobile #oplistNavMobile links are hidden and break .first()
        this.anchorLinks = page.locator('#oplistNav a[href^="#anchor_"]');
        this.anchorMenu = page.locator('#oplistNav');

        // Compare — oplist checkboxes; bar is the comparison-tool container (not *-compare-bar classes)
        this.compareCheckboxes = this.operatorRows.locator('input.oplist-compare-checkbox');
        // Sticky compare UI — list-specific containers; the primary ranking list’s footer becomes active after ticking rows
        this.compareBar = page
            .locator('[id^="comparison-tool-container"]')
            .filter({ has: page.getByRole('button', { name: /^Compare$/i }) })
            .last();
        this.compareButton = page.getByRole('button', { name: /^Compare$/i }).last();
        this.compareModal = page.locator('[id^="oplist-comparison-modal"]');
        this.compareModalLogos = this.compareModal
            .locator('img')
            .filter({ hasNot: page.locator('[class*="arrow"], [alt*="Arrow" i]') });
        this.compareModalCTAs = this.compareModal.locator('a[href*="/go/"]');
        // Accordion section toggles in the comparison modal (IDs/list IDs vary by deployment)
        this.compareModalSections = this.compareModal.locator('button[id^="category-header-"]');
        this.compareModalCloseBtn = this.compareModal.getByRole('button', { name: /close modal/i });

        // Editorial explainer block (formerly accordion FAQ — now static H2 + body copy)
        this.faqSection = page
            .locator('.content-block-component')
            .filter({ has: page.getByRole('heading', { name: 'What is an Online Casino?' }) })
            .first();
        this.faqItems = this.faqSection.locator('p');

        // Footer
        this.footer = page.locator('footer').first();
    }

    async goto(): Promise<void> {
        await this.page.goto(UK_CASINO.url);
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    }

    /** Returns the count of visible operator rows */
    async getOperatorCount(): Promise<number> {
        return this.operatorRows.count();
    }

    /** Clicks an anchor menu item by its visible text and waits for the list to update */
    async clickAnchorLink(linkText: string): Promise<void> {
        const link = this.anchorLinks.filter({ hasText: linkText }).first();
        await link.scrollIntoViewIfNeeded();
        await link.click();
        // Anchor clicks can be slow — wait for network to settle
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
            // networkidle can timeout on heavy pages — fall back to domcontentloaded
        });
        await this.page.waitForTimeout(1000);
    }

    /** Ticks the compare checkbox on the nth operator row (0-indexed) */
    async tickCompareCheckbox(index: number): Promise<void> {
        const cb = this.compareCheckboxes.nth(index);
        await cb.scrollIntoViewIfNeeded();
        await cb.check({ force: true });
    }

    /** Ticks 2 compare checkboxes and clicks the Compare button to open the modal */
    async openCompareModal(): Promise<void> {
        await this.tickCompareCheckbox(0);
        await this.tickCompareCheckbox(1);
        await this.page.waitForTimeout(800);
        await expect(this.compareButton).toBeVisible({ timeout: 15000 });
        await this.compareButton.click({ force: true });
        await expect(this.compareModal).toBeVisible({ timeout: 10000 });
    }

    /**
     * Clicks the modal header Close control via the DOM. Third-party promo layers sometimes
     * sit above the modal and intercept real pointer events; a direct element click still runs the handler.
     */
    async closeCompareModal(): Promise<void> {
        await this.compareModalCloseBtn.evaluate((el: HTMLElement) => el.click());
    }

    /** Clicks the nth expandable section inside the compare modal (0-indexed) */
    async expandModalSection(index: number): Promise<void> {
        const section = this.compareModalSections.nth(index);
        await section.scrollIntoViewIfNeeded();
        await section.click({ force: true });
        await this.page.waitForTimeout(500);
    }

    /** Returns body copy for the nth paragraph in the explainer block (no expand interaction). */
    async openFaqItem(index: number): Promise<string> {
        const item = this.faqItems.nth(index);
        await item.scrollIntoViewIfNeeded();
        return item.innerText();
    }
}