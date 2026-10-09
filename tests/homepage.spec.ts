import { test, expect } from '../fixtures/test';
import { HomePage } from '../pages/HomePage';
import { acceptRegionPromptIfVisible } from '../fixtures/regionPrompt';

test.describe('Homepage', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    homePage = new HomePage(page);
    // Confirmed 2026-10-09 (run #1576): the region-prompt modal's auto-dismiss handler
    // (_acceptRegionPrompt in fixtures/test.ts) only fires before Playwright *actions* --
    // not before passive assertions like toHaveTitle()/toBeVisible(). "page loads and has
    // the correct title" hard-failed on webkit every retry (title came back "" with the
    // modal intercepting), and the two toBeVisible() tests were flaky for the same reason
    // (a race on the modal's non-deterministic appearance delay, per regionPrompt.ts's own
    // docs). Explicit one-shot dismiss here closes that gap for every test in this file.
    await acceptRegionPromptIfVisible(page);
  });

  test('@smoke @regression page loads and has the correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/gambling\.com/i);
  });

  test('@smoke @regression logo is visible in the header', async () => {
    await expect(homePage.logo).toBeVisible();
  });

  test('@smoke @regression main navigation links are visible', async () => {
    await expect(homePage.reviewsNavLink).toBeVisible();
  });

  test('@smoke @regression page has a visible heading', async () => {
    await expect(homePage.mainHeading).toBeVisible();
  });

  // Background: a cache release bug caused German text to leak onto the global English homepage.
  // Hotfixed by Carlos. This test catches future regressions of the same class.
  // Does NOT catch: brand names, new languages not in list, other pages.
  test('@smoke @regression No non-English content leaks on global homepage', async ({ page }) => {
    await page.waitForLoadState('domcontentloaded');
    const bodyText = await page.locator('body').innerText();
    const nonEnglishPhrases: string[] = [
      'Jetzt Spielen', 'Hier Spielen', 'Bonus holen', 'Mehr erfahren',
      'Jugar Ahora', 'Visitar Casino', 'Reclamar Bono',
      'Gioca Ora', 'Visita Casino', 'Reclama Bonus',
      'Jouer Maintenant', 'Visiter Casino',
      'Παίξε Τώρα', 'Επισκεφθείτε',
      'Jogar Agora',
      'Spela Nu', 'Spille Nå', 'Spil Nu', 'Speel Nu',
    ];

    for (const phrase of nonEnglishPhrases) {
      expect(bodyText).not.toContain(phrase);
    }
  });
});
