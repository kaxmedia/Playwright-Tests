import { type Page, type Locator, expect } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// QuickPicker — Page Object for the "Where Do You Want to Play?" widget that
// appears on geo homepages (PR #TBD).
//
// Live-DOM recon (2026-09-29, /uk, /de, /is, /no) found a Vue component with
// stable, semantic `qp__*` classes — not compiler-generated hashes, not
// Tailwind utilities. These are used as the selector strategy throughout,
// consistent with the framework's preference for verified stable attributes
// over CSS classes (see GeoHomepage.ts). The component also carries a Vue
// scoped-style hash attribute (`data-v-xxxxxxxx`); that hash is NOT used for
// selectors since it can change on any rebuild of the component.
//
// LOCALISATION FINDING (reinforces the GeoHomepage/global-nav "locale-agnostic"
// lesson): group labels and pill text are fully translated per geo —
// "Where / Betting / Slots" on /uk is "wo / Sportwetten / Spielautomaten" on
// /de and "þar sem / ... / Kryptó" on /is (Iceland's 3rd "Where" category is
// Crypto, not Slots). All locators below are therefore POSITIONAL (nth group,
// nth pill) rather than text-based. Never match a pill by its English label.
//
// STRUCTURAL VARIANCE ACROSS GEOS (same class, verified live):
//   - "Where" pill count: 3 on every geo checked.
//   - "Deposit" pill count: 3 on every geo checked (currency/amount localised,
//     e.g. "£10+", "€10+", "Kr;100+" — the Norway string has an odd
//     semicolon-for-space artifact worth a separate content-bug ticket, not
//     something this suite should encode as "expected").
//   - "Type" pill count VARIES: 2 on /uk (Casino, £10+ deposit), 3 on the same
//     /uk page after switching to Betting, and only 1 on /is. This is
//     data-driven (computed from which offers currently match the active
//     Where+Deposit combination), not a fixed per-geo constant. Tests must
//     assert a floor (>= 1), never an exact count.
//   - Total offer card count also varies by geo (10–15 seen) — carousel, not
//     all rendered at once on screen.
//
// AFFILIATE-SAFETY RULE (Engineering Decisions page): the "Play Now" button
// (`.qp__cta`) is a live affiliate exit-page link on production
// gambling.com. Per the framework-wide rule, THIS PAGE OBJECT NEVER CLICKS
// IT — only visibility/href/target/rel are asserted. Reset, pagination
// arrows, and filter pills are safe to click (internal client-side state,
// no navigation, no affiliate ping).
// ─────────────────────────────────────────────────────────────────────────────
export class QuickPicker {
  readonly page: Page;

  // Root wrapper — the common parent of the filters column and the offers
  // column. There is no dedicated wrapper class; `:has()` scoping is the most
  // stable way to grab it without depending on Tailwind utility classes.
  readonly root: Locator;

  // Heading ("Where Do You Want to Play?" / localised equivalent) + subheader
  // ("Great Offers Just 3 Clicks Away…").
  readonly heading: Locator;
  readonly subheader: Locator;

  // Filter rail — 3 groups in DOM order: Where, Deposit, Type.
  readonly filters: Locator;
  readonly groups: Locator;

  // Reset — TWO elements exist in the DOM (desktop + mobile layout variants).
  // `:visible` picks whichever one the current viewport is actually showing,
  // matching the same pattern GeoHomepage uses for the responsive logo.
  readonly resetButton: Locator;

  // Offers column — carousel of operator cards + pagination + "See all".
  readonly offers: Locator;
  /** Horizontal scroll track that holds the offer cards (`overflow-x: auto`). */
  readonly track: Locator;
  readonly cards: Locator;
  readonly prevArrow: Locator;
  readonly nextArrow: Locator;
  readonly seeAllLink: Locator;
  readonly disclaimer: Locator;

  constructor(page: Page) {
    this.page = page;

    this.root = page.locator('div:has(> .qp__filters):has(> .qp__offers)').first();
    this.heading = this.root.getByRole('heading').first();
    this.subheader = this.root.locator('.qp__subheader');

    this.filters = this.root.locator('.qp__filters');
    this.groups = this.filters.locator('.qp__group');

    this.resetButton = this.root.locator('.qp__reset:visible').first();

    this.offers = this.root.locator('.qp__offers');
    this.track = this.offers.locator('ul.qp__track').first();
    this.cards = this.offers.locator('.qp__card');
    this.prevArrow = this.offers.locator('.qp__arrow--prev');
    this.nextArrow = this.offers.locator('.qp__arrow--next');
    this.seeAllLink = this.offers.locator('.qp__seeall');
    this.disclaimer = this.offers.locator('.qp__disclaimer');
  }

  // Returns the number of filter groups actually rendered (expected 3: Where,
  // Deposit, Type — but read live rather than hard-coded, per the framework's
  // "test what's live" principle).
  async groupCount(): Promise<number> {
    return this.groups.count();
  }

