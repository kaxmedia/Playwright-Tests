import { Page, Locator } from '@playwright/test';
import { globalNavLogo } from './globalNavLogo';

export const IE_CASINO = {
    url: 'https://www.gambling.com/ie/online-casinos',
    geo: 'ie',
    currency: '€',
    language: 'en-IE',
};

export class IECasinoPage {
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
        this.logo = globalNavLogo(page);
        this.mainNav = page.locator('nav').first();
        this.geoSwitcher = page.locator('[class*="geo"], [class*="country"], [class*="region"], [data-testid*="geo"]').first();
        this.operatorList = page.locator('main .operator-list').first();
        this.operatorRows = page.locator('main .operator-list:not([data-disabled]) .operator-item');
        this.operatorLogos = this.operatorRows.locator('a[href*="/go/ie/"] > img');
        this.operatorRatings = this.operatorRows.locator('.operator-column-ranking-v2');
        this.operatorCTAs = this.operatorRows.locator('a[data-gtm*="gtm-operator-content"][href*="/go/ie/"]');
        this.anchorMenu = page.locator('#oplistNav');
        this.anchorLinks = page.locator('#oplistNav a[href^="#anchor_"]');
        this.faqSection = page.locator('.automation-faq-container').first();
        this.faqItems = this.faqSection.locator('dl dt');
        this.footer = page.locator('footer').first();
    }

    async goto(): Promise<void> {
        await this.page.goto(IE_CASINO.url);
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    }

    async getOperatorCount(): Promise<number> {
        return this.operatorRows.count();
    }

    async openFaqItem(index: number): Promise<string> {
        const item = this.faqItems.nth(index);
        await item.scrollIntoViewIfNeeded();
        await item.click();
        await this.page.waitForTimeout(500);
        const dd = this.faqSection.locator('dl dd').nth(index);
        return dd.innerText();
    }
}
