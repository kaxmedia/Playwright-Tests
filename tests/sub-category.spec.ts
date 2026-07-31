import { test, expect } from '../fixtures/test';
import { SubCategoryPage, subCategoryUrls } from '../pages/SubCategoryPage';

for (const config of subCategoryUrls) {
  test.describe(`Sub-category: ${config.geo} /${config.slug}`, () => {
    let page: SubCategoryPage;

    test.beforeEach(async ({ page: rawPage }) => {
      page = new SubCategoryPage(rawPage);
      await page.goto(config);
    });

    test('@regression T1 H1 visible with non-empty text', async () => {
      await expect(page.h1).toBeVisible();
      const text = await page.h1.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    });

    test('@regression T2 Operator cards visible', async () => {
      await expect(page.cards.first()).toBeVisible();
    });

    test('@regression T3 Operator count >= 3', async () => {
      // ONE poll drives BOTH the CI-reduced skip decision and the assertion — no second,
      // independent poll that a transient mid-hydration dip could slip through as a false failure.
      // operatorCount() settles hydration (real IP → 18) or times out at the CI-reduced stub (~2).
      // CI-IP restriction: US /apps & /slots are served a reduced fallback list (~2) from the
      // datacenter IP; a real user IP shows 18 (verified live 2026-07-30). Same CI-IP geo-gate as
      // Tournaments (TournamentsPage::hasActiveTournament); see #109/#111/#112/#114/#117.
      const count = await page.operatorCount(3);
      test.skip(
        config.ciIpReducedList === true && count < 3,
        `CI-IP reduced operator list for ${config.geo} /${config.slug} (datacenter IP served ~2; real IP shows the full list). Not a content gap.`,
      );
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression T4 Operator cards have outbound CTA links', async () => {
      // Same single-poll CI-reduced guard as T3 — settle hydration once, then assert CTA links.
      const count = await page.operatorCount(3);
      test.skip(
        config.ciIpReducedList === true && count < 3,
        `CI-IP reduced operator list for ${config.geo} /${config.slug} (datacenter IP served ~2; real IP shows the full list). Not a content gap.`,
      );
      const ctaCount = await page.cardLinks.count();
      expect(ctaCount).toBeGreaterThan(0);
    });

    test('@regression T5 Footer visible', async () => {
      await expect(page.footer).toBeVisible();
    });
  });
}
