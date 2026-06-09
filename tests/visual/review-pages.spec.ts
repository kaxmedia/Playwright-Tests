import { test, expect } from '@playwright/test';
import { ReviewPage } from '../../pages/ReviewPage';

const REVIEW_GEOS = ['uk', 'ie', 'us', 'nz', 'in', 'gr', 'nl'];

test.describe('Review Pages Visual Regression', () => {
  for (const geo of REVIEW_GEOS) {
    test(`@smoke ${geo} bet365 pros-cons matches snapshot`, async ({ page }) => {
      const reviewPage = new ReviewPage(page);
      const response = await reviewPage.gotoUrl(`https://www.gambling.com/${geo}/online-casinos/bet365`);
      expect(response?.ok()).toBeTruthy();
      await expect(page.locator('.pros-and-cons-table-component').first()).toHaveScreenshot(`review-${geo}-pros-cons.png`, {
        maxDiffPixelRatio: 0.04,
      });
    });

    test(`@smoke ${geo} bet365 rating matches snapshot`, async ({ page }) => {
      const reviewPage = new ReviewPage(page);
      const response = await reviewPage.gotoUrl(`https://www.gambling.com/${geo}/online-casinos/bet365`);
      expect(response?.ok()).toBeTruthy();
      await expect(reviewPage.ratingContainer).toHaveScreenshot(`review-${geo}-rating.png`, {
        maxDiffPixelRatio: 0.04,
      });
    });
  }
});
