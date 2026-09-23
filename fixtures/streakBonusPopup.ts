import type { Page } from '@playwright/test';

const registeredPages = new WeakSet<Page>();

/** Resolve to true once the popup is gone; never throws. */
async function waitGone(overlay: ReturnType<Page['locator']>, timeout: number): Promise<boolean> {
    return overlay.waitFor({ state: 'hidden', timeout }).then(() => true).catch(() => false);
}

/**
 * Dismiss the "streak bonus" promotional popup. Its full-screen backdrop
 * (`#streak-bonus-popup-mount .fixed.inset-0`) sits above the nav and intercepts pointer
 * events on the profile avatar, blocking Sign Out / profile-dropdown tests indefinitely
 * until it clears on its own (first seen 2026-09-23, auth.spec.ts run #1349 -- "clicking Sign
 * Out logs the user out" and "returning user sees Welcome back" both timed out here).
 *
 * Hardened the same way as dismissRegionPromptModal (fixtures/regionPrompt.ts): try an
 * explicit close control within the popup mount, then Escape, then a direct click on the
 * backdrop itself (evaluate(), bypassing the very pointer-event interception it causes) --
 * and give up SILENTLY rather than hang. A lingering popup is retried on the next handler
 * pass, so no single stuck dismissal can stall the run.
 */
async function dismissStreakBonusPopup(
    mount: ReturnType<Page['locator']>,
    overlay: ReturnType<Page['locator']>
  ): Promise<void> {
    const page = mount.page();

  // 1) Explicit close control, if the popup renders one.
  const closeBtn = mount.locator('button[aria-label="Close" i], button:has-text("×"), [class*="close" i]').first();
    if (await closeBtn.isVisible().catch(() => false)) {
          await closeBtn.click({ timeout: 3_000 }).catch(() => {});
          if (await waitGone(overlay, 2_000)) return;
    }

  // 2) Escape key -- most dialogs close on Esc.
  await page.keyboard.press('Escape').catch(() => {});
    if (await waitGone(overlay, 1_500)) return;

  // 3) Direct DOM click on the backdrop itself, bypassing pointer-event interception --
  // the same technique dismissRegionPromptModal falls back to for a stuck modal.
  await overlay.evaluate((el) => (el as HTMLElement).click()).catch(() => {});
    await waitGone(overlay, 1_500);
    // Give up silently -- a lingering popup must never hang the whole test.
}


/**
 * Auto-dismiss the streak-bonus popup whenever it blocks an action, the same way
 * registerRegionPromptHandler handles the region prompt.
 */
export async function registerStreakBonusPopupHandler(page: Page): Promise<void> {
    if (registeredPages.has(page)) return;
    registeredPages.add(page);

  const mount = page.locator('#streak-bonus-popup-mount');
    const overlay = mount.locator('.fixed.inset-0');
    await page.addLocatorHandler(overlay, async () => { await dismissStreakBonusPopup(mount, overlay); }, { noWaitAfter: true });
}
