import { test, expect } from '../../fixtures/test';
import { acceptRegionPromptIfVisible } from '../../fixtures/regionPrompt';

const TOURNAMENTS_MASKS = [
  'div.countdown-unit',
  'div.gdc-v-tournament-results-table',
  'div.prize-pool-list',
  'div.cky-banner-bottom',
];

test('@visual gambling.com /games/tournaments renders deterministically', async ({ page }) => {
  await page.goto('/games/tournaments', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
  });
  // Dismiss the geo region-switch prompt ("You're visiting from <country> — Switch to our <XX>
  // experience") BEFORE capturing. It appears on a delay from a non-GX/local IP and is normally
  // auto-dismissed by fixtures/test.ts's addLocatorHandler — but that only fires before ACTIONS,
  // never before toHaveScreenshot(), so from a non-GX region the modal would sit in the capture
  // (the undismissed-popup "53% diff" this fixes). Give the delayed modal a chance to appear, then
  // decline it ("No Thanks" — stay on this site); on the GX CI IP the modal never shows and this
  // is a fast no-op. Settle briefly so the backdrop is fully gone before the pixel capture.
  const regionModal = page.locator('[aria-labelledby="region-prompt-modal-heading"]');
    // The modal's appearance timing is genuinely non-deterministic -- confirmed live: not yet
    // visible 6s after load in one trial, still not visible after 20s in another. A single
    // wait-then-check-once (the previous approach here) leaves the window between that one check
    // and the actual screenshot call completely unguarded, which is exactly what caused the
    // undismissed-modal captures (68% pixel diff, run #388 shard 3). Poll for it instead, right up
    // to just before capturing, so no matter when in that window it appears, it gets dismissed.
    const regionDeadline = Date.now() + 18000;
    while (Date.now() < regionDeadline) {
          if (await regionModal.isVisible().catch(() => false)) {
                  await acceptRegionPromptIfVisible(page);
                  break;
          }
          await page.waitForTimeout(500);
    }
    await regionModal.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot('tournaments.png', {
    fullPage: false,
    threshold: 0,
    maxDiffPixelRatio: 0.04,
    timeout: 30000,
    mask: TOURNAMENTS_MASKS.map(s => page.locator(s)),
  });
});
