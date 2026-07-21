import type { Page } from '@playwright/test';

const registeredPages = new WeakSet<Page>();

/**
 * Dismiss the geo region-switch prompt by choosing "No Thanks" — i.e. stay on the current
 * site. We deliberately do NOT click "Show me <XX> offers" (the switch-region CTA): that
 * navigates away to the geo experience, and its label is geo-specific (not stable across
 * CI vs local IPs). "No Thanks" is geo-invariant.
 *
 * We also do NOT touch the cookie banner here. The modal's "No Thanks" control is centred
 * and not occluded by the bottom cookie banner, and the previous behaviour (force-accepting
 * cookies to un-occlude the switch CTA) corrupted tests that assert on the banner — e.g.
 * cookie-banner.spec.ts saw the banner already dismissed.
 */
async function dismissRegionPromptModal(modal: ReturnType<Page['locator']>): Promise<void> {
  await modal.getByRole('button', { name: /no thanks/i }).click();
  // Modal fades with opacity-0 before unmounting — wait until it is gone so
  // the handler does not re-fire on the closing animation.
  await modal.waitFor({ state: 'hidden', timeout: 10_000 });
}

/**
 * Auto-dismiss the geo region prompt whenever it blocks an action.
 * The modal appears on a variable delay after load, so a one-shot check after
 * goto() races it; addLocatorHandler runs before every action.
 */
export async function registerRegionPromptHandler(page: Page): Promise<void> {
  if (registeredPages.has(page)) return;
  registeredPages.add(page);

  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  await page.addLocatorHandler(modal, async () => {
    await dismissRegionPromptModal(modal);
  });
}

/**
 * One-shot dismiss for flows that need the prompt cleared before an action
 * (e.g. opening the sign-up modal on the global homepage). The export name is kept for
 * existing callers (AuthPage); it now declines ("No Thanks") rather than switching region.
 */
export async function acceptRegionPromptIfVisible(page: Page): Promise<void> {
  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  if (!(await modal.isVisible().catch(() => false))) return;
  await dismissRegionPromptModal(modal);
}
