import { type Locator, type Page } from '@playwright/test';
import { registerRegionPromptHandler } from '../fixtures/regionPrompt';
import { acceptCookiesIfShown as dismissCookies } from '../fixtures/acceptCookies';
import { globalNavLogoLink } from './globalNavLogo';

/**
 * Mobile header / nav for gambling.com.
 *
 * Post–Sep 2026 sprint the burger is a `<details data-mnav-drawer>` with
 * `summary.mnav-toggle` (aria-label "Open main menu"). Legacy `#js-toggle-menu` /
 * `#level-one` markup is kept as a fallback for any geo that still serves it.
 */
export class MobilePage {
  readonly page: Page;

  readonly menuToggle: Locator;
  readonly menuPanel: Locator;
  readonly menuPopularLinks: Locator;
  /** In-panel nav links once the drawer is open (excludes external URLs). */
  readonly menuLinks: Locator;
  /**
   * Logged-out auth CTA inside the open drawer.
   * Sprint rebrand dropped the in-drawer “Sign In” control — entry is now
   * “Sign Up — it's free” (`data-nav-auth-cta`); Sign In lives inside the modal.
   */
  readonly menuSignInButton: Locator;
  readonly logoHomeLink: Locator;
  /** Primary signup CTA — “Sign Up — it's free” (replaces legacy “Register now”). */
  readonly registerNowButton: Locator;
  readonly visibleMainHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.menuToggle = page
      .locator('summary.mnav-toggle, summary[aria-label*="Open main menu" i]')
      .or(page.locator('#js-toggle-menu'))
      .first();

    this.menuPanel = page
      .locator('details[data-mnav-drawer][open]')
      .or(page.locator('#level-one.show-level-one'))
      .first();

    // Prefer visible in-drawer links (nested accordion items stay hidden until expanded).
    // Fall back to legacy popular-pages strip.
    this.menuPopularLinks = page
      .locator('details[data-mnav-drawer][open] a[href^="/"]')
      .locator('visible=true')
      .or(page.locator('#mobile-nav-popular-pages a').locator('visible=true'));

    this.menuLinks = page
      .locator('details[data-mnav-drawer][open] a[href^="/"]')
      .locator('visible=true')
      .or(page.locator('#level-one.show-level-one a[href^="/"]').locator('visible=true'));

    this.menuSignInButton = this.menuPanel
      .locator('button[data-nav-auth-cta]')
      .or(this.menuPanel.getByRole('button', { name: /sign up|sign\s*in|register now/i }))
      .first();

    this.logoHomeLink = globalNavLogoLink(page);

    this.registerNowButton = page
      .getByRole('button', { name: /sign up\s*[—–-].*free|register now|sign up/i })
      .locator('visible=true')
      .first();

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
    if (await this.menuPanel.isVisible().catch(() => false)) return;
    await this.menuToggle.click();
    await this.menuPanel.waitFor({ state: 'visible', timeout: 8000 });
  }

  async closeMenu() {
    if (!(await this.menuPanel.isVisible().catch(() => false))) return;
    await this.menuToggle.click();
    await this.menuPanel.waitFor({ state: 'hidden', timeout: 8000 });
  }

  /** Opens the burger panel and taps the auth CTA (Sign Up / legacy Sign In). */
  async openSignInFromMenu() {
    await this.openMenu();
    await this.menuSignInButton.tap();
  }
}
