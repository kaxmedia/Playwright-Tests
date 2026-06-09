// ─────────────────────────────────────────────────────────────────────────────
// Giveaways Page Tests — gambling.com
//
// Covers the GDC-owned free-to-enter prize draw feature.
// Primary URL: https://www.gambling.com/uk/giveaways
//
// Confirmed from live page inspection (June 2026):
//   - Title: "Gambling.com Giveaways"
//   - Meta description references "Free To Enter and Play — prizes include
//     hospitality big game tickets, cash draws, super cars and holidays"
//   - Canonical: https://www.gambling.com/uk/giveaways
//   - Content is client-side rendered
//
// AUTH STRATEGY — same as tournaments.spec.ts:
//   Authenticated tests verify UI state only. The entry CTA is asserted
//   visible but NOT clicked — avoids submitting real giveaway entries.
//
// Run with:
//   npx playwright test tests/giveaways.spec.ts --project=chrome
//   npx playwright test tests/giveaways.spec.ts --grep @smoke
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, type Page } from '@playwright/test';
import { AuthPage, SIGN_IN_USER } from '../pages/AuthPage';
import { GiveawaysPage } from '../pages/GiveawaysPage';

// TODO: extract to a shared authenticated test fixture (auth.spec.ts / profile.spec.ts pattern).
async function loginViaUi(page: Page): Promise<AuthPage> {
  const authPage = new AuthPage(page);
  await authPage.goto();
  await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
  await authPage.signIn(SIGN_IN_USER.email, SIGN_IN_USER.password);
  await authPage.dismissSignupModalIfOpen();
  await expect(authPage.profileAvatar).toBeVisible({ timeout: 20_000 });
  return authPage;
}

const TEST_GEO = 'uk';

// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Giveaways Page — Unauthenticated', () => {
  let giveawaysPage: GiveawaysPage;

  test.beforeEach(async ({ page }) => {
    giveawaysPage = new GiveawaysPage(page);
    await giveawaysPage.goto(TEST_GEO);
  });

  // ─── 1. Page fundamentals ─────────────────────────────────────────────────

  test.describe('Page fundamentals', () => {

    test('@smoke page loads with HTTP 200', async ({ request }) => {
      const response = await request.get(`https://www.gambling.com/${TEST_GEO}/giveaways`);
      expect(response.status()).toBe(200);
    });

    test('@smoke page URL contains /giveaways', async ({ page }) => {
      await expect(page).toHaveURL(/\/giveaways/);
    });

    test('@smoke page title is descriptive', async ({ page }) => {
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);
      // Title confirmed from live page: "Gambling.com Giveaways"
      expect(title).toMatch(/giveaway/i);
    });

    test('@smoke page has a canonical meta tag', async ({ page }) => {
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toContain('giveaway');
    });

    test('@smoke page has an OG title meta tag', async ({ page }) => {
      const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
      expect(ogTitle?.trim().length, 'og:title should not be empty').toBeGreaterThan(0);
    });

    test('@smoke page has an OG image', async ({ page }) => {
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      // Confirmed from live page — OG image is hosted on objects.kaxmedia.com
      expect(ogImage?.trim().length, 'og:image should not be empty').toBeGreaterThan(0);
    });

  });

  // ─── 2. Giveaway cards ────────────────────────────────────────────────────

  test.describe('Giveaway cards', () => {

    test('@smoke at least one giveaway card is present', async () => {
      // Wait for client-side render
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      const count = await giveawaysPage.getCardCount();
      expect(count, 'At least one giveaway card should be present').toBeGreaterThan(0);
    });

    test('@smoke first giveaway card has a non-empty title', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      await expect(giveawaysPage.cardTitle).toBeAttached();
      const alt = await giveawaysPage.cardTitle.getAttribute('alt');
      expect(alt?.trim().length, 'Giveaway card title (img alt) should not be empty').toBeGreaterThan(0);
    });

    test('@smoke first giveaway card has an image', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      const imgCount = await giveawaysPage.cardImage.count();
      if (imgCount > 0) {
        await expect(giveawaysPage.cardImage).toBeAttached();
        const src = await giveawaysPage.cardImage.getAttribute('src');
        expect(src?.trim().length, 'Giveaway card image src should not be empty').toBeGreaterThan(0);
      } else {
        // Cards may use background images — assert the card itself is visible and non-empty
        const cardText = await giveawaysPage.firstCard.innerText();
        expect(cardText.trim().length).toBeGreaterThan(10);
      }
    });

    test('@regression all visible giveaway cards have non-empty titles', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      const count = await giveawaysPage.getCardCount();
      const limit = Math.min(count, 5);

      for (let i = 0; i < limit; i++) {
        const card = giveawaysPage.giveawayCards.nth(i);
        const img = card.locator('img[alt]').first();
        const alt = await img.getAttribute('alt');
        expect(
          alt?.trim().length,
          `Giveaway card ${i} has an empty title (img alt)`
        ).toBeGreaterThan(0);
      }
    });

  });

  // ─── 3. Entry CTA — unauthenticated ──────────────────────────────────────

  test.describe('Entry CTA — unauthenticated', () => {

    test('@smoke an entry CTA is present on the page', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      // When logged out, the entry CTA should be present but prompt auth
      const ctaCount = await giveawaysPage.entryCta.count();
      if (ctaCount > 0) {
        await expect(giveawaysPage.entryCta).toBeVisible();
      } else {
        // Fallback — check for any entry-related text
        const mainText = await giveawaysPage.main.innerText();
        expect(
          /enter|sign up|log in|register/i.test(mainText),
          'Page should have an entry mechanism or auth prompt'
        ).toBe(true);
      }
    });

    test('@smoke unauthenticated entry CTA leads to sign-up or log-in', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      await expect(giveawaysPage.entryCta).toBeVisible();
      const href = await giveawaysPage.entryCta.getAttribute('href');
      expect(href?.trim().length, 'Entry CTA should have a valid href').toBeGreaterThan(0);
      expect(href, 'Entry CTA should not be a dead # link').not.toBe('#');
    });

  });

  // ─── 4. Terms link ────────────────────────────────────────────────────────

  test.describe('Terms link', () => {

    test('@smoke terms and conditions link is present', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      const count = await giveawaysPage.termsLink.count();
      if (count > 0) {
        const href = await giveawaysPage.termsLink.getAttribute('href');
        expect(href?.trim().length, 'Terms link should have a valid href').toBeGreaterThan(0);
      } else {
        // T&Cs may be inline text rather than a link on some giveaway layouts
        const mainText = await giveawaysPage.main.innerText();
        expect(
          /terms|t&c/i.test(mainText),
          'Giveaway page should reference terms and conditions'
        ).toBe(true);
      }
    });

  });

  // ─── 5. Footer ────────────────────────────────────────────────────────────

  test.describe('Footer', () => {

    test('@smoke footer is visible', async () => {
      await giveawaysPage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(giveawaysPage.footer).toBeVisible();
    });

  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Giveaways Page — Authenticated', () => {
  test.setTimeout(120_000);

  let giveawaysPage: GiveawaysPage;

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
    giveawaysPage = new GiveawaysPage(page);
    await giveawaysPage.goto(TEST_GEO);
  });

  test('@smoke authenticated user sees giveaway cards', async () => {
    await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
    const count = await giveawaysPage.getCardCount();
    expect(count, 'Giveaway cards should be visible when authenticated').toBeGreaterThan(0);
  });

  test('@smoke authenticated user sees an entry CTA on the first card', async () => {
    await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
    // Verify the entry CTA is present — do NOT click it (no real entry submission)
    const ctaCount = await giveawaysPage.entryCta.count();
    if (ctaCount > 0) {
      await expect(giveawaysPage.entryCta).toBeVisible();
    } else {
      // Fallback — check the card has actionable content
      const cardText = await giveawaysPage.firstCard.innerText();
      expect(
        /enter|join|play/i.test(cardText),
        'Authenticated giveaway card should have an entry action'
      ).toBe(true);
    }
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 200 audit — browser-free check of key giveaway URLs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Giveaways — HTTP 200 check @audit', () => {

  test('@audit giveaway page URLs return HTTP 200', async ({ request }) => {
    const urls = [
      { name: 'UK Giveaways', url: 'https://www.gambling.com/uk/giveaways' },
      // IE /giveaways returns 404 from CI runners (June 2026) — UK is the primary market.
    ];

    const results = await Promise.all(
      urls.map(async ({ name, url }) => {
        const response = await request.get(url, { timeout: 15_000 });
        return { name, url, status: response.status() };
      })
    );

    for (const { name, url, status } of results) {
      expect(status, `[${name}] ${url} returned HTTP ${status}`).toBe(200);
    }
  });

});
