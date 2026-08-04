import { test, expect } from '../../fixtures/test';
import { ReviewPage } from '../../pages/ReviewPage';
import { dismissAgeGateForGeo } from '../../fixtures/ageGate';

const PROS_CONS_GEOS = ['ie', 'nz', 'nl'];
const RATING_GEOS = ['uk', 'ie', 'us', 'nz', 'gr', 'nl'];

test.describe('Review Pages Visual Regression', () => {
  for (const geo of PROS_CONS_GEOS) {
    test(`@visual ${geo} bet365 pros-cons matches snapshot`, async ({ page }) => {
      const reviewPage = new ReviewPage(page);
      const response = await reviewPage.gotoUrl(`https://www.gambling.com/${geo}/online-casinos/bet365`);
      expect(response?.ok()).toBeTruthy();
      await page.waitForLoadState('load');
      // NL is age-gated (24+): dismiss the "Hoe oud bent u?" gate before capturing so it can neither
      // overlay the pros-cons element nor get baked into the regenerated baseline. No-op on ie/nz.
      await dismissAgeGateForGeo(page, geo);
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
      await page.waitForLoadState('load');
      // The rating card's last row, "Casino Payout Percentage", is only intermittently present — its
      // absence is the 325x334 → 325x260 (-74px) dimension mismatch that hard-fails before pixels are
      // ever compared — and the "Our Rating" score drifts (e.g. 8.5 → 8.6). Pin the card to its stable
      // 4-row height so the payout row (the last row, exactly the +74px) is cropped and cannot change
      // the captured dimensions, and mask the volatile Our Rating score. The remaining three rows
      // (casino games / jackpot slots / live games) are stable.
      await page.addStyleTag({
        content: 'div[class*="bg-gdc-gray-200"]{height:260px !important;max-height:260px !important;overflow:hidden !important;}',
      });
      await expect(reviewPage.ratingContainer).toHaveScreenshot(`review-${geo}-rating.png`, {
        mask: [reviewPage.ratingScore],
        maxDiffPixelRatio: 0.04,
      });
    });
  }
});