  // Pills within the nth group (0 = Where, 1 = Deposit, 2 = Type).
  pillsInGroup(groupIndex: number): Locator {
    return this.groups.nth(groupIndex).locator('.qp__pill');
  }

  // The group's visible label element (e.g. "Where :" / "wo :").
  groupLabel(groupIndex: number): Locator {
    return this.groups.nth(groupIndex).locator('.qp__group-label');
  }

  // Index of the currently-active pill within the nth group, or -1 if none.
  // (There should always be exactly one — callers assert that separately.)
  async activePillIndex(groupIndex: number): Promise<number> {
    const pills = this.pillsInGroup(groupIndex);
    const count = await pills.count();
    for (let i = 0; i < count; i++) {
      const classAttr = (await pills.nth(i).getAttribute('class')) ?? '';
      if (classAttr.includes('qp__pill--active')) return i;
    }
    return -1;
  }

  // Snapshot of the active pill index per group — used to assert Reset
  // restores the exact state the widget loaded with, without hard-coding
  // which pill "default" means (that's a content decision, not a test one).
  async snapshotActivePills(): Promise<number[]> {
    const count = await this.groupCount();
    const snapshot: number[] = [];
    for (let i = 0; i < count; i++) snapshot.push(await this.activePillIndex(i));
    return snapshot;
  }

  // Clicks the nth pill in the given group and waits for the offer list to
  // re-render (first card's CTA data-product-type is the most reliable
  // signal the Vue component has finished reacting — text content alone can
  // legitimately repeat across categories).
  async selectPill(groupIndex: number, pillIndex: number): Promise<void> {
    const pill = this.pillsInGroup(groupIndex).nth(pillIndex);
    const firstCta = this.cards.first().locator('.qp__cta');
    const before = await firstCta.getAttribute('data-product-type').catch(() => null);
    // force: age-gate / cookie remnants can intercept the centre of the pill
    // even after dismissal attempts (seen on /es and /nl → 60s click timeouts).
    await pill.click({ force: true });
    // Poll briefly for the first card's CTA attribute to change. Some clicks
    // legitimately don't change it (e.g. re-selecting the same category), so
    // this never hard-fails — callers assert the actual behaviour they care
    // about. This just gives the Vue re-render a chance to settle before the
    // caller reads state.
    await this.page
      .waitForFunction(
        ([selector, prevValue]) => {
          const el = document.querySelector(selector);
          return !!el && el.getAttribute('data-product-type') !== prevValue;
        },
        [ '.qp__card .qp__cta', before ] as [string, string | null],
        { timeout: 3000 }
      )
      .catch(() => {});
  }

  /**
   * Wait until the Vue quick-picker has hydrated enough to assert against.
   * Root/heading can paint before `.qp__group` pills get their active classes —
   * without this, snapshots race and return `[]` / 0 active pills.
   */
  async waitForReady(timeout = 15_000): Promise<void> {
    await this.root.waitFor({ state: 'visible', timeout });
    await this.groups.first().waitFor({ state: 'attached', timeout });
    await this.page.waitForFunction(
      () => {
        const filters = document.querySelector('.qp__filters');
        if (!filters) return false;
        if (filters.querySelectorAll('.qp__group').length < 1) return false;
        return !!filters.querySelector('.qp__pill--active');
      },
      { timeout }
    );
  }

  // Clicks whichever Reset control is currently visible.
  async clickReset(): Promise<void> {
    await this.resetButton.click();
    // Give Vue a beat to restore default pill state after Reset.
    await this.waitForReady(8_000).catch(() => {});
  }

  async clickNext(): Promise<void> {
    await this.nextArrow.click({ force: true });
  }

  async clickPrev(): Promise<void> {
    await this.prevArrow.click({ force: true });
  }

  /** Current horizontal offset of the offer-card track (live-verified via scrollLeft). */
  async trackScrollLeft(): Promise<number> {
    return this.track.evaluate((el) => (el as HTMLElement).scrollLeft);
  }

  /**
   * Clicks Next and waits until the track has scrolled further right.
   * Returns `{ before, after }` so callers can assert the delta.
   */
  async scrollNext(): Promise<{ before: number; after: number }> {
    const before = await this.trackScrollLeft();
    await this.clickNext();
    await expect
      .poll(async () => this.trackScrollLeft(), { timeout: 5_000 })
      .toBeGreaterThan(before + 20);
    return { before, after: await this.trackScrollLeft() };
  }

  /**
   * Clicks Prev and waits until the track has scrolled further left.
   * Returns `{ before, after }` so callers can assert the delta.
   */
  async scrollPrev(): Promise<{ before: number; after: number }> {
    const before = await this.trackScrollLeft();
    await this.clickPrev();
    await expect
      .poll(async () => this.trackScrollLeft(), { timeout: 5_000 })
      .toBeLessThan(before - 20);
    return { before, after: await this.trackScrollLeft() };
  }
}
