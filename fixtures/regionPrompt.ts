import type { Page } from '@playwright/test';

const registeredPages = new WeakSet<Page>();

/**
 * Auto-dismiss the geo region prompt ("You're visiting from Ireland", etc.).
 * The modal appears on a variable delay after load, so a one-shot check after
 * goto() races it; addLocatorHandler runs before every action and dismisses it
 * whenever it blocks interaction.
 */
export async function registerRegionPromptHandler(page: Page): Promise<void> {
  if (registeredPages.has(page)) return;
  registeredPages.add(page);

  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  await page.addLocatorHandler(modal, async () => {
    // CookieYes can sit above the modal and steal clicks from "No Thanks".
    const acceptCookies = page.getByRole('button', { name: /accept all/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click({ force: true });
      await page.locator('.cky-consent-container').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
    }

    await modal.getByRole('button', { name: /no thanks/i }).click({ force: true });
    // Modal fades with opacity-0 before unmounting — wait until it is gone so
    // the handler does not re-fire on the closing animation.
    await modal.waitFor({ state: 'hidden', timeout: 10_000 });
  });
}

/**
 * One-shot dismiss for flows that need the prompt cleared before an action
 * (e.g. opening the sign-up modal on the global homepage).
 */
export async function dismissRegionPromptIfVisible(page: Page): Promise<void> {
  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  if (!(await modal.isVisible().catch(() => false))) return;

  const acceptCookies = page.getByRole('button', { name: /accept all/i });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click({ force: true });
    await page.locator('.cky-consent-container').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  }

  await modal.getByRole('button', { name: /no thanks/i }).click({ force: true });
  await modal.waitFor({ state: 'hidden', timeout: 10_000 });
}
