import { test, expect } from '../../fixtures/test';
import { ReviewPage } from '../../pages/ReviewPage';

const PROS_CONS_GEOS = ['ie', 'nz', 'nl'];
const RATING_GEOS = ['uk', 'ie', 'us', 'nz', 'gr', 'nl'];

test.describe('Review Pages Visual Regression', () => {
  for (const geo of PROS_CONS_GEOS) {
    test(`@visual ${geo} bet365 pros-cons matches snapshot`, async ({ page }) => {
      const reviewPage = new ReviewPage(page);
      const response = await reviewPage.gotoUrl(`https://www.gambling.com/${geo}/online-casinos/bet365`);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('.pros-and-cons-table-component').first()).toHaveScreenshot(`review-${geo}-pros-cons.png`, {
        maxDiffPixelRatio: 0.04,
      });
    });
  }

  for (const geo of RATING_GEOS) {
    test(`@visual ${geo} bet365 rating matches snapshot`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name === 'visual-chromium-android' || testInfo.project.name === 'visual-webkit-ios', 'rating hidden on mobile viewports');
      const reviewPage = new ReviewPage(page);
      const response = await reviewPage.gotoUrl(`https://www.gambling.com/${geo}/online-casinos/bet365`);
      expect(response?.ok()).toBeTruthy();
      await expect(reviewPage.ratingContainer).toHaveScreenshot(`review-${geo}-rating.png`, {
        maxDiffPixelRatio: 0.04,
      });
    });
  }
});
