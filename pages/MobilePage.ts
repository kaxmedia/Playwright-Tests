import { type Locator, type Page } from '@playwright/test';
import { registerRegionPromptHandler } from '../fixtures/regionPrompt';
import { acceptCookiesIfShown as dismissCookies } from '../fixtures/acceptCookies';
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
  /** Logged-out burger CTA — `onclick="handleSignIn()"` (“Already have an account? Sign In”). */
  readonly menuSignInButton: Locator;
  readonly logoHomeLink: Locator;
  /** Mobile promo banner — desktop header Sign Up is often hidden on small viewports. */
  readonly registerNowButton: Locator;
  readonly visibleMainHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.menuToggle = page.locator('#js-toggle-menu');
    this.menuPanel = page.locator('#level-one.show-level-one');
    this.menuPopularLinks = page.locator('#mobile-nav-popular-pages a');
    this.menuLinks = page.locator('#level-one.show-level-one a[href^="/"]');
    this.menuSignInButton = this.menuPanel.getByRole('button', { name: /sign\s*in/i });
    this.logoHomeLink = globalNavLogoLink(page);
    this.registerNowButton = page.getByRole('button', { name: /register now/i }).first();
    this.visibleMainHeading = page.locator('h1:visible').first();
  }

  async goto(path = '/') {
    await registerRegionPromptHandler(this.page);
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  async acceptCookiesIfShown() {
    await dismissCookies(this.page);
  }

  async openMenu() {
    await this.menuToggle.click();
    await this.menuPanel.waitFor({ state: 'visible', timeout: 8000 });
  }

  async closeMenu() {
    await this.menuToggle.click();
    await this.menuPanel.waitFor({ state: 'hidden', timeout: 8000 });
  }

  /** Opens the burger panel and taps the Sign In control. */
  async openSignInFromMenu() {
    await this.openMenu();
    await this.menuSignInButton.tap();
  }
}
