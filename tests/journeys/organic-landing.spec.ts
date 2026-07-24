// ─────────────────────────────────────────────────────────────────────────────
// Organic Landing User Journeys — IE market (gambling.com)
//
// Simulates high-traffic SEO entry points and asserts each template exposes the
// commercial and recirculation paths a real visitor would use after landing
// from organic search.
//
// Run with:
//   npx playwright test tests/journeys/organic-landing.spec.ts --project=chrome
//   npx playwright test tests/journeys/organic-landing.spec.ts --grep @regression
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../../fixtures/test';
import { ComparisonPage } from '../../pages/ComparisonPage';
import { OrganicLandingPage, ORGANIC_LANDING } from '../../pages/OrganicLandingPage';
import { ReviewPage } from '../../pages/ReviewPage';

test.describe('Organic Landing Journeys — IE', () => {

  // ─── Journey 1.1 — Slot review page ───────────────────────────────────────

  test.describe('Journey 1.1 — Slot review organic landing', () => {
    let journey: OrganicLandingPage;

    test.beforeEach(async ({ page }) => {
      journey = new OrganicLandingPage(page);
      const response = await journey.goto(ORGANIC_LANDING.slotReviewUrl);
      expect(response?.status(), 'Slot review should return HTTP 200').toBeLessThan(400);
    });

    test('@regression lands on IE slot review URL with Starburst in the title', async ({ page }) => {
      await expect(page).toHaveURL(/\/ie\/online-casinos\/slots\/starburst/);
      await expect(journey.slotHeading).toBeVisible();
      await expect(journey.slotHeading).toContainText(/starburst/i);
    });

    test('@regression related slot games carousel is present', async () => {
      // `{ page }` omitted — navigation and assertions use the journey POM from beforeEach.
      await journey.relatedSlotGamesSection.scrollIntoViewIfNeeded();
      await expect(journey.relatedSlotGamesSection).toBeVisible({ timeout: 15_000 });
      await expect(journey.relatedSlotCarousel).toBeVisible();
      await expect(journey.relatedSlotCarousel.locator('.carousel__slide').first()).toBeAttached();
    });

    test('@regression in-page slot review oplist exposes affiliate CTAs', async () => {
      // `{ page }` omitted — navigation and assertions use the journey POM from beforeEach.
      await expect(journey.slotReviewOplist).toBeVisible({ timeout: 15_000 });
      const cta = journey.slotReviewOplist.locator('a[href*="/go/"]').first();
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute('href', /\/go\//);
    });
  });

  // ─── Journey 1.2 — Casino review page ─────────────────────────────────────

  test.describe('Journey 1.2 — Casino review organic landing', () => {
    let reviewPage: ReviewPage;

    test.beforeEach(async ({ page }) => {
      reviewPage = new ReviewPage(page);
      const response = await reviewPage.gotoUrl(ORGANIC_LANDING.casinoReviewUrl);
      expect(response?.status(), 'Casino review should return HTTP 200').toBeLessThan(400);
    });

    test('@regression lands on kingmaker review with rating widget visible', async ({ page }) => {
      // Site now inserts a /reviews/ segment into operator review URLs (…/online-casinos/reviews/<slug>).
      await expect(page).toHaveURL(/\/ie\/online-casinos\/reviews\/kingmaker/);
      // Review score widget — `div[class*="bg-gdc-gray-200"]`, not broad `[class*="rating"]`
      await expect(reviewPage.ratingContainer).toBeVisible({ timeout: 15_000 });
      await expect(reviewPage.ratingScore).toBeVisible();
      const score = parseFloat((await reviewPage.ratingScore.innerText()).trim());
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(10);
    });

    test('@regression review exposes a primary affiliate CTA', async () => {
      await expect(reviewPage.ctaButton).toBeVisible();
      await expect(reviewPage.ctaButton).toHaveAttribute('href', /\/go\//);
    });

    test('@regression review hero shows a bonus offer block', async () => {
      await expect(reviewPage.bonusOfferBox).toBeVisible({ timeout: 15_000 });
      const text = await reviewPage.bonusOfferBox.innerText();
      expect(text.trim().length).toBeGreaterThan(0);
    });
  });

  // ─── Journey 1.3 — Comparison / toplist landing ───────────────────────────

  test.describe('Journey 1.3 — Comparison page organic landing', () => {
    let comparison: ComparisonPage;

    test.beforeEach(async ({ page }) => {
      comparison = new ComparisonPage(page);
      const response = await comparison.goto(ORGANIC_LANDING.comparisonUrl);
      expect(response?.status()).toBeLessThan(400);
    });

    test('@regression IE casino comparison loads with operator cards and affiliate CTAs', async ({ page }) => {
      await expect(page).toHaveURL(/\/ie\/online-casinos\/?$/);

      await expect(comparison.cards.first()).toBeVisible({ timeout: 20_000 });
      expect(await comparison.cards.count()).toBeGreaterThanOrEqual(5);

      const firstCard = comparison.nthCard(0);
      await expect(comparison.logoImg(firstCard)).toBeVisible();
      await expect(comparison.ctaLink(firstCard)).toHaveAttribute('href', /\/go\//);
      expect(await comparison.operatorName(firstCard)).toBeTruthy();
    });
  });

  // ─── Journey 1.4 — News / tips article with in-content toplist ────────────

  test.describe('Journey 1.4 — News article organic landing', () => {
    let journey: OrganicLandingPage;

    test.beforeEach(async ({ page }) => {
      journey = new OrganicLandingPage(page);
      const response = await journey.goto(ORGANIC_LANDING.newsArticleUrl);
      expect(response?.status()).toBeLessThan(400);
    });

    test('@regression lands on a long-form article with a descriptive H1', async ({ page }) => {
      await expect(page).toHaveURL(new RegExp(ORGANIC_LANDING.newsArticleSlug));
      const h1 = page.locator('main h1').first();
      await expect(h1).toBeVisible();
      const title = (await h1.innerText()).trim();
      expect(title.length).toBeGreaterThan(10);
    });

    test('@regression article body contains in-content affiliate toplist links', async () => {
      await expect(journey.articleInContentGoLinks.first()).toBeAttached();
      expect(await journey.articleInContentGoLinks.count()).toBeGreaterThanOrEqual(3);
      const href = await journey.articleInContentGoLinks.first().getAttribute('href');
      expect(href).toMatch(/\/go\//);
    });

    test('@regression article renders operator commercial blocks in the body', async () => {
      await expect(journey.articleOperatorBlocks.first()).toBeAttached();
    });
  });

  // ─── Journey 1.5 — Strategy guide hub ─────────────────────────────────────

  test.describe('Journey 1.5 — Strategy guide organic landing', () => {
    let journey: OrganicLandingPage;

    test.beforeEach(async ({ page }) => {
      journey = new OrganicLandingPage(page);
      const response = await journey.goto(ORGANIC_LANDING.strategyHubUrl);
      expect(response?.status()).toBeLessThan(400);
    });

    test('@regression strategy hub loads with guide listings', async ({ page }) => {
      await expect(page).toHaveURL(/\/ie\/strategy\/?$/);
      // Page-level h1 rather than `main h1`: the strategy hub renders no <main>
      // landmark, so scoping to main matched nothing. The <h1> ("Gambling Strategy")
      // is present regardless.
      await expect(page.locator('h1').first()).toContainText(/strategy/i);
      await expect(journey.strategyArticleLinks.nth(2)).toBeAttached();
    });

    test('@regression strategy hub exposes commercial paths for organic visitors', async () => {
      const commercialLinks = journey.page.locator('main a[href*="/go/"], main a[href*="/online-casinos/"]');
      await expect(commercialLinks.first()).toBeAttached();
    });

    test('@regression visitor can open a strategy article from the hub', async ({ page }) => {
      const firstGuide = journey.strategyArticleLinks.first();
      await expect(firstGuide).toBeVisible();
      const href = await firstGuide.getAttribute('href');
      expect(href?.trim().length).toBeGreaterThan(0);

      await firstGuide.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/\/strategy\//);
      await expect(page.locator('main h1').first()).toBeVisible();
      await expect(page.locator('main a[href*="/go/"]').first()).toBeAttached();
    });
  });

});
