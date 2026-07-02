import { test, expect } from '../fixtures/test';
import { SubCategoryPage, subCategoryUrls } from '../pages/SubCategoryPage';

for (const config of subCategoryUrls) {
  test.describe(`Sub-category: ${config.geo} /${config.slug}`, () => {
    let page: SubCategoryPage;

    test.beforeEach(async ({ page: rawPage }) => {
      page = new SubCategoryPage(rawPage);
      await page.goto(config);
    });

    test('@smoke T1 H1 visible with non-empty text', async () => {
      await expect(page.h1).toBeVisible();
      const text = await page.h1.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    });

    test('@smoke T2 Operator cards visible', async () => {
      await expect(page.cards.first()).toBeVisible();
    });

    test('@smoke T3 Operator count >= 3', async () => {
      const count = await page.cards.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@smoke T4 Operator cards have outbound CTA links', async () => {
      const ctaCount = await page.cardLinks.count();
      expect(ctaCount).toBeGreaterThan(0);
    });

    test('@smoke T5 Footer visible', async () => {
      await expect(page.footer).toBeVisible();
    });
  });
}
