// Page Object for Bet Creator -- gambling.com's AI chat-based accumulator /
// bet builder product ("Powered by Claude", odds data from OpticOdds).
//
// This is a standalone sub-product, not geo-prefixed like the main site's
// comparison pages -- one global URL, no /{geo}/ segment. It is a React SPA:
// CSS classes are hashed/auto-generated (e.g. "css-11aywtz"), so locators
// here are text- and role-based rather than class-based, for stability.
//
// URL: https://www.gambling.com/bet-creator/
//
// Confirmed from live page inspection (2026-10-07):
//   - No H1; document.title is "AI Accumulator & Bet Builder | Gambling.com"
//   - Top tab bar: Home / Chat / Builder (buttons, exact text match --
//     duplicated in the DOM for desktop/mobile layouts, so locators should
//     use .first())
//   - Left rail: a league list (e.g. "England - Premier League",
//     "Spain - La Liga", ...); clicking a league is client-side (no URL
//     change) and reveals an "UPCOMING MATCHES" section with match cards
//     showing both teams, kickoff time, and 1/X/2 odds buttons, plus a
//     "More bets" expand link per card
//   - Right rail: "BET SLIP" with a horizontally-scrollable operator
//     selector (BetMGM, Betfair, Paddy Power, Bet365, Bwin) and a
//     "PLACE BETS (0/0)" button that is disabled/inert until selections
//     are made -- tests should not attempt to actually place a bet
//   - Bottom: an AI chat input, placeholder "What would you like to ask?",
//     with "Powered by Claude" / "Data by OpticOdds" attribution nearby
//   - Responsible-gambling footer: "18+", BeGambleAware, GamStop links

import { type Page, type Locator } from '@playwright/test';

export class BetCreatorPage {
  readonly page: Page;

  readonly basePath = '/bet-creator/';

  readonly homeTab: Locator;
  readonly chatTab: Locator;
  readonly builderTab: Locator;
  readonly leagueButtons: Locator;
  readonly betSlipHeading: Locator;
  readonly placeBetsButton: Locator;
  readonly chatInput: Locator;
  readonly poweredByClaude: Locator;
  readonly responsibleGamblingFooter: Locator;

  constructor(page: Page) {
    this.page = page;

    this.homeTab = page.getByRole('button', { name: 'Home' }).first();
    this.chatTab = page.getByRole('button', { name: 'Chat' }).first();
    this.builderTab = page.getByRole('button', { name: 'Builder' }).first();
    this.leagueButtons = page.getByRole('button', { name: /^(England|Spain|Germany|Italy|France|USA|UEFA)/ });
    this.betSlipHeading = page.getByRole('heading', { name: /bet slip/i }).first();
    this.placeBetsButton = page.getByRole('button', { name: /place bets/i }).first();
    this.chatInput = page.getByPlaceholder(/what would you like to ask/i);
    this.poweredByClaude = page.getByText(/powered by\s*claude/i);
    this.responsibleGamblingFooter = page.getByText(/18\+/).first();
  }

  async goto(): Promise<void> {
    await this.page.goto(this.basePath, { waitUntil: 'domcontentloaded' });
    await this.betSlipHeading.waitFor({ state: 'visible', timeout: 20_000 });
  }

  /** League button by its visible label, e.g. "England - Premier League". */
  league(label: string | RegExp): Locator {
    return this.page.getByRole('button', { name: label }).first();
  }

  /** The "UPCOMING MATCHES" section heading shown after selecting a league. */
  get upcomingMatchesHeading(): Locator {
    return this.page.getByText(/upcoming matches/i).first();
  }
}
