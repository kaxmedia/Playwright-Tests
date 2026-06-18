// Page Object for the Tournaments page on gambling.com.
//
// The Tournaments page is a GDC-owned feature — free-to-play daily slots
// tournaments where registered users compete for prizes.
//
// URL: https://www.gambling.com/games/tournaments
//
// Confirmed from live page (June 2026):
//   - Active tournament widget: .tournament-info-panel
//   - Recent tournaments table: .gdc-v-tournament-results-table
//   - Countdown units: div.countdown-unit
//   - Logged-out CTA: "Login to Play" button
//
// NOTE: Authenticated tests verify UI state only — they do not enter a tournament.

import { type Page, type Locator, type Response } from '@playwright/test';

const retryDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TournamentsPage {
  readonly page: Page;

  /** Default global tournaments URL (no geo prefix). */
  readonly url = 'https://www.gambling.com/games/tournaments';

  urlForGeo(geo?: string): string {
    if (!geo) return this.url;
    const segment = geo.replace(/^\//, '');
    return `https://www.gambling.com/${segment}/games/tournaments`;
  }

  readonly main: Locator;
  readonly heading: Locator;
  readonly tournamentCard: Locator;
  readonly tournamentCards: Locator;
  readonly tournamentTitle: Locator;
  readonly tournamentPrize: Locator;
  readonly countdownTimer: Locator;
  readonly leaderboard: Locator;
  readonly leaderboardEntries: Locator;
  readonly unauthCta: Locator;
  readonly authCta: Locator;
  readonly termsLink: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page body — exclude the auth modal <main id="modal-authentication-content">
    this.main = page.locator('main.body_content').first();
    this.heading = this.main.locator('h1').first();
    this.footer = page.locator('footer, [role="contentinfo"]').last();

    this.tournamentCard = page.locator('.tournament-info-panel').first();
    this.tournamentCards = page.locator('.gdc-v-tournament-results-table tbody tr');
    // Active tournament section title — distinct from page H1 ("It's time to play")
    this.tournamentTitle = this.main.getByRole('heading', { name: /free slot tournaments/i });
    this.tournamentPrize = this.tournamentCard.getByText(/total prize pool|total free spins/i).first();
    this.countdownTimer = page.locator('div.countdown-unit').first();
    this.leaderboard = page.locator('.gdc-v-tournament-results-table').first();
    this.leaderboardEntries = this.leaderboard.locator('tbody tr, button');

    this.unauthCta = page.getByRole('button', {
      name: /login to play|log in|sign in/i,
    }).first();

    this.authCta = this.main.getByRole('button', {
      name: /play now|enter|start playing|play tournament/i,
    }).or(
      this.main.getByRole('link', { name: /play now|enter|start playing/i }),
    ).first();

    this.termsLink = page.getByRole('link', { name: /terms|t&c/i }).first();
  }

  async goto(geo?: string): Promise<Response | null> {
    const targetUrl = this.urlForGeo(geo);
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
        await this.tournamentCard.waitFor({ state: 'visible', timeout: 20_000 });
        await this.heading.waitFor({ state: 'visible', timeout: 10_000 });
        await this.page.locator('div.countdown-unit').first().waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
        return response;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isTransient = /ERR_NETWORK|ERR_INTERNET|ERR_CONNECTION|Timeout.*exceeded/i.test(message);
        if (!isTransient || attempt === maxAttempts) {
          throw error;
        }
        await retryDelay(1000 * attempt);
      }
    }

    throw lastError;
  }

  // Available for single-unit countdown text — spec iterates all units directly.
  async getCountdownText(): Promise<string> {
    const text = await this.countdownTimer.textContent();
    return text?.trim() ?? '';
  }

  async getCardCount(): Promise<number> {
    return this.tournamentCards.count();
  }

  sectionHeading(text: string | RegExp): Locator {
    return this.page.locator('h2, h3').filter({ hasText: text }).first();
  }
}
