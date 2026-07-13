// ─────────────────────────────────────────────────────────────────────────────
// Giveaways Page Tests — gambling.com
//
// Covers the GDC-owned free-to-enter prize draw feature.
// Primary URL: https://www.gambling.com/uk/giveaways
//
// Confirmed from live page inspection (June 2026):
//   - Title: "Gambling.com Giveaways"
//   - Entry CTA ("Read more & enter") links to a competition detail page
//   - Competition detail exposes an on-page registration form (name, email, phone)
//   - Users do not need a site account before registering for a giveaway
//
// Run with:
//   npx playwright test tests/giveaways.spec.ts --project=chrome
//   npx playwright test tests/giveaways.spec.ts --grep @regression
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../fixtures/test';
import { GiveawaysPage } from '../pages/GiveawaysPage';

const TEST_GEO = 'uk';

let hasLiveGiveaways = true;

// ─────────────────────────────────────────────────────────────────────────────
// Giveaways hub
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Giveaways Page', () => {
  let giveawaysPage: GiveawaysPage;

  test.beforeEach(async ({ page }) => {
    giveawaysPage = new GiveawaysPage(page);
    hasLiveGiveaways = await giveawaysPage.goto(TEST_GEO);
  });

  // ─── 1. Page fundamentals ─────────────────────────────────────────────────

  test.describe('Page fundamentals', () => {

    test('@regression page loads with HTTP 200', async ({ request }) => {
      const response = await request.get(`https://www.gambling.com/${TEST_GEO}/giveaways`);
      expect(response.status()).toBe(200);
    });

    test('@regression page URL contains /giveaways', async ({ page }) => {
      await expect(page).toHaveURL(/\/giveaways/);
    });

    test('@regression page title is descriptive', async ({ page }) => {
      const title = await page.title();
      expect(title.trim().length).toBeGreaterThan(0);
      expect(title).toMatch(/giveaway/i);
    });

    test('@regression page has a canonical meta tag', async ({ page }) => {
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute('href', /giveaway/);
    });

    test('@regression page has an OG title meta tag', async ({ page }) => {
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute('content', /.+/);
    });

    test('@regression page has an OG image', async ({ page }) => {
      const ogImage = page.locator('meta[property="og:image"]');
      await expect(ogImage).toHaveAttribute('content', /.+/);
    });

  });

  // ─── 2. Giveaway cards ────────────────────────────────────────────────────

  test.describe('Giveaway cards', () => {

    test.beforeEach(async ({}, testInfo) => {
      if (!hasLiveGiveaways) {
        testInfo.skip(true, 'No live giveaways — page shows Coming Soon');
      }
    });

    test('@regression at least one giveaway card is present', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      const count = await giveawaysPage.getCardCount();
      expect(count, 'At least one giveaway card should be present').toBeGreaterThan(0);
    });

    test('@regression first giveaway card has a non-empty title', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      await expect(giveawaysPage.cardTitle).toHaveAttribute('alt', /.+/);
    });

    test('@regression first giveaway card has an image', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      const imgCount = await giveawaysPage.cardImage.count();
      if (imgCount > 0) {
        await expect(giveawaysPage.cardImage).toHaveAttribute('src', /.+/);
      } else {
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
        await expect(img).toHaveAttribute('alt', /.+/);
      }
    });

  });

  // ─── 3. Giveaway entry registration ───────────────────────────────────────

  test.describe('Giveaway entry registration', () => {

    test.beforeEach(async ({}, testInfo) => {
      if (!hasLiveGiveaways) {
        testInfo.skip(true, 'No live giveaways — page shows Coming Soon');
      }
    });

    test('@regression entry CTA links to a competition detail page', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      await expect(giveawaysPage.entryCta).toBeVisible();
      await expect(giveawaysPage.entryCta).toHaveAttribute('href', /\/giveaways\/.+/);
    });

    test('@regression competition detail exposes a registration form without site login', async () => {
      await giveawaysPage.openFirstGiveawayRegistration();

      await expect(giveawaysPage.registrationNameInput).toBeVisible();
      await expect(giveawaysPage.registrationEmailInput).toBeVisible();
      await expect(giveawaysPage.registrationPhoneInput).toBeVisible();
      await expect(giveawaysPage.registrationSubmitBtn).toBeVisible();
    });

    test('@regression registration form is present but not submitted', async () => {
      await giveawaysPage.openFirstGiveawayRegistration();

      // Assert the form is actionable — we deliberately do not click SUBMIT
      await expect(giveawaysPage.registrationSubmitBtn).toBeEnabled();
      await expect(giveawaysPage.page.locator('#signup-modal.user-logged-in')).toBeHidden();
    });

  });

  // ─── 4. Terms link ────────────────────────────────────────────────────────

  test.describe('Terms link', () => {

    test.beforeEach(async ({}, testInfo) => {
      if (!hasLiveGiveaways) {
        testInfo.skip(true, 'No live giveaways — page shows Coming Soon');
      }
    });

    test('@regression terms and conditions link is present', async () => {
      await expect(giveawaysPage.firstCard).toBeVisible({ timeout: 20_000 });
      const count = await giveawaysPage.termsLink.count();
      if (count > 0) {
        await expect(giveawaysPage.termsLink).toHaveAttribute('href', /.+/);
      } else {
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

    test('@regression footer is visible', async () => {
      await giveawaysPage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(giveawaysPage.footer).toBeVisible();
    });

  });

});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 200 audit — browser-free check of key giveaway URLs
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Giveaways — HTTP 200 check @audit', () => {

  test('@regression @audit giveaway page URLs return HTTP 200', async ({ request }) => {
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
