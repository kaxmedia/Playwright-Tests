// ─────────────────────────────────────────────────────────────────────────────
// Geo-parameterised Quick Picker tests — "Where Do You Want to Play?" widget
//
// Reuses the existing geoHomepages config (pages/GeoHomepage.ts) rather than
// introducing a new config array — the widget lives on the same 26 geo
// homepages already covered by geo-homepage.spec.ts / global-nav.spec.ts.
//
// Covers, per Shane's request: the component renders, the filter groups
// (Where / Deposit / Type) work, Reset works, and the Play Now buttons are
// well-formed — WITHOUT ever clicking a Play Now button (affiliate-safety
// rule; see Engineering Decisions page and QuickPicker.ts).
//
// See pages/QuickPicker.ts for the live-DOM recon notes this suite is built
// on, including the localisation and structural-variance findings (group
// labels and pill text are translated per geo; the "Type" group's pill count
// is data-driven and can be as low as 1, e.g. on /is — and "Where" can also
// be a single option, e.g. Betting-only on /au).
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../fixtures/test';
import { acceptCookiesIfShown } from '../fixtures/acceptCookies';
import { GeoHomepage, geoHomepages } from '../pages/GeoHomepage';
import { QuickPicker } from '../pages/QuickPicker';
import { AgeVerificationPage, type GeoKey } from '../pages/AgeVerificationPage';

// Filter-group indices, by DOM order (verified live on /uk, /de, /is, /no —
// order is consistent even though the labels and pill text are localised).
const WHERE = 0;
const DEPOSIT = 1;
const TYPE = 2;

// "Cap loops over dynamic content at 10 iterations" — framework convention
// (Engineering Decisions page). The carousel renders 10-15 cards per geo;
// checking the first 10 gives meaningful coverage without the overhead.
const MAX_CARDS_TO_CHECK = 10;

/** Paths that serve the micromodal age gate before the page is interactive. */
const AGE_GATE_BY_PATH: Record<string, GeoKey> = {
  '/nl': 'nl',
  '/es': 'es',
};

