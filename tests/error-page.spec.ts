import { test, expect } from '../fixtures/test';
import { ErrorPage } from '../pages/ErrorPage';

const geos = [
  { geo: 'ie', url: '/ie/this-page-does-not-exist' },
  { geo: 'uk', url: '/uk/this-page-does-not-exist' },
];

for (const { geo, url } of geos) {
  test.describe(`404 error page – ${geo}`, () => {
    test(`returns 404 and renders branded page @smoke`, async ({ page }) => {
      const errorPage = new ErrorPage(page);
      const response = await errorPage.goto(url);
      expect(response?.status()).toBe(404);
      await expect(errorPage.nav).toBeVisible();
      await expect(errorPage.heading).toBeVisible();
      const body = await errorPage.bodyText.textContent();
      expect(body?.toLowerCase()).not.toContain('cannot get');
      expect(body?.toLowerCase()).not.toContain('application error');
    });
  });
}
