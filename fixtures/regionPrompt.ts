import type { Page } from '@playwright/test';

const registeredPages = new WeakSet<Page>();

/** Resolve to true once the modal is gone; never throws. */
async function waitGone(modal: ReturnType<Page['locator']>, timeout: number): Promise<boolean> {
  return modal.waitFor({ state: 'hidden', timeout }).then(() => true).catch(() => false);
}

/**
 * Dismiss the geo region-switch prompt by declining ("No Thanks") — i.e. stay on the
 * current site. We deliberately do NOT click "Show me <XX> offers" (the switch-region CTA):
 * that navigates away to a geo-specific experience whose label isn't stable across CI/local IPs.
 *
 * Hardened against a modal that doesn't unmount cleanly (seen on WebKit, where the fade-out
 * left the dialog attached and the old click→waitForHidden(10s) looped until the whole test
 * timed out): try the decline button, then Escape, then a backdrop click — each with a short
 * wait — and give up SILENTLY rather than hang. A lingering modal is retried on the next
 * handler pass, so no single stuck dismissal can stall the run.
 */
async function dismissRegionPromptModal(modal: ReturnType<Page['locator']>): Promise<void> {
  const page = modal.page();

  // 1) Explicit decline button.
  const noThanks = modal.getByRole('button', { name: /no thanks/i });
  if (await noThanks.isVisible().catch(() => false)) {
    await noThanks.click({ timeout: 3_000 }).catch(() => {});
    if (await waitGone(modal, 2_000)) return;
  }

  // 2) Escape key — most dialogs close on Esc.
  await page.keyboard.press('Escape').catch(() => {});
  if (await waitGone(modal, 1_500)) return;

  // 3) Backdrop click at the top-left corner, outside the centred dialog.
  await page.mouse.click(5, 5).catch(() => {});
  await waitGone(modal, 1_500);
  // Give up silently — a lingering modal must never hang the whole test.
}

/**
 * Auto-dismiss the geo region prompt whenever it blocks an action.
 * The modal appears on a variable delay after load, so a one-shot check after
 * goto() races it; addLocatorHandler runs before every action.
 *
 * `noWaitAfter: true` — WE decide when the modal is gone (see dismissRegionPromptModal).
 * Without it, Playwright re-asserts the overlay is hidden after the handler and would itself
 * loop/hang if a WebKit modal lingers past its fade-out.
 */
export async function registerRegionPromptHandler(page: Page): Promise<void> {
  if (registeredPages.has(page)) return;
  registeredPages.add(page);

  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  await page.addLocatorHandler(
    modal,
    async () => {
      await dismissRegionPromptModal(modal);
    },
    { noWaitAfter: true }
  );
}

/**
 * One-shot dismiss for flows that need the prompt cleared before an action
 * (e.g. opening the sign-up modal on the global homepage). The export name is kept for
 * existing callers (AuthPage); it declines ("No Thanks") rather than switching region.
 */
export async function acceptRegionPromptIfVisible(page: Page): Promise<void> {
  const modal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
  if (!(await modal.isVisible().catch(() => false))) return;
  await dismissRegionPromptModal(modal);
}