for (const config of geoHomepages) {
  test.describe(`Quick Picker — ${config.name} geo`, () => {
    test.skip(!!config.geoRestricted, `${config.name} is geo-restricted — quick picker suite requires a local VPN`);

    let gh: GeoHomepage;
    let qp: QuickPicker;

    test.beforeEach(async ({ page }) => {
      gh = new GeoHomepage(page);
      qp = new QuickPicker(page);
      await gh.goto(config.path);
      await acceptCookiesIfShown(page);

      const ageKey = AGE_GATE_BY_PATH[config.path];
      if (ageKey) {
        const age = new AgeVerificationPage(page, ageKey);
        if (await age.modal.isVisible().catch(() => false)) {
          await age.acceptAge();
          await age.modal.waitFor({ state: 'hidden', timeout: 8_000 }).catch(() => {});
        }
      }

      await qp.waitForReady();
    });

    // T1 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression quick picker is visible`, async () => {
      await expect(qp.root).toBeVisible();
      await expect(qp.heading).toBeVisible();
      expect((await qp.heading.innerText()).trim().length).toBeGreaterThan(0);
      await expect(qp.offers).toBeVisible();
    });

    // T2 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression renders Where, Deposit and Type filter groups`, async () => {
      expect(await qp.groupCount()).toBe(3);
      // Pill counts are data-driven per geo / active combination:
      //   - Where: usually 3, but can be 1 (e.g. Betting-only /au)
      //   - Deposit: usually 3
      //   - Type: often 1–3 (e.g. single "Recommended" on /us, /is)
      // Assert a floor of >= 1 for every group; never an exact count.
      expect(await qp.pillsInGroup(WHERE).count()).toBeGreaterThanOrEqual(1);
      expect(await qp.pillsInGroup(DEPOSIT).count()).toBeGreaterThanOrEqual(1);
      expect(await qp.pillsInGroup(TYPE).count()).toBeGreaterThanOrEqual(1);
      for (const group of [WHERE, DEPOSIT, TYPE]) {
        await expect(qp.groupLabel(group)).toBeVisible();
      }
    });

    // T3 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression exactly one pill is active per group on load`, async () => {
      for (const group of [WHERE, DEPOSIT, TYPE]) {
        const pills = qp.pillsInGroup(group);
        const count = await pills.count();
        let activeCount = 0;
        for (let i = 0; i < count; i++) {
          const classAttr = (await pills.nth(i).getAttribute('class')) ?? '';
          if (classAttr.includes('qp__pill--active')) activeCount++;
        }
        expect(activeCount, `group ${group} should have exactly one active pill`).toBe(1);
      }
    });

    // T4-T6 ─ @smoke ──────────────────────────────────────────────────────────
    // Filter groups work: clicking a non-active pill makes it the active one.
    // Only meaningful where a group offers a second option to switch to —
    // skipped (not failed) where it doesn't, e.g. Type on /is (1 pill).
    for (const [group, label] of [[WHERE, 'Where'], [DEPOSIT, 'Deposit'], [TYPE, 'Type']] as const) {
      test(`${config.name} — @smoke @regression ${label} filter pill switches on click`, async () => {
        const pillCount = await qp.pillsInGroup(group).count();
        test.skip(pillCount < 2, `${config.name} ${label} group has only ${pillCount} pill(s) — nothing to switch to`);

        const before = await qp.activePillIndex(group);
        const target = before === 0 ? 1 : 0;
        await qp.selectPill(group, target);
        const after = await qp.activePillIndex(group);

        expect(after, `${label} pill ${target} should become active`).toBe(target);
        expect(after).not.toBe(before);
      });
    }

    // T7 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression Reset restores the pills the widget loaded with`, async () => {
      const initial = await qp.snapshotActivePills();
      expect(initial.length, 'widget should expose filter groups before Reset exercise').toBeGreaterThan(0);

      // Change every group that has a second option, so Reset has something
      // to actually undo.
      for (const group of [WHERE, DEPOSIT, TYPE]) {
        const pillCount = await qp.pillsInGroup(group).count();
        if (pillCount < 2) continue;
        const current = await qp.activePillIndex(group);
        await qp.selectPill(group, current === 0 ? 1 : 0);
      }

      await qp.clickReset();
      const afterReset = await qp.snapshotActivePills();

      // Type (and sometimes Deposit) pill *lists* remount when Where changes, so
      // compare only the shared prefix of group indices that still exist.
      const len = Math.min(initial.length, afterReset.length);
      expect(
        afterReset.slice(0, len),
        'Reset should restore the pills active on initial load',
      ).toEqual(initial.slice(0, len));
    });

    // T8 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression pagination: prev disabled, next advances the carousel`, async () => {
      const cardCount = await qp.cards.count();
      test.skip(cardCount < 1, `${config.name} quick picker rendered no offer cards`);
      // Fewer than ~4 offers means everything already fits on screen — next
      // legitimately has nothing ahead of it either. Documented, not asserted
      // as broken (mirrors the geoRestricted / skipNavTriggerCheck pattern).
      test.skip(cardCount <= 4, `${config.name} has only ${cardCount} offer(s) — nothing to page through`);

      // On first load the carousel is at the start — prev has nothing behind it.
      await expect(qp.prevArrow).toBeDisabled();
      await expect(qp.nextArrow).toBeEnabled();
      const startScroll = await qp.trackScrollLeft();

      // Next scrolls the track further right (cards move left-to-right through the viewport).
      const afterNext = await qp.scrollNext();
      expect(afterNext.after, 'Next should increase track scrollLeft').toBeGreaterThan(startScroll + 20);
      await expect(qp.prevArrow).toBeEnabled();

      // Prev scrolls back toward the start and re-disables when we reach it.
      const afterPrev = await qp.scrollPrev();
      expect(afterPrev.after, 'Prev should decrease track scrollLeft').toBeLessThan(afterNext.after - 20);
      await expect(qp.prevArrow).toBeDisabled();
      expect(
        Math.abs((await qp.trackScrollLeft()) - startScroll),
        'Prev should return near the starting scroll offset',
      ).toBeLessThan(30);
    });

    // T9 ─ @smoke ─────────────────────────────────────────────────────────────
    // Affiliate-safety rule: assert the Play Now CTA is visible and
    // well-formed — NEVER click it. See QuickPicker.ts header comment.
    test(`${config.name} — @smoke @regression Play Now buttons are visible, well-formed exit links`, async () => {
      const cardCount = Math.min(await qp.cards.count(), MAX_CARDS_TO_CHECK);
      expect(cardCount, `${config.name} quick picker rendered no offer cards`).toBeGreaterThan(0);

      for (let i = 0; i < cardCount; i++) {
        const card = qp.cards.nth(i);
        const cta = card.locator('.qp__cta');

        // Off-carousel slides may be in the DOM but obscured — bring into view
        // before asserting visibility (does not click the affiliate CTA).
        await cta.scrollIntoViewIfNeeded().catch(() => {});
        await expect(cta, `card ${i} Play Now button should be visible`).toBeVisible();

        const href = await cta.getAttribute('href');
        expect(href, `card ${i} Play Now href`).toMatch(/^\/go\//);

        expect(await cta.getAttribute('target'), `card ${i} Play Now target`).toBe('_blank');

        const rel = (await cta.getAttribute('rel')) ?? '';
        expect(rel, `card ${i} Play Now rel`).toContain('nofollow');
        expect(rel, `card ${i} Play Now rel`).toContain('sponsored');

        // Review / T&Cs link is content-optional — some operators ship without
        // a review page (live on /in, /dk, /ro, /nz, /is, …). Assert shape only
        // when the link is present.
        const review = card.locator('.qp__review');
        if ((await review.count()) > 0) {
          await expect(review, `card ${i} review link should be visible`).toBeVisible();
          const reviewHref = await review.getAttribute('href');
          expect(reviewHref, `card ${i} review href`).toMatch(/^\//);
        }
      }
    });

    // T10 ─ @smoke ────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression "See all offers" link is well-formed`, async () => {
      // Iceland (/is, /is/en) currently ships the widget without a See-all link.
      test.skip(
        (await qp.seeAllLink.count()) === 0,
        `${config.name} quick picker has no "See all offers" link`,
      );
      await expect(qp.seeAllLink).toBeVisible();
      const href = await qp.seeAllLink.getAttribute('href');
      expect(href, 'See all offers href').toMatch(/^\//);
    });

  });
}
