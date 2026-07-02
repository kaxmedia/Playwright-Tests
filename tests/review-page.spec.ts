// ─────────────────────────────────────────────────────────────────────────────
// Bookmaker / Casino Review Page Tests — gambling.com
//
// Extends the original 3-test suite to provide deeper coverage of the review
// page template. This is a high-traffic, high-revenue page type — every casino
// and bookmaker on gambling.com has a review page, and they drive significant
// affiliate CTA revenue.
//
// The existing 3 tests cover: title, rating container visible, CTA affiliate redirect.
// This suite adds: rating score, pros/cons, bonus offer box, breadcrumb, author
// byline, review images, related reviews widget, and JSON-LD structured data.
//
// APPROACH
// All tests run against the IE bet365 review page (/ie/online-casinos/bet365)
// as the primary test subject — it is a stable, fully-populated review that has
// been live for years. A second slug (paddy-power) is used for the multi-slug
// smoke check to confirm the template is consistent across operators.
//
// Run with:
//   npx playwright test tests/review-page.spec.ts --project=chrome
//   npx playwright test tests/review-page.spec.ts --grep @smoke
//   npx playwright test tests/review-page.spec.ts --grep @regression
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../fixtures/test';
import { ReviewPage } from '../pages/ReviewPage';

const TEST_SLUG = 'bet365';
const BOOKMAKER_NAME = 'Bet365';

// Second operator used to confirm the template is not bet365-specific
const SECOND_SLUG = 'paddy-power';

