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
  // The modal surfaces on a ~5–6s delay after load, so wait generously for it to appear (returns
  // as soon as it does; on the GX CI IP it never appears and this waits out the timeout once).
  await regionModal.waitFor({ state: 'visible', timeout: 9000 }).catch(() => {});
  await acceptRegionPromptIfVisible(page);
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
