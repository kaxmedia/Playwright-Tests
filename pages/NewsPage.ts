import { type Page, type Locator } from '@playwright/test';

export class NewsPage {
  readonly page: Page;

  // Header
  readonly logo: Locator;
  readonly mainNav: Locator;

  // News sections
  readonly newsSections: Locator;
  /** Listing cards (aligned with tests — article or card-like containers). */
  readonly articleCards: Locator;
  readonly contentCards: Locator;
  readonly seeMoreButtons: Locator;

  // Sidebar
  readonly createAccountCTA: Locator;
  /** Promo block containing the “free account” email capture (not always a single `<a>`). */
  readonly emailSignupPromo: Locator;

  // Footer
  readonly footer: Locator;
  readonly footerLinks: Locator;

  constructor(page: Page) {
    this.page = page;

    // Same class as HomePage — logo is not always a descendant of `<header>` on /news, so do not chain `header`.
    this.logo = page.locator('img.global-nav-logo').first();
    this.mainNav = page.locator('nav').first();

    // News sections — each category block (h2 heading + cards beneath)
    this.newsSections = page.locator('section, [class*="news-section"], [class*="category"]');
    this.articleCards = page.locator(
      'article, [class*="article-card"], [class*="post-card"], [class*="card"]'
    );
    this.contentCards = page.locator('article, [class*="card"]');
    // Hub links to vertical news listings (e.g. “All Casino News”, “All World Cup 2026 News”).
    this.seeMoreButtons = page.getByRole('link', { name: /^All .+ News$/ });

    // Sidebar CTA
    this.createAccountCTA = page.locator('text=Create a Free Account').first();
    this.emailSignupPromo = page.locator('.email-account-signup');

    // Footer
    this.footer = page.locator('footer');
    this.footerLinks = page.locator('footer a');
  }

  async goto() {
    await this.page.goto('/news'); // uses baseURL from playwright.config.ts
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getSectionHeadings(): Promise<string[]> {
    const headings = this.page.locator('h2, h3').filter({ hasNotText: '' });
    return headings.allInnerTexts();
  }

  async getArticleCount(): Promise<number> {
    return this.articleCards.count();
  }

  /** Primary link inside the first visible article/card (smoke navigation). */
  firstArticleCardLink(): Locator {
    return this.page.locator('article a, [class*="card"] a').first();
  }

  categorySectionHeading(sectionName: string): Locator {
    return this.page
      .locator('h2, h3')
      .filter({ hasText: new RegExp(sectionName, 'i') })
      .first();
  }

  /** Section labels shown in `<main>` (carousel headings are often CSS-hidden when inactive). */
  categoryLabelsInMain(): Locator {
    return this.page.getByRole('main');
  }

  listingCardImages(): Locator {
    return this.page.locator('article img, [class*="card"] img');
  }

  async clickFirstArticleInSection(sectionHeading: string): Promise<void> {
    const section = this.page.locator(`section, div`).filter({ hasText: sectionHeading }).first();
    const firstArticle = section.locator('article a, [class*="card"] a, h3 a').first();
    await firstArticle.click();
  }

  async clickSeeMore(sectionHeading: string): Promise<void> {
    const section = this.page.locator(`section, div`).filter({ hasText: sectionHeading }).first();
    const btn = section.locator('a:has-text("See more"), button:has-text("See more")').first();
    await btn.click();
  }
}
