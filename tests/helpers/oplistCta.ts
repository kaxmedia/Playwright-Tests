import type { Locator, Page } from '@playwright/test';

/**
 * Primary operator-list CTA on comparison/oplist pages.
 * Prefer list-scoped anchors — bare `a[href*="/go/"]` often matches footer/editorial links
 * without ktag click attribution query params.
 */
export function oplistGoCta(page: Page): Locator {
  // Exclude logo/image links — only primary "Visit" CTAs carry full click attribution params.
  return page.locator(
    '[data-listid] a.operator-item__cta_link[href*="/go/"], ' +
      '[data-oplist] a.operator-item__cta_link[href*="/go/"], ' +
      'main .operator-list a.automation-visit-casino-cta[href*="/go/"]',
  ).first();
}
