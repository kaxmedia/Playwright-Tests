import { Page, Locator } from '@playwright/test';

export const DE_CASINO = {
    url: 'https://www.gambling.com/de/online-casinos',
    geo: 'de',
    currency: '€',
    language: 'de',
};

/**
 * German online-casinos category landing — structural locators shared with UK where possible.
 * Compare UI is not covered here (UK-only in the suite).
 */
export class DECasinoPage {
    readonly page: Page;

    readonly pageTitle: Locator;
    readonly logo: Locator;
    readonly mainNav: Locator;

    readonly geoSwitcher: Locator;

    readonly operatorList: Locator;
    readonly operatorRows: Locator;
    readonly operatorLogos: Locator;
    readonly operatorRatings: Locator;
    readonly operatorCTAs: Locator;

    readonly anchorMenu: Locator;
    readonly anchorLinks: Locator;

    readonly faqSection: Locator;
    readonly faqItems: Locator;

    readonly footer: Locator;

    constructor(page: Page) {
        this.page = page;

        this.pageTitle = page.locator('h1').first();
        this.logo = page.locator('img.global-nav-logo').nth(1);
        this.mainNav = page.locator('nav').first();

        this.geoSwitcher = page.locator('[class*="geo"], [class*="country"], [class*="region"], [data-testid*="geo"]').first();

        const deOfferCta = 'a[data-gtm_ctalocation="offer"][href*="/go/de/"]';
        this.operatorList = page.locator('main .operator-list').first();
        this.operatorRows = page.locator('main .operator-list:not([data-disabled]) .operator-item');
        this.operatorLogos = this.operatorRows.locator('a[href*="/go/de/"] > img');
        this.operatorRatings = this.operatorRows.locator('.operator-column-ranking-v2');
        this.operatorCTAs = this.operatorRows.locator(`a[data-gtm*="gtm-operator-content"][href*="/go/de/"]`);

        // DE uses short fragment ids (#casino, #Top_5_Casinos, …), not the UK #anchor_* scheme
        this.anchorLinks = page.locator('#oplistNav a[href^="#"]');
        this.anchorMenu = page.locator('#oplistNav');

        this.faqSection = page.locator('.automation-faq-container');
        this.faqItems = page.locator('.automation-faq-container dt');

        this.footer = page.locator('footer').first();
    }

    async goto(): Promise<void> {
        await this.page.goto(DE_CASINO.url);
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    }

    async getOperatorCount(): Promise<number> {
        return this.operatorRows.count();
    }

    async clickAnchorLink(linkText: string): Promise<void> {
        const link = this.anchorLinks.filter({ hasText: linkText }).first();
        await link.scrollIntoViewIfNeeded();
        await link.click();
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await this.page.waitForTimeout(1000);
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
