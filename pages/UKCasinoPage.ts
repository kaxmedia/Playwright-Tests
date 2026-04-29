import { Page, Locator, expect } from '@playwright/test';

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
        // One nav link wraps two responsive logos — desktop viewport matches the second image
        this.logo = page.locator('img.global-nav-logo').nth(1);
        this.mainNav = page.locator('nav').first();

        // Geo switcher — covers dropdown and button variants
        this.geoSwitcher = page.locator('[class*="geo"], [class*="country"], [class*="region"], [data-testid*="geo"]').first();

        // Operator list — `.operator-item` rows + primary ranking CTAs (matches live oplist markup)
        const ukOfferCta = 'a[data-gtm_ctalocation="offer"][href*="/go/uk/"], a[data-gtm_ctalocation="offer"][href*="/go/ie/"]';
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
        this.compareModalSections = this.compareModal.locator(
            '[class*="collapsible-header"], dt, [class*="comparison"] button'
        );
        this.compareModalCloseBtn = this.compareModal.getByRole('button', { name: /close modal/i });

        // FAQ — UK page uses a long-form "What is an Online Casino?" block with h3 sub-questions (no .automation-faq)
        this.faqSection = page
            .locator('.body_content')
            .filter({ has: page.getByRole('heading', { name: 'What is an Online Casino?' }) })
            .first();
        this.faqItems = this.faqSection.getByRole('heading', { level: 3 });

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

    /** Clicks the nth expandable section inside the compare modal (0-indexed) */
    async expandModalSection(index: number): Promise<void> {
        const section = this.compareModalSections.nth(index);
        await section.scrollIntoViewIfNeeded();
        await section.click({ force: true });
        await this.page.waitForTimeout(500);
    }

    async openFaqItem(index: number): Promise<string> {
        const item = this.faqItems.nth(index);
        await item.scrollIntoViewIfNeeded();
        const tag = await item.evaluate((el) => el.tagName.toLowerCase());
        if (tag === 'dt') {
            await item.click();
            await this.page.waitForTimeout(400);
            return item.locator('xpath=following-sibling::dd[1]').innerText();
        }
        await item.click();
        await this.page.waitForTimeout(200);
        return item.evaluate((el: HTMLElement) => {
            const parts: string[] = [];
            let n = el.nextElementSibling;
            while (n && n.tagName !== 'H3' && n.tagName !== 'H2') {
                parts.push(n.textContent || '');
                n = n.nextElementSibling;
            }
            return parts.join('\n');
        });
    }
}