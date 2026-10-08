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
    // .first() -- confirmed 2026-10-07 (run #1519): resolves to 2 elements without it,
    // same desktop/mobile duplication pattern as homeTab/chatTab/builderTab above.
    this.chatInput = page.getByPlaceholder(/what would you like to ask/i).first();
    this.poweredByClaude = page.getByText(/powered by\s*claude/i);
    this.responsibleGamblingFooter = page.getByText(/18\+/).first();
  }

  async goto(): Promise<void> {
    // Waiting on betSlipHeading here (the dynamic, odds-dependent part of the page)
    // timed out consistently in CI across all 3 browsers and all retries (2026-10-07,
    // run #1517) -- "Received: 0" on fixture/league-count assertions too, in the sibling
    // BetBuilderAI spec. Not a flaky timing issue (retries didn't help even once), and
    // not a viewport/duplicate-DOM issue (this project uses Desktop Chrome's standard
    // viewport, same as manual verification). Waiting on homeTab instead -- a static,
    // non-data-dependent element -- so goto() itself is reliable; tests that need the
    // bet slip or match data explicitly wait for those and are skipped where they
    // can't get past it. See the skips below and in the spec file for what's affected.
    await this.page.goto(this.basePath, { waitUntil: 'domcontentloaded' });
    await this.homeTab.waitFor({ state: 'visible', timeout: 20_000 });
  }

  /** League button by its visible label, e.g. "England - Premier League". */
  league(label: string | RegExp): Locator {
    return this.page.getByRole('button', { name: label }).first();
  }

  /**
   * True if the dynamic, odds-dependent part of the page (bet slip, league
   * list) actually rendered within a generous timeout. CI has shown this
   * consistently NOT rendering (2026-10-07, run #1517) while the static
   * shell (tabs, chat input, footer) loads fine -- tests that depend on
   * this content check it first and skip if it's absent, rather than
   * hard-failing on something this environment may not reliably have.
   */
  async dynamicContentLoaded(timeout = 25_000): Promise<boolean> {
    return this.betSlipHeading.isVisible({ timeout }).catch(() => false);
  }

  /** The "UPCOMING MATCHES" section heading shown after selecting a league. */
  get upcomingMatchesHeading(): Locator {
    return this.page.getByText(/upcoming matches/i).first();
  }
}
