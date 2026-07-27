import { type Page } from '@playwright/test';

/**
 * Dismiss CookieYes if present. Safe no-op when the banner is absent or
 * suppressed (common in headless). Prefer this over copy-pasted Accept All clicks.
 */
export async function acceptCookiesIfShown(page: Page, timeoutMs = 5000): Promise<void> {
  const accept = page.getByRole('button', { name: /accept all/i });
  try {
    await accept.click({ timeout: timeoutMs });
    await page.locator('.cky-consent-container').waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  } catch {
    // Banner absent or already dismissed
  }
}
