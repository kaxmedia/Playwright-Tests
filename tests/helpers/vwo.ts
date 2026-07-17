import type { Page } from 'playwright/test';

/**
 * Keep the automation session out of VWO A/B experiments so operator-card
 * assertions always run against the control page — not a variant that hides or
 * removes cards (the cause of intermittent "expected >= N cards, got fewer"
 * failures on US comparison/bonus pages).
 *
 * VWO SmartCode loads from *.visualwebsiteoptimizer.com; aborting those requests
 * means no experiment JS runs, so the default (full) markup renders. The page's
 * VWO anti-flicker snippet reveals content via its own tolerance timeout, so
 * blocking does not leave content hidden.
 *
 * Call BEFORE navigation so the route is registered before the page loads.
 */
export async function blockVwoExperiments(page: Page): Promise<void> {
  await page.route(/visualwebsiteoptimizer\.com/, route => route.abort());
}
