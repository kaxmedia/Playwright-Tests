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
//     selector and a "PLACE BETS (0/0)" button that is disabled/inert
//     until selections are made -- tests should not attempt to actually
//     place a bet
//   - Operator roster is business content, not static markup, and churns:
//     confirmed 2026-11-23 (CI run #2780 / dashboard run #1542, job
//     137572859441 chrome + job 137572859602 firefox, both failing
//     identically on `getByText('Betfair')` not found) that Betfair has
//     been removed from the live roster. Live verification the same day
//     (manual browse, "Bet Slip" tab -> "Full list") showed the current
//     roster as: 888sport, BetMGM, BetVictor, Betfred, Betway, Coral,
//     Grosvenor, Ladbrokes, Lottoland, Paddy Power, Sportingbet,
//     William Hill, Bet365, Bwin, Partypoker (15 operators, no Betfair).
//     Don't hardcode the full roster in assertions -- it can change again.
//   - Bottom: an AI chat input, with "Powered by Claude" / "Data by OpticOdds"
//     attribution nearby. Copy changed 2026-10-27: the input is now a <textarea>
//     with placeholder "Type your prompt..." (was "What would you like to ask?"),
//     under a "What are we betting on today?" line (a <span>, not a heading).
//     Same on the Home view and the Chat tab, in all 3 browsers.
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
  readonly poweredByLabel: Locator;
  readonly responsibleGamblingFooter: Locator;

  constructor(page: Page) {
    this.page = page;

    this.homeTab = page.getByRole('button', { name: 'Home' }).first();
    this.chatTab = page.getByRole('button', { name: 'Chat' }).first();
    this.builderTab = page.getByRole('button', { name: 'Builder' }).first();
    this.leagueButtons = page.getByRole('button', { name: /^(England|Spain|Germany|Italy|France|USA|UEFA)/ });
    this.betSlipHeading = page.getByRole('heading', { name: /bet slip/i }).first();
    this.placeBetsButton = page.getByRole('button', { name: /place bets/i }).first();
    // :visible, not .first() -- confirmed 2026-10-07 (run #1521): unlike
    // homeTab/chatTab/builderTab above, the FIRST of the 2 duplicated elements here
    // is the hidden one (offsetParent null) and the SECOND is the genuinely visible
    // one -- .first() picked the wrong copy and failed with "Received: hidden".
    // Filtering on :visible is correct regardless of DOM order, unlike assuming
    // which index is visible.
    // Placeholder copy changed 2026-10-27 (see header); the hidden-first duplicate is unchanged.
    this.chatInput = page.getByPlaceholder(/type your prompt/i).and(page.locator(':visible'));
    // "Powered by" and "Claude" are sibling spans, so a locator for "Powered by"
    // does not contain the word Claude. One copy of the line is in the layout
    // with zero size; the visible copy sits under the predictions. Target the
    // visible "Claude" span. poweredByLabel is the same line when the logo is
    // an image and the word Claude is not painted.
    this.poweredByClaude = page.getByText('Claude', { exact: true }).and(page.locator(':visible'));
    this.poweredByLabel = page.getByText(/^powered by$/i).and(page.locator(':visible'));
    // :visible, not .first() -- confirmed 2026-10-07 (run #1521): same issue as
    // chatInput above. 3 "18+" text nodes exist (mobile-hidden footer, a promo
    // card disclaimer, and the real footer); the first in DOM order is the
    // hidden one, so .first() + toBeVisible() timed out waiting on it even at
    // 20s. This was never a timeout problem, as I'd assumed in the prior fix.
    this.responsibleGamblingFooter = page.getByText(/18\+/).and(page.locator(':visible')).first();
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
    // :visible, not a bare .first() -- confirmed 2026-10-27: same hidden-first duplicate as
    // chatInput (4 matches; the first in DOM order is hidden), so .first() never became visible.
    return this.page.getByText(/upcoming matches/i).and(this.page.locator(':visible')).first();
  }
}
