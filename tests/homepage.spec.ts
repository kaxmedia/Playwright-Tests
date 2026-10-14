import { test, expect } from '../fixtures/test';
import { HomePage } from '../pages/HomePage';

test.describe('Homepage', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();
    homePage = new HomePage(page);
    // Two prior attempts to DISMISS the region-prompt modal here both caused a 60s
    // beforeEach timeout (PRs #232 and a second attempt, both reverted) -- any call that
    // interacts with the modal (click, waitFor hidden, even a polling isVisible() loop)
    // seems to conflict with the already-registered addLocatorHandler in fixtures/test.ts,
    // for reasons that weren't fully pinned down without live trace access. Sidestepping
    // the interaction entirely this time: CSS-hide the modal instead of dismissing it.
    // This is a pure DOM/style operation -- it never goes through Playwright's
    // actionability or handler system at all, so it can't race the auto-handler the way
    // a click or an explicit wait did. The modal's own interactive behavior is already
    // covered by its dedicated tests elsewhere; these tests only need it visually and
    // functionally out of the way.
    await page.addStyleTag({
      content: '[aria-labelledby="region-prompt-modal-heading"] { display: none !important; }',
    });
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
