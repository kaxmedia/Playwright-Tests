import { test, expect } from '../fixtures/test';
import { HomePage } from '../pages/HomePage';
import { dismissRegionPromptBeforeCapture } from '../fixtures/regionPrompt';

test.describe('Homepage', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    homePage = new HomePage(page);
    // Confirmed 2026-10-09 (run #1576): the region-prompt modal's auto-dismiss handler
    // (_acceptRegionPrompt in fixtures/test.ts) only fires before Playwright *actions* --
    // not before passive assertions like toHaveTitle()/toBeVisible(). A previous attempt
    // to fix this with a one-shot acceptRegionPromptIfVisible() call here caused a severe
    // regression (PR #232, reverted in #233): that function only checks once, immediately
    // after goto(), and the modal's appearance delay is genuinely non-deterministic (not
    // yet visible 6s after load in one trial, still not visible after 20s in another --
    // see dismissRegionPromptBeforeCapture's own docs) -- so the one-shot check mostly
    // missed it, and manually invoking isVisible() on the same locator that
    // addLocatorHandler is already watching likely raced that handler, causing the
    // timeout storm. dismissRegionPromptBeforeCapture (already proven safe in
    // tests/visual/*.spec.ts for the same race) polls for up to 18s instead of checking
    // once, which is the correct fix for this class of problem.
    await dismissRegionPromptBeforeCapture(page);
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
