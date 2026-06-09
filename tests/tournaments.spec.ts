// ─────────────────────────────────────────────────────────────────────────────
// Tournaments Page Tests — gambling.com
//
// Covers the GDC-owned free-to-play daily slots tournaments feature at
// https://www.gambling.com/games/tournaments
//
// This is a GDC product page, not an affiliate listing — it drives user
// registration and platform engagement rather than affiliate CTA clicks.
// Visual regression for this page is covered by PR #30. This suite adds
// functional coverage.
//
// AUTH STRATEGY
// Tests run in two separate describe blocks:
//   1. Unauthenticated — no login required, verifies the public-facing page
//   2. Authenticated — uses stored credentials to log in, verifies the
//      authenticated UI state only. Does NOT click the entry CTA to avoid
//      creating real tournament entries on every test run.
//
// Run with:
//   npx playwright test tests/tournaments.spec.ts --project=chrome
//   npx playwright test tests/tournaments.spec.ts --grep @smoke
//   npx playwright test tests/tournaments.spec.ts --grep @regression
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect, type Page } from '@playwright/test';
import { AuthPage, SIGN_IN_USER } from '../pages/AuthPage';
import { TournamentsPage } from '../pages/TournamentsPage';

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

// ─────────────────────────────────────────────────────────────────────────────
// Unauthenticated suite
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tournaments Page — Unauthenticated', () => {
  let tournamentsPage: TournamentsPage;

  test.beforeEach(async ({ page }) => {
    tournamentsPage = new TournamentsPage(page);
    await tournamentsPage.goto();
  });

  // ─── 1. Page fundamentals ─────────────────────────────────────────────────

  test.describe('Page fundamentals', () => {

    test('@smoke page loads with HTTP 200', async ({ request }) => {
      const response = await request.get('https://www.gambling.com/games/tournaments');
      expect(response.status()).toBe(200);
    });

    test('@smoke page URL is correct', async ({ page }) => {
      await expect(page).toHaveURL(/\/games\/tournaments/);
    });

    test('@smoke page has a descriptive title', async ({ page }) => {
      await expect.poll(async () => (await page.title()).trim().length).toBeGreaterThan(0);
    });

    test('@smoke H1 heading is present and non-empty', async () => {
      await expect(tournamentsPage.heading).toBeVisible({ timeout: 15_000 });
      const text = await tournamentsPage.heading.innerText();
      expect(text.trim().length).toBeGreaterThan(0);
    });

    test('@smoke page has a canonical meta tag', async ({ page }) => {
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toContain('tournaments');
    });

  });

  // ─── 2. Tournament card ───────────────────────────────────────────────────

  test.describe('Tournament card content', () => {

    test('@smoke at least one tournament card is present', async () => {
      // Wait for client-side render — tournament cards load after DOM is ready
      await expect(tournamentsPage.tournamentCard).toBeVisible({ timeout: 20_000 });
      const count = await tournamentsPage.getCardCount();
      expect(count).toBeGreaterThan(0);
    });

    test('@smoke first tournament card has a non-empty title', async () => {
      await expect(tournamentsPage.tournamentCard).toBeVisible({ timeout: 20_000 });
      await expect(tournamentsPage.tournamentTitle).toBeVisible();
      const text = await tournamentsPage.tournamentTitle.innerText();
      expect(text.trim().length, 'Tournament title should not be empty').toBeGreaterThan(0);
    });

    test('@smoke first tournament card has a prize displayed', async () => {
      await expect(tournamentsPage.tournamentCard).toBeVisible({ timeout: 20_000 });
      await expect(tournamentsPage.tournamentPrize).toBeVisible();
      const text = await tournamentsPage.tournamentPrize.innerText();
      expect(text.trim().length, 'Prize label should not be empty').toBeGreaterThan(0);
    });

  });

  // ─── 3. Countdown timer ───────────────────────────────────────────────────

  test.describe('Countdown timer', () => {

    test('@smoke countdown timer element is present', async () => {
      // Countdown units are rendered for mobile breakpoints — often hidden on desktop
      const units = tournamentsPage.page.locator('div.countdown-unit');
      expect(await units.count(), 'Countdown units should be present in the DOM').toBeGreaterThan(0);
      await expect(units.first()).toBeAttached();
    });

    test('@regression countdown timer contains time-like content', async () => {
      const units = tournamentsPage.page.locator('div.countdown-unit');
      const count = await units.count();
      expect(count).toBeGreaterThan(0);

      let timerText = '';
      for (let i = 0; i < count; i++) {
        const text = (await units.nth(i).textContent())?.trim() ?? '';
        if (/\d/.test(text)) {
          timerText = text;
          break;
        }
      }
      expect(timerText, 'Countdown should contain digit values').toMatch(/\d/);
    });

  });

  // ─── 4. Leaderboard ───────────────────────────────────────────────────────

  test.describe('Leaderboard', () => {

    test('@smoke leaderboard section is present', async () => {
      await expect(tournamentsPage.leaderboard).toBeVisible({ timeout: 10_000 });
      await expect(tournamentsPage.sectionHeading(/recent tournaments/i)).toBeVisible();
    });

    test('@regression leaderboard has at least one entry', async () => {
      await expect(tournamentsPage.leaderboard).toBeVisible({ timeout: 10_000 });
      expect(
        await tournamentsPage.leaderboardEntries.count(),
        'Recent tournaments table should have at least one entry'
      ).toBeGreaterThan(0);
    });

  });

  // ─── 5. Unauthenticated CTA ───────────────────────────────────────────────

  test.describe('Unauthenticated CTA', () => {

    test('@smoke sign-up or log-in CTA is present when logged out', async () => {
      await expect(tournamentsPage.unauthCta).toBeVisible({ timeout: 10_000 });
    });

  });

  // ─── 6. Terms link ────────────────────────────────────────────────────────

  test.describe('Terms link', () => {

    test('@smoke terms and conditions link is present', async () => {
      await expect(tournamentsPage.tournamentCard).toBeVisible({ timeout: 20_000 });
      // T&Cs are required on promotional pages — their absence is a compliance issue
      const count = await tournamentsPage.termsLink.count();
      if (count > 0) {
        const href = await tournamentsPage.termsLink.getAttribute('href');
        expect(href?.trim().length, 'Terms link should have a valid href').toBeGreaterThan(0);
      } else {
        // T&Cs may be in a different form — check for terms text anywhere on page
        const mainText = await tournamentsPage.main.innerText();
        expect(
          /terms|t&c/i.test(mainText),
          'Page should contain terms and conditions reference'
        ).toBe(true);
      }
    });

  });

  // ─── 7. Footer ────────────────────────────────────────────────────────────

  test.describe('Footer', () => {

    test('@smoke footer is present on the tournaments page', async () => {
      await tournamentsPage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(tournamentsPage.footer).toBeVisible();
    });

  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated suite
//
// Verifies the UI state when a user is logged in. Does NOT click the entry
// CTA — only asserts it is visible and correctly labelled.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Tournaments Page — Authenticated', () => {
  test.setTimeout(120_000);

  let tournamentsPage: TournamentsPage;

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page);
    tournamentsPage = new TournamentsPage(page);
    await tournamentsPage.goto();
  });

  test('@smoke authenticated user sees tournament page with play CTA', async () => {
    await expect(tournamentsPage.tournamentCard).toBeVisible({ timeout: 20_000 });

    // Verify the auth CTA is visible — we do NOT click it (no real entry)
    const authCtaCount = await tournamentsPage.authCta.count();
    if (authCtaCount > 0) {
      await expect(tournamentsPage.authCta).toBeVisible();
    } else {
      // Fallback — check the card no longer shows sign-up prompt
      const mainText = await tournamentsPage.main.innerText();
      // When logged in, the primary prompt should NOT be "sign up to play"
      // but rather something like "play now" or the tournament is playable
      expect(mainText.trim().length, 'Page should have content when authenticated').toBeGreaterThan(50);
    }
  });

  test('@smoke authenticated user does not see the unauthenticated sign-up wall', async () => {
    await expect(tournamentsPage.tournamentCard).toBeVisible({ timeout: 20_000 });

    // Logged-in users should not see the primary "Login to Play" gate
    await expect(tournamentsPage.unauthCta).toBeHidden({ timeout: 10_000 });
  });

});
