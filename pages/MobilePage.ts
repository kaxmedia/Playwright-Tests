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

  private regionHandlerRegistered = false;

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
    await this.registerRegionPromptHandler();
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
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

  /**
   * Auto-dismiss the "visiting from Ireland" geo modal whenever it appears.
   * The modal renders on a variable delay, so a one-shot check after goto() races
   * it; addLocatorHandler runs before every action and dismisses it no matter when
   * it shows. Registered once per page (guarded), before the first navigation.
   */
  private async registerRegionPromptHandler() {
    if (this.regionHandlerRegistered) return;
    this.regionHandlerRegistered = true;
    const modal = this.page.locator('[aria-labelledby="region-prompt-modal-heading"]');
    await this.page.addLocatorHandler(
      modal,
      async () => {
        // The CookieYes bottom banner coexists with this modal and occludes its
        // "No Thanks" button (mutual z-index conflict between two interstitials).
        // Force-click the modal's own dismiss button to bypass the overlay — it is
        // the confirmed-correct control, so this clears the prompt without redirect.
        await modal.getByRole('button', { name: /no thanks/i }).click({ force: true });
      },
    );
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
