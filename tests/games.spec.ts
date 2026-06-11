import { test, expect } from '@playwright/test';

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
    test(`@smoke ${route} loads and has game links`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response, `no response for ${route}`).not.toBeNull();
      expect(response!.ok(), `expected ok response for ${route}, got ${response!.status()}`).toBeTruthy();

      const gameLink = page.locator('a[href*="/games/"]:visible').first();
      await expect(gameLink).toBeVisible();
    });
  }

  test('@smoke /games/free-slots loads and renders slot grid', async ({ page }) => {
    const response = await page.goto('/games/free-slots', { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), 'free-slots response should be ok').toBeTruthy();
    await expect(page.locator('.slot-games-grid-wrapper').first()).toBeVisible();
  });

  test('@smoke /games has h1', async ({ page }) => {
    await page.goto('/games');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText(/(Casino Games|Games)/i);
  });
});
