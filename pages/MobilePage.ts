import { type Locator, type Page } from '@playwright/test';
import { globalNavLogoLink } from './globalNavLogo';

/**
 * Mobile header / nav for gambling.com global layout.
 * Verified on iPhone 15 Pro viewport (393×852): `#js-toggle-menu` toggles `#level-one` panel.
 */
export class MobilePage {
  readonly page: Page;

  readonly menuToggle: Locator;
  readonly menuPanel: Locator;
  readonly menuPopularLinks: Locator;
  /** In-panel nav links once `#level-one` is open (excludes external URLs). */
  readonly menuLinks: Locator;
  readonly logoHomeLink: Locator;
  /** Mobile promo banner — desktop nav Sign Up / #login-button are hidden on small viewports. */
  readonly registerNowButton: Locator;
  readonly visibleMainHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menuToggle = page.locator('#js-toggle-menu');
    this.menuPanel = page.locator('#level-one.show-level-one');
    this.menuPopularLinks = page.locator('#mobile-nav-popular-pages a');
    this.menuLinks = page.locator('#level-one a[href^="/"]');
    this.logoHomeLink = globalNavLogoLink(page);
    this.registerNowButton = page.getByRole('button', { name: /register now/i }).first();
    this.visibleMainHeading = page.locator('h1:visible').first();
  }

  async goto(path = '/') {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.dismissRegionPromptIfShown();
  }

  /** CookieYes banner — same selectors as fixtures/cookieBanner.ts */
  async acceptCookiesIfShown() {
    const accept = this.page.getByRole('button', { name: /accept all/i });
    try {
      await accept.click({ timeout: 5000 });
      await this.page.locator('.cky-consent-container').waitFor({ state: 'hidden', timeout: 8000 });
    } catch {
      // Banner absent or already dismissed
    }
  }

  async dismissRegionPromptIfShown() {
    try {
      const modal = this.page.locator('[aria-labelledby="region-prompt-modal-heading"]');
      if (await modal.isVisible({ timeout: 4000 }).catch(() => false)) {
        await modal.getByRole('button', { name: /no thanks/i }).click({ timeout: 3000 });
        await modal.waitFor({ state: 'hidden', timeout: 5000 });
      }
    } catch { /* prompt absent on CI / non-IE geo */ }
  }

  async openMenu() {
    await this.menuToggle.click();
    await this.menuPanel.waitFor({ state: 'visible', timeout: 8000 });
  }

  async closeMenu() {
    await this.menuToggle.click();
    await this.menuPanel.waitFor({ state: 'hidden', timeout: 8000 });
  }
}
