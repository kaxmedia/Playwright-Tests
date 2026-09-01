import type { Page, Locator } from '@playwright/test';

/**
 * Gambling.com header logo in the primary nav.
 *
 * Post-rebrand (Aug 2026): `<img alt="Gambling.com">` inside
 * `a.refresh-nav__logo` (geo) or `a.global-home-nav__logo` (global home).
 * Older markup used `svg.global-nav-logo` / `img.global-nav-logo` — kept as fallback.
 */
export function globalNavLogo(page: Page): Locator {
  return page
    .locator(
      [
        'nav a.refresh-nav__logo img',
        'nav a.global-home-nav__logo img',
        'nav img[alt="Gambling.com"]',
        'nav svg.global-nav-logo',
        'nav img.global-nav-logo',
      ].join(', '),
    )
    .first();
}

/** Home link wrapping the header logo (href is `/` or the geo root). */
export function globalNavLogoLink(page: Page): Locator {
  return page
    .locator(
      [
        'nav a.refresh-nav__logo',
        'nav a.global-home-nav__logo',
        'nav a:has(img[alt="Gambling.com"])',
        'nav a:has(svg.global-nav-logo)',
        'nav a:has(img.global-nav-logo)',
      ].join(', '),
    )
    .first();
}
