import { type Page } from '@playwright/test';

/**
 * Dismiss CookieYes if present. Safe no-op when the banner is absent or
 * suppressed (common in headless). Prefer this over copy-pasted Accept All clicks.
 *
 * CookieYes localises the accept button (e.g. DE "Alle akzeptieren", NO "Aksepter alt").
 *
 * :visible, not a bare `getByRole` match -- confirmed live 2026-11-26 (CI runs for
 * Age Verification ES, "footer opt-out" tests failing with
 * `page.waitForURL: Timeout 20000ms exceeded`, on gambling.com/es and
 * /es/juego-responsable): CookieYes renders TWO "Aceptar todo"-named buttons in the
 * DOM at once (`.cky-btn.cky-btn-accept` x2 -- one zero-size/hidden, one visible),
 * same hidden-duplicate pattern documented elsewhere in this suite (see
 * BetCreatorPage.ts). A bare `.click()` on 2 matches is a strict-mode violation,
 * which this function's try/catch silently swallowed as "banner absent" -- so the
 * banner was never actually dismissed, and it then sat over the page (CookieYes'
 * compact bar docks at the bottom of the viewport) and intercepted the real click
 * target once a test scrolled down to it, e.g. the footer opt-out checkbox,
 * leaving that click stuck retrying until the surrounding `waitForURL` timed out.
 * Filtering to the visible one fixes the click at the source.
 */
export async function acceptCookiesIfShown(page: Page, timeoutMs = 5000): Promise<void> {
  const accept = page
    .getByRole('button', {
      // NL CookieYes uses “Accepteer alles” (double-e); keep “accepter” for FR/BE variants.
      name: /accept all|accepteer alles|accepter alles|alle akzeptieren|aksepter alt|godta alle|aceptar todo|aceitar todos|accetta tutto/i,
    })
    .and(page.locator(':visible'));
  try {
    await accept.first().click({ timeout: timeoutMs });
    await page.locator('.cky-consent-container').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  } catch {
    // Banner absent or already dismissed
  }
}
