// This test file uses the Page Object Model pattern.
// Notice how clean this looks — there are no raw CSS selectors or URLs here.
// All of that detail lives in pages/HomePage.ts.
// If the site changes, we update the page object, not this file.

import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

test.describe('Homepage', () => {

  test('page loads and has the correct title', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(page).toHaveTitle(/gambling\.com/i);
  });

  test('logo is visible in the header', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(homePage.logo).toBeVisible();
  });

  test('main navigation links are visible', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(homePage.reviewsNavLink).toBeVisible();
  });

  test('page has a visible heading', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await expect(homePage.mainHeading).toBeVisible();
  });

  // Background: a cache release bug on Friday caused the global homepage CTA buttons (Verified Bonuses section)
  // to render German text ('Jetzt Spielen') instead of English. Hotfixed by Carlos.
  //
  // This test catches future regressions of the same class — wrong-locale content leaking onto the global
  // English homepage.
  //
  // The deny-list covers known UI/CTA phrases from other gambling.com supported locales. When new
  // wrong-language phrases are discovered, add them to the array.
  //
  // What this test does NOT catch:
  // - Brand names, operator names, or game titles (uncontrolled content)
  // - New languages not yet in the deny-list
  // - Wrong-language content on other pages (this is global homepage only)
  test('@smoke No non-English content leaks on global homepage', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.goto();
    await page.waitForLoadState('networkidle');

    const bodyText = await page.locator('body').innerText();

    const nonEnglishPhrases: string[] = [
      // German
      'Jetzt Spielen', 'Hier Spielen', 'Bonus holen', 'Mehr erfahren',
      // Spanish
      'Jugar Ahora', 'Visitar Casino', 'Reclamar Bono',
      // Italian
      'Gioca Ora', 'Visita Casino', 'Reclama Bonus',
      // French
      'Jouer Maintenant', 'Visiter Casino',
      // Greek
      'Παίξε Τώρα', 'Επισκεφθείτε',
      // Portuguese
      'Jogar Agora',
      // Nordic and Dutch
      'Spela Nu', 'Spille Nå', 'Spil Nu', 'Speel Nu',
    ];

    for (const phrase of nonEnglishPhrases) {
      expect(bodyText).not.toContain(phrase);
    }
  });

});