test.describe('Bookmaker Review Page', () => {
  let reviewPage: ReviewPage;

  test.beforeEach(async ({ page }) => {
    reviewPage = new ReviewPage(page);
    await reviewPage.goto(TEST_SLUG);
  });

  // ─── 1. Page fundamentals ──────────────────────────────────────────────────

  test.describe('Page fundamentals', () => {

    test('@smoke review page loads with correct title', async ({ page }) => {
      const title = await page.title();
      expect(title).toContain(BOOKMAKER_NAME);
    });

    test('@smoke page URL contains the operator slug', async ({ page }) => {
      await expect(page).toHaveURL(new RegExp(TEST_SLUG));
    });

    test('@smoke page has a canonical meta tag', async ({ page }) => {
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical, 'Canonical link should be present').toBeTruthy();
      expect(canonical).toContain(TEST_SLUG);
    });

    test('@smoke page has an OG title meta tag', async ({ page }) => {
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle?.trim().length, 'og:title should not be empty').toBeGreaterThan(0);
    });

  });

  // ─── 2. Rating widget ──────────────────────────────────────────────────────

  test.describe('Rating widget', () => {

    // Carried over from original suite
    test('@smoke rating container is visible', async () => {
      await expect(reviewPage.ratingContainer).toBeVisible();
    });

    test('@smoke rating container contains a non-zero numeric score', async () => {
      await expect(reviewPage.ratingScore).toBeVisible();
      const score = parseFloat((await reviewPage.ratingScore.innerText()).trim());
      expect(score, 'Rating score should be greater than zero').toBeGreaterThan(0);
      expect(score, 'Rating score should be 10 or below').toBeLessThanOrEqual(10);
    });

  });

  // ─── 3. Pros and Cons ──────────────────────────────────────────────────────

  test.describe('Pros and Cons section', () => {

    test('@smoke pros list has at least one item', async () => {
      await expect(reviewPage.prosList.first()).toBeVisible({ timeout: 10_000 });
      expect(await reviewPage.prosList.count()).toBeGreaterThan(0);
    });

    test('@smoke cons list has at least one item', async () => {
      await expect(reviewPage.consList.first()).toBeVisible({ timeout: 10_000 });
      expect(await reviewPage.consList.count()).toBeGreaterThan(0);
    });

  });

  // ─── 4. Bonus offer box ────────────────────────────────────────────────────

  test.describe('Bonus offer box', () => {

    test('@smoke bonus offer box is visible', async () => {
      // The bonus callout block is a key commercial element on every review page
      await expect(reviewPage.bonusOfferBox).toBeVisible({ timeout: 10_000 });
    });

    test('@smoke bonus offer box contains non-empty text', async () => {
      await expect(reviewPage.bonusOfferBox).toBeVisible({ timeout: 10_000 });
      const text = await reviewPage.bonusOfferBox.innerText();
      expect(text.trim().length, 'Bonus offer box should not be empty').toBeGreaterThan(0);
    });

    test('@smoke bonus CTA link points to an affiliate /go/ redirect', async () => {
      await expect(reviewPage.bonusCtaLink).toBeVisible();
      const href = await reviewPage.bonusCtaLink.getAttribute('href');
      expect(href, 'Bonus CTA should have an affiliate /go/ href').toMatch(/\/go\//);
    });

  });

  // ─── 5. CTA button ─────────────────────────────────────────────────────────

  test.describe('CTA button', () => {

    // Carried over from original suite
    test('@smoke CTA button is visible and opens affiliate redirect in new tab', async () => {
      await expect(reviewPage.ctaButton).toBeVisible();
      const newTab = await reviewPage.clickCtaAndGetNewTab();
      await expect
        .poll(() => newTab.url(), { timeout: 20_000 })
        .not.toMatch(/^about:blank$/);
      const url = newTab.url();
      // After the /go/ redirect resolves the URL is either still on gambling.com
      // (e.g. geo-blocked) or on the operator's site — either way affiliate= confirms
      // the tracking fired correctly
      expect(url).toContain('affiliate=');
      await newTab.close();
    });

  });

  // ─── 6. Breadcrumb navigation ──────────────────────────────────────────────

  test.describe('Breadcrumb navigation', () => {

    test('@smoke breadcrumb is present on the page', async () => {
      await expect(reviewPage.breadcrumb).toBeVisible({ timeout: 10_000 });
    });

    test('@smoke breadcrumb contains at least 2 links', async () => {
      await expect(reviewPage.breadcrumb).toBeVisible({ timeout: 10_000 });
      const count = await reviewPage.breadcrumbLinks.count();
      expect(count, 'Breadcrumb should have at least 2 links (Home > Category)').toBeGreaterThanOrEqual(2);
    });

    test('@regression breadcrumb links all have valid non-empty hrefs', async () => {
      await expect(reviewPage.breadcrumb).toBeVisible({ timeout: 10_000 });
      const links = reviewPage.breadcrumbLinks;
      const count = await links.count();
      for (let i = 0; i < count; i++) {
        const href = await links.nth(i).getAttribute('href');
        expect(href?.trim().length, `Breadcrumb link ${i} has an empty href`).toBeGreaterThan(0);
        expect(href, `Breadcrumb link ${i} should not be a dead # link`).not.toBe('#');
      }
    });

  });

  // ─── 7. Author byline ──────────────────────────────────────────────────────

  test.describe('Author byline', () => {

    test('@smoke review has a named author byline', async () => {
      await expect(reviewPage.authorByline).toBeVisible({ timeout: 10_000 });
      const text = await reviewPage.authorByline.innerText();
      expect(text.trim().length, 'Author byline should not be empty').toBeGreaterThan(0);
    });

  });

  // ─── 8. Review body images ─────────────────────────────────────────────────

  test.describe('Review body images', () => {

    test('@smoke at least one review body image is present and has a valid src', async () => {
      const count = await reviewPage.reviewImages.count();
      expect(count, 'Review page should contain at least one content image').toBeGreaterThan(0);

      // Check the first image — it should have a non-empty, non-broken src
      const firstImg = reviewPage.reviewImages.first();
      await expect(firstImg).toBeAttached();
      const src = await firstImg.getAttribute('src');
      expect(src?.trim().length, 'First review image src should not be empty').toBeGreaterThan(0);
    });

    test('@regression no review images have an empty or missing src', async () => {
      const count = await reviewPage.reviewImages.count();
      const limit = Math.min(count, 10); // Check up to 10 images

      for (let i = 0; i < limit; i++) {
        const src = await reviewPage.reviewImages.nth(i).getAttribute('src');
        expect(src?.trim().length, `Image ${i} has an empty src`).toBeGreaterThan(0);
      }
    });

  });

  // ─── 9. Related reviews widget ─────────────────────────────────────────────

  test.describe('Related reviews widget', () => {

    test('@smoke related reviews widget is present', async () => {
      await expect(reviewPage.relatedReviewsWidget).toBeVisible({ timeout: 10_000 });
      await expect(
        reviewPage.relatedReviewsWidget.getByRole('heading', { name: /more .+ casino sites/i })
      ).toBeVisible();
    });

    test('@regression related reviews widget contains at least one link', async () => {
      await expect(reviewPage.relatedReviewsWidget).toBeVisible({ timeout: 10_000 });
      const links = reviewPage.relatedReviewsWidget.locator('a[href*="/online-casinos/"]');
      expect(await links.count(), 'Related reviews widget should contain at least one link').toBeGreaterThan(0);
    });

  });

  // ─── 10. Structured data (JSON-LD) ─────────────────────────────────────────

  test.describe('Structured data', () => {

    test('@regression page has at least one JSON-LD block', async () => {
      const blocks = await reviewPage.getJsonLdBlocks();
      expect(blocks.length, 'Review page should have at least one JSON-LD structured data block').toBeGreaterThan(0);
    });

    test('@regression JSON-LD contains a Review or Article schema type', async () => {
      const blocks = await reviewPage.getJsonLdBlocks();
      const types = blocks.map(b => b['@type'] as string).filter(Boolean);
      const hasReviewOrArticle = types.some(t =>
        /review|article|newsarticle|blogposting/i.test(t)
      );
      expect(
        hasReviewOrArticle,
        `Expected a Review or Article JSON-LD type, found: ${types.join(', ') || 'none'}`
      ).toBe(true);
    });

  });

});

// Separate describe — avoids loading bet365 in beforeEach before navigating to the second slug.
test.describe('Bookmaker Review Page — multi-slug template consistency', () => {
  test('@smoke second operator review page loads and has a rating container', async ({ page }) => {
    const reviewPage = new ReviewPage(page);
    await reviewPage.goto(SECOND_SLUG);

    await expect(page).toHaveURL(new RegExp(SECOND_SLUG));
    await expect(reviewPage.ratingContainer).toBeVisible();
    await expect(reviewPage.ctaButton).toBeVisible();
  });

  test('@smoke second operator review page has a non-empty title', async ({ page }) => {
    const reviewPage = new ReviewPage(page);
    await reviewPage.goto(SECOND_SLUG);
    const title = await page.title();
    expect(title.trim().length).toBeGreaterThan(0);
  });
});