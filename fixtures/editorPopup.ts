import type { Locator, Page } from '@playwright/test';

const registeredPages = new WeakSet<Page>();

/** Editor campaigns (Adoric) render into this. The stylesheet <link class="__ADORIC__"> is not a popup. */
const POPUP = 'div.__ADORIC__, .__ADORIC_CAROUSEL__[data-adoric-type="popup"]';

const CLOSE =
  '.closeLightboxButton, .adoric-close-button button, .adoric-close-button, button[aria-label*="close" i]';

function popupLocator(page: Page): Locator {
  return page.locator(POPUP);
}

/** Resolve to true once the popup is gone; never throws. */
async function waitGone(popup: Locator, timeout: number): Promise<boolean> {
  return popup.waitFor({ state: 'hidden', timeout }).then(() => true).catch(() => false);
}

/**
 * Close an editor popup (the Adoric lightbox editors drop onto a page).
 * Try its close control, then Escape, then remove it. A leftover popup must not
 * sit on top of the page until the whole test hits its 60s limit.
 */
async function dismissEditorPopup(popup: Locator): Promise<void> {
  // Click and remove inside the page. A normal Playwright click on the close
  // control is itself blocked by this popup, and would call this handler again
  // until the test timed out.
  await popup.evaluateAll((nodes, closeSelector) => {
    for (const node of nodes) {
      node.querySelector<HTMLElement>(closeSelector)?.click();
      if (node.isConnected) node.remove();
    }
  }, CLOSE).catch(() => {});
  await waitGone(popup, 1_500);
}

/**
 * Dismiss the popup if it is already on screen. When `waitForAppearMs` is set, give a
 * late on-load campaign that long to show up first. Returns immediately when there is
 * no popup, so a normal page is not slowed down.
 */
export async function dismissEditorPopupIfVisible(page: Page, waitForAppearMs = 0): Promise<void> {
  const popup = popupLocator(page);
  const visible = waitForAppearMs > 0
    ? await popup.first().waitFor({ state: 'visible', timeout: waitForAppearMs }).then(() => true).catch(() => false)
    : await popup.first().isVisible().catch(() => false);

  if (!visible) return;
  await dismissEditorPopup(popup);
}

/**
 * Auto-dismiss an editor popup whenever it would block the next click.
 * Same idea as the region prompt and streak-bonus handlers.
 */
export async function registerEditorPopupHandler(page: Page): Promise<void> {
  if (registeredPages.has(page)) return;
  registeredPages.add(page);

  const popup = popupLocator(page);
  await page.addLocatorHandler(
    popup,
    async () => {
      await dismissEditorPopup(popup);
    },
    { noWaitAfter: true },
  );
}
