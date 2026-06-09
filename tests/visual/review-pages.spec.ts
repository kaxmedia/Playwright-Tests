import { test, expect } from '@playwright/test';
import { ReviewPage } from '../../pages/ReviewPage';

test.describe('Review Pages Visual Regression', () => {
  let reviewPage: ReviewPage;

  test.beforeEach(async ({ page }) => {
    reviewPage = new ReviewPage(page);
    await reviewPage.goto('bet365');
  });

  test('@smoke IE bet365 pros and cons section matches snapshot', async ({ page }) => {
    await expect(page.locator('.pros-and-cons-table-component').first()).toHaveScreenshot('review-bet365-pros-cons.png', {
      maxDiffPixelRatio: 0.04,
    });
  });

  test('@smoke IE bet365 rating widget matches snapshot', async () => {
    await expect(reviewPage.ratingContainer).toHaveScreenshot('review-bet365-rating.png', {
      maxDiffPixelRatio: 0.04,
    });
  });
});
