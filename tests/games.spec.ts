import { test, expect } from '../fixtures/test';

const GAME_ROUTES = [
  '/games',
  '/games/cosmo-spins',
  '/games/free-blackjack',
  '/games/free-roulette',
  '/games/free-video-poker',
  '/games/free-craps',
  '/games/free-baccarat',
  '/games/free-keno',
];

test.describe('Games Pages', () => {
  for (const route of GAME_ROUTES) {
    test(`@regression ${route} loads and has game links`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.ok(), `expected ok response for ${route}, got ${response!.status()}`).toBeTruthy();

      const gameLink = page.locator('a[href*="/games/"]:visible').first();
      await expect(gameLink).toBeVisible();
    });
  }

  test('@regression /games/free-slots loads and renders slot grid', async ({ page }) => {
    const response = await page.goto('/games/free-slots', { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), 'free-slots response should be ok').toBeTruthy();
    // Cookie banner can delay hydration of the slot catalogue.
    await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    // Slot catalogue moved from .slot-games-grid-wrapper to category carousels.
    const slotCarousel = page.locator('.gdc-v-game-category-carousel').first();
    await expect(slotCarousel).toBeVisible({ timeout: 20000 });
    await expect(slotCarousel.locator('img, [class*="cursor-pointer"]').first()).toBeVisible();
  });

  test('@regression /games has h1', async ({ page }) => {
    await page.goto('/games');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/(Casino Games|Games)/i);
  });
});
