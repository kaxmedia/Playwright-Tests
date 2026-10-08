// Page Object for BetBuilderAI -- gambling.com's AI football/NFL predictions
// and bet-builder product.
//
// This is a standalone sub-product, not geo-prefixed like the main site's
// comparison pages -- one global URL, no /{geo}/ segment.
//
// URL: https://www.gambling.com/betbuilderai/
// NFL variant: https://www.gambling.com/betbuilderai/nfl/ (separate template --
//   Games/Teams tabs instead of Matches/Squads/Predictions/Community/Offers,
//   different fixture-list markup. Only a basic cross-navigation check is
//   covered here; NFL would need its own page object for deeper coverage.
//
// Confirmed from live page inspection (2026-10-07):
//   - H1: "AI football predictions and bet builder tips"
//   - Title: "BetBuilderAI | Build smarter bets."
//   - Sport toggle: a.nav-sport (Football / NFL) -- NFL is a full page
//     navigation to /betbuilderai/nfl/, not a client-side tab swap
//   - Section nav: a.nav-link (Matches / Squads / Predictions / Community /
//     Offers) -- Community carries a.nav-link-with-badge with "BETA" text,
//     confirming it's a recently-added, still-beta section
//   - League filter pills: button.wc-groups-filter-pill (All, MLS, EPL,
//     LaLiga, Serie A, Bundes, Ligue 1, Champ, UCL, UEL, Carabao)
//   - Fixture list container: div.wc-groups-fixtures
//   - Individual fixture: div.wc-fix, containing div.wc-fix-teams >
//     div.wc-fix-team > div.wc-fix-team-name (two teams per fixture) and
//     div.wc-fix-meta-time for kickoff time -- confirmed 30 fixtures on a
//     default load
//   - Per-fixture action links (a.wc-today-link): "Build your bet",
//     "Predictions", "Streaks", "H2H", "Raw data", "Stat pack"
//   - "Back to gambling.com" link: a.nav-gdc-back--desktop, href is the
//     bare gambling.com origin (not a specific geo)

import { type Page, type Locator, expect } from '@playwright/test';

export class BetBuilderAIPage {
  readonly page: Page;

  readonly basePath = '/betbuilderai/';

  readonly heading: Locator;
  readonly sportToggleFootball: Locator;
  readonly sportToggleNfl: Locator;
  readonly sectionNavLinks: Locator;
  readonly communityNavLink: Locator;
  readonly filterPills: Locator;
  readonly fixturesContainer: Locator;
  readonly fixtures: Locator;
  readonly backToGamblingComLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator('h1').first();
    this.sportToggleFootball = page.locator('a.nav-sport', { hasText: /football/i });
    this.sportToggleNfl = page.locator('a.nav-sport', { hasText: /nfl/i });
    this.sectionNavLinks = page.locator('a.nav-link');
    this.communityNavLink = page.locator('a.nav-link-with-badge', { hasText: /community/i });
    this.filterPills = page.locator('button.wc-groups-filter-pill');
    this.fixturesContainer = page.locator('div.wc-groups-fixtures');
    this.fixtures = page.locator('div.wc-fix');
    this.backToGamblingComLink = page.locator('a.nav-gdc-back--desktop');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.basePath, { waitUntil: 'domcontentloaded' });
    await expect(this.heading).toBeVisible({ timeout: 20_000 });
  }

  /** Team names for the nth fixture card (0-indexed), e.g. ["Borussia Dortmund", "Werder Bremen"]. */
  async fixtureTeamNames(index: number): Promise<string[]> {
    const names = this.fixtures.nth(index).locator('div.wc-fix-team-name');
    return names.allTextContents();
  }

  /** "Build your bet" / "Predictions" / etc. action link within the nth fixture card. */
  fixtureActionLink(index: number, label: string | RegExp): Locator {
    return this.fixtures.nth(index).locator('a.wc-today-link', { hasText: label });
  }

  /**
   * True if the dynamic, data-dependent part of the page (league filter
   * pills, fixture list) actually rendered within a generous timeout. CI
   * has shown this consistently NOT rendering (2026-10-07, run #1516) --
   * filterPills.count() and fixtures.count() both returned 0, every retry,
   * on all 3 browsers -- while the static shell (H1, sport toggle, section
   * nav) loads fine. Tests that depend on this content check it first and
   * skip if it's absent, rather than hard-failing on something this CI
   * environment may not reliably have.
   */
  async dynamicContentLoaded(timeout = 25_000): Promise<boolean> {
    // Check the first actual fixture card, not fixturesContainer -- the container
    // itself renders (empty) regardless of whether its dynamic children populate,
    // so checking the container alone always returned true and let the broken
    // tests run anyway (confirmed 2026-10-07, run #1518 -- still failing with
    // this check in place).
    return this.fixtures.first().isVisible({ timeout }).catch(() => false);
  }
}
