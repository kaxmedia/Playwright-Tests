import type { Page } from '@playwright/test';

const registeredPages = new WeakSet<Page>();

async function clearCookieBannerIfPresent(page: Page): Promise<void> {
  const acceptCookies = page.getByRole('button', { name: /accept all/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click({ force: true });
    await page.locator('.cky-consent-container').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }
}

/**
 * Accept the geo region prompt ("Show me IE offers", etc.).
 * CookieYes can occlude the CTA — force-click after clearing cookies when needed.
 */
async function acceptRegionPromptModal(page: Page, modal: ReturnType<Page['locator']>): Promise<void> {
  await clearCookieBannerIfPresent(page);

  const acceptGeo = modal.getByRole('button', { name: /show me .+ offers/i });
  await acceptGeo.click({ force: true });
  // Modal fades with opacity-0 before unmounting — wait until it is gone so
  // the handler does not re-fire on the closing animation.
  await modal.waitFor({ state: 'hidden', timeout: 10_000 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
}

/**
 * Auto-accept the geo region prompt whenever it blocks an action.
 * The modal appears on a variable delay after load, so a one-shot check after
 * goto() races it; addLocatorHandler runs before every action.
 */
export async function registerRegionPromptHandler(page: Page): Promise<void> {
  if (registeredPages.has(page)) return;
  registeredPages.add(page);

  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  await page.addLocatorHandler(modal, async () => {
    await acceptRegionPromptModal(page, modal);
  });
}

/**
 * One-shot accept for flows that need the prompt cleared before an action
 * (e.g. opening the sign-up modal on the global homepage).
 */
export async function acceptRegionPromptIfVisible(page: Page): Promise<void> {
  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  if (!(await modal.isVisible().catch(() => false))) return;
  await acceptRegionPromptModal(page, modal);
}
