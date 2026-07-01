// Page Object for the Giveaways page on gambling.com.
//
// The Giveaways page is a GDC-owned promotional feature — free-to-enter
// prize draws (hospitality tickets, cash, holidays, etc.) for registered users.
//
// URL pattern: https://www.gambling.com/{geo}/giveaways
// Primary test target: https://www.gambling.com/uk/giveaways
//
// Confirmed from live page (June 2026):
//   - Cards render inside div.live-competitions > div.competitions > div
//   - Entry CTA label: "Read more & enter" — links to /{geo}/giveaways/{slug}
//   - Competition detail exposes an on-page registration form (name, email, phone)
//     — users do not need a site account before entering
//   - Card titles are carried on img[alt], not h2/h3
//   - When no competitions are live the page shows "Giveaways Coming Soon"

import { type Page, type Locator, expect } from '@playwright/test';

const retryDelay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GiveawaysPage {
  readonly page: Page;

  readonly basePath = '/giveaways';

  readonly main: Locator;
  readonly liveCompetitions: Locator;
  readonly heading: Locator;
  readonly giveawayCards: Locator;
  readonly firstCard: Locator;
  readonly cardTitle: Locator;
  readonly cardImage: Locator;
  readonly comingSoonHeading: Locator;
  readonly entryCta: Locator;
  readonly termsLink: Locator;
  readonly footer: Locator;

  /** On-page competition entry form — no prior site login required */
  readonly registrationNameInput: Locator;
  readonly registrationEmailInput: Locator;
  readonly registrationPhoneInput: Locator;
  readonly registrationSubmitBtn: Locator;

  constructor(page: Page) {
    this.page = page;

    this.main = page.locator('main, [role="main"]').first();
    this.liveCompetitions = page.locator('div.live-competitions').first();
    this.heading = this.liveCompetitions.getByText(/^Live Giveaways$/i);
    this.footer = page.locator('footer, [role="contentinfo"]').last();

    this.giveawayCards = this.liveCompetitions.locator('div.competitions > div');
    this.firstCard = this.giveawayCards.first();
    this.comingSoonHeading = page.getByText(/giveaways coming soon/i);

    // Titles are img alt text on live UK giveaways — not h2/h3 inside cards
    this.cardTitle = this.firstCard.locator('img[alt]').first();
    this.cardImage = this.firstCard.locator('img').first();

    this.entryCta = this.giveawayCards.getByRole('link', {
      name: /read more & enter|enter now|enter giveaway/i,
    }).first();

    this.termsLink = page.getByRole('link', {
      name: /terms|t&c|full terms/i,
    }).first();

    this.registrationNameInput = page.locator('main.body_content input[name="name"]').first();
    this.registrationEmailInput = page.locator('main.body_content input[name="email"]').first();
    this.registrationPhoneInput = page.locator('main.body_content input[placeholder*="PHONE" i]').first();
    this.registrationSubmitBtn = page
      .locator('main.body_content')
      .getByRole('button', { name: /^submit$/i })
      .first();
  }

  /**
   * Navigate to the giveaways hub. Returns true when live competition cards are
   * visible, false when the page shows "Giveaways Coming Soon" only.
   */
  async goto(geo = 'uk'): Promise<boolean> {
    const url = `/${geo}${this.basePath}`;
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});

        if (await this.firstCard.isVisible({ timeout: 20_000 }).catch(() => false)) {
          return true;
        }
        if (await this.comingSoonHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
          return false;
        }

        throw new Error('Giveaways hub loaded but neither live cards nor Coming Soon state appeared');
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

  /** Opens the first live giveaway's competition page — does not submit the form. */
  async openFirstGiveawayRegistration(): Promise<void> {
    await expect(this.firstCard).toBeVisible({ timeout: 20_000 });
    await expect(this.entryCta).toBeVisible();
    await this.entryCta.click();
    await expect(this.page).toHaveURL(/\/giveaways\/.+/);
    await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});
    await this.registrationSubmitBtn.scrollIntoViewIfNeeded();
  }

  async getCardCount(): Promise<number> {
    return this.giveawayCards.count();
  }

  sectionHeading(text: string | RegExp): Locator {
    return this.page.locator('h2, h3').filter({ hasText: text }).first();
  }
}
