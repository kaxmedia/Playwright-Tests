import type { Page, Locator } from '@playwright/test';

/**
 * Gambling.com header logo in the primary nav.
 * Markup is an inline SVG with class `global-nav-logo` (formerly `<img class="global-nav-logo">`).
 */
export function globalNavLogo(page: Page): Locator {
  return page.locator('nav svg.global-nav-logo').first();
}

/** Home link wrapping the header logo (href is `/` or the geo root). */
export function globalNavLogoLink(page: Page): Locator {
  return page.locator('nav a:has(svg.global-nav-logo)').first();
}
