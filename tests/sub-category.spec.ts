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
      // CI-IP restriction: US /apps and /slots are served a reduced fallback operator list (~2)
      // from the CI datacenter IP, while a real user IP shows the full 18 (verified live
      // 2026-07-30). Skip ONLY the flagged combos, and ONLY when that fallback is actually present
      // — a real IP shows 18 so this still runs and asserts. Same CI-IP geo-gate as Tournaments
      // (TournamentsPage::hasActiveTournament); see #109/#111/#112/#114/#117.
      test.skip(
        config.ciIpReducedList === true && (await page.isReducedOperatorFallback()),
        `CI-IP reduced operator list for ${config.geo} /${config.slug} (datacenter IP served ~2; real IP shows the full list). Not a content gap.`,
      );
      // Poll until the oplist finishes hydrating — geo/VPN pages can attach the first card early.
      await expect
        .poll(async () => page.cards.count(), { timeout: 20_000 })
        .toBeGreaterThanOrEqual(3);
    });

    test('@regression T4 Operator cards have outbound CTA links', async () => {
      // Same CI-IP reduced-list guard as T3 — see the note there.
      test.skip(
        config.ciIpReducedList === true && (await page.isReducedOperatorFallback()),
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
