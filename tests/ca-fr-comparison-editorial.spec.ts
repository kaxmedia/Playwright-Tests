import { test, expect } from '../fixtures/test';
import { ComparisonPage, comparisonPages } from '../pages/ComparisonPage';

const caFrCasino = comparisonPages.find(c => c.name === 'CA FR Casino');
if (!caFrCasino) {
  throw new Error('comparisonPages must include CA FR Casino');
}

// Targeted coverage for the editorial “TOP 3” strip above the main operator table on
// https://www.gambling.com/ca/fr/casinos-en-ligne — not used on other comparison URLs.

test.describe('CA FR Casino — editorial TOP 3 strip', () => {
  test('@regression editorial label and horizontal strip are visible', async ({ page }) => {
    const cp = new ComparisonPage(page);
    await cp.goto(caFrCasino.url);

    await expect(cp.editorialTopThreeLabel()).toBeVisible();
    await expect(cp.editorialTopThreeLabel()).toContainText(/TOP\s*3.*R[ÉE]DACTION/i);

    await expect(cp.editorialTopThreeStrip()).toBeVisible();
    await expect(cp.editorialTopThreeStrip().locator('li.operator-item')).toHaveCount(3);
  });

  test('@regression each of the 3 editorial picks has logo, /go/ CTA, and operator identity', async ({
    page,
  }) => {
    const cp = new ComparisonPage(page);
    await cp.goto(caFrCasino.url);

    for (let i = 0; i < 3; i++) {
      const card = cp.nthEditorialTopPick(i);
      await expect(cp.logoImg(card)).toBeVisible();
      expect(await cp.ctaLink(card).getAttribute('href')).toMatch(/\/go\//);
      expect(await cp.operatorName(card)).toBeTruthy();
    }
  });

  test('@regression main operator table still lists picks after the featured strip', async ({ page }) => {
    const cp = new ComparisonPage(page);
    await cp.goto(caFrCasino.url);

    const mainTable = page.locator(
      'div.operator-list-full.cf-primary-operator-list > ol.automation-rwd-table.rwd-table'
    );
    await expect(mainTable).toBeVisible();
    const mainCount = await mainTable.locator('li.operator-item').count();
    expect(mainCount).toBeGreaterThanOrEqual(1);
    // Global card index 3 is the first row in the numbered list after “1–3” featured.
    expect(await cp.nthCard(3).getAttribute('data-position')).toBe('4');
  });
});
