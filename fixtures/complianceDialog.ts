import { type Page } from '@playwright/test';

/**
 * Dismiss the ES "responsible gambling" compliance interstitial if present.
 * Safe no-op when absent.
 *
 * Confirmed live 2026-11-26 on gambling.com/es, in a fresh browser context
 * (no cookies/localStorage yet -- i.e. exactly a fresh CI run): a
 * full-viewport `div.es-cp` dialog (`role="dialog" aria-modal="true"`,
 * copy varies by campaign -- seen "La ludopatía es un riesgo del juego" and
 * "Las pérdidas del total de jugadores superan en 4 veces sus ganancias",
 * both pointing at www.juegoseguro.es) renders on top of the page shortly
 * after load. Its close control (`.es-cp__close`) starts out `disabled` and
 * becomes clickable after a short forced-dwell delay (~1-2s) -- `.click()`'s
 * normal actionability wait handles that without a manual sleep.
 *
 * It only ever showed once per browser context in manual testing (no
 * repeat on a later reload in the same session), which is exactly why it
 * fails CI deterministically (every fresh run hits it) without being
 * reproducible on demand in an already-warmed browser -- this is a
 * first-visit interstitial, not flakiness.
 *
 * While present it sits full-screen above everything and intercepts every
 * click underneath it. Root-caused as the actual cause of the two
 * remaining Age Verification ES footer-opt-out failures (PR #282 fixed a
 * separate CookieYes duplicate-button bug, which was real but not the only
 * blocker here) and the Quick Picker ES filter-pill-click failures
 * (`<div class="es-cp">...</div> intercepts pointer events` in the CI log).
 */
export async function dismissComplianceDialogIfShown(page: Page, timeoutMs = 6000): Promise<void> {
  const dialog = page.locator('.es-cp');
  try {
    if ((await dialog.count()) === 0) return;
    await dialog.locator('.es-cp__close').click({ timeout: timeoutMs });
    await dialog.waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
  } catch {
    // Dialog absent, already dismissed, or didn't behave as expected --
    // never block the test on this helper.
  }
}
