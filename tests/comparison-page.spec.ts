import { test, expect } from '../fixtures/test';
import { ComparisonPage, comparisonPages } from '../pages/ComparisonPage';
import { FirstPartyPageGuards, unexpectedPageErrors, unexpectedConsoleErrors } from './helpers/firstPartyPageGuards';
import { blockVwoExperiments } from './helpers/vwo';

// Keep every test in this file out of VWO A/B experiments so operator-card counts
// are deterministic (control page, not a reduced-card variant). See helpers/vwo.ts.
test.beforeEach(async ({ page }) => {
  await blockVwoExperiments(page);
});

// Parameterised suite — one describe block per entry in comparisonPages.
// To add a new geo or category: add an entry to comparisonPages in
// pages/ComparisonPage.ts — no changes needed here.

for (const config of comparisonPages) {
  test.describe(config.name, () => {

    // ── Universal tests (T1–T8) ───────────────────────────────────────────────
    // These run against every entry in the array — no conditional skipping.

    // T1 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression page loads with HTTP 200 and non-empty title`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      const response = await cp.goto(config.url);
      expect(response?.status()).toBeLessThan(400);
      expect(await page.title()).toBeTruthy();
    });

    // T2 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression comparison list of operator cards is visible`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      await expect(cp.cards.first()).toBeVisible();
    });

    // T3 ─ @smoke ─────────────────────────────────────────────────────────────
    // US Casino SKIPPED in CI — CI environment limitation, not a site regression.
    // The CI runner's IP is geo-classified into an operator-list region that server-renders
    // only 2–3 operators for /us/online-casinos, vs the full list (18) a UK/IE visitor sees.
    // CONFIRMED root cause: IP-based geo-classification, keyed on the op_list_region_*
    // cookies (op_list_region_us / op_list_region_ie). The list is server-rendered per
    // region — not a client XHR — so this is the same op-list personalization family as
    // PR #109's bonus-offers skip. Unrelated to VWO (already blocked in beforeEach — ruled
    // out, same as PR #109).
    //
    // BACKLOG — DESIGN-LEVEL, not just "unblock CI": the correct long-term fix is to make
    // this assertion GEO-AWARE — assert the operator count that matches the region the page
    // was actually served for — rather than a permanent skip. Re-enable once either the test
    // is made geo-aware, or CI personalization/geo exclusion is sorted with the site team.
    test(`${config.name} — @smoke @regression at least ${config.expectedCardCountMin} operator cards rendered`, async ({ page }) => {
      test.skip(config.name === 'US Casino', 'US Casino: CI runner IP is geo-classified into a reduced operator-list region (2–3 cards vs 18 for a UK/IE visitor), server-rendered per region via the op_list_region_* cookies — a CI/IP-geo limitation, not a site regression, and unrelated to VWO. Same op-list personalization family as PR #109. BACKLOG (design-level, not just unblock-CI): the correct long-term fix is a GEO-AWARE assertion (assert the count matching the served region), not a permanent skip. Re-enable once the test is made geo-aware or CI geo exclusion is sorted with the site team.');
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      if (config.hasOplistPagination) {
        await cp.expandOplistToMinimum(config.expectedCardCountMin);
      }
      expect(await cp.cards.count()).toBeGreaterThanOrEqual(config.expectedCardCountMin);
    });

    // T4 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression first 5 cards each have logo, CTA link, and operator name`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      for (let i = 0; i < 5; i++) {
        const card = cp.nthCard(i);
        await expect(cp.logoImg(card)).toBeVisible();
        expect(await cp.ctaLink(card).getAttribute('href')).toMatch(/\/go\//);
        expect(await cp.operatorName(card)).toBeTruthy();
      }
    });

    // T5 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression all CTA links match the /go/ affiliate pattern`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      const count = await cp.cards.count();
      for (let i = 0; i < count; i++) {
        const href = await cp.ctaLink(cp.nthCard(i)).getAttribute('href');
        expect(href).toMatch(/^\/go\//);
      }
    });

    // T6 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke @regression first 10 cards each have product-type, position, and offer attributes`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      const limit = Math.min(10, await cp.cards.count());
      for (let i = 0; i < limit; i++) {
        const card = cp.nthCard(i);
        expect(await cp.productType(card)).toBeTruthy();
        expect(await cp.position(card)).toBeTruthy();
        expect(await cp.offerText(card)).toBeTruthy();
      }
    });

    // T7 ─ @regression ────────────────────────────────────────────────────────
    // Comparison pages use lazy-loaded images for performance. Off-screen logos
    // are intentionally not decoded until viewport-visible. We assert the first
    // card's logo loads as a smoke check; per-operator logo coverage belongs in
    // a separate visual regression test.
    test(`${config.name} — @regression first operator logo loads successfully`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      const img = cp.logoImg(cp.nthCard(0));
      await img.scrollIntoViewIfNeeded();
      const loaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
      expect(loaded).toBe(true);
    });

    // T8 ─ @regression ────────────────────────────────────────────────────────
    // Console: only `pageerror` and `console.error` attributed to a gambling.com script URL
    // (third-party CMP noise such as CookieYes CORS is ignored). Network: first-party failures only;
    // Cloudflare RUM beacons (/cdn-cgi/rum) are excluded as they fail transiently without affecting UX.
    test(`${config.name} — @regression no console errors and no failed first-party network requests`, async ({ page }) => {
      const guards = new FirstPartyPageGuards(page);
      const failedRequests: string[] = [];

      page.on('requestfailed', req => failedRequests.push(req.url()));

      try {
        const cp = new ComparisonPage(page);
        await cp.goto(config.url);

        const criticalNetwork = failedRequests.filter(url => {
          try {
            const host = new URL(url).hostname.replace(/^www\./, '');
            if (host !== 'gambling.com') return false;
            if (url.includes('/cdn-cgi/rum')) return false;
            return true;
          } catch {
            return false;
          }
        });

        const allowlistIds = config.knownPageErrorIds ?? [];
        const consoleAllowlistIds = config.knownConsoleErrorIds ?? [];
        const uncaughtPageErrors = unexpectedPageErrors(guards.pageErrors, allowlistIds);
        const uncaughtConsoleErrors = unexpectedConsoleErrors(
          guards.firstPartyConsoleErrors,
          consoleAllowlistIds,
        );
        if (guards.pageErrors.length > uncaughtPageErrors.length) {
          test.info().annotations.push({
            type: 'known-issue',
            description: `Suppressed ${guards.pageErrors.length - uncaughtPageErrors.length} tracked pageerror(s): ${allowlistIds.join(', ')}`,
          });
        }
        if (guards.firstPartyConsoleErrors.length > uncaughtConsoleErrors.length) {
          test.info().annotations.push({
            type: 'known-issue',
            description: `Suppressed ${guards.firstPartyConsoleErrors.length - uncaughtConsoleErrors.length} tracked console error(s): ${consoleAllowlistIds.join(', ')}`,
          });
        }
        expect(
          uncaughtPageErrors,
          'Unexpected uncaught page errors (known bugs filtered via config.knownPageErrorIds)',
        ).toEqual([]);
        expect(
          uncaughtConsoleErrors,
          'Unexpected first-party console errors (known bugs filtered via config.knownConsoleErrorIds)',
        ).toEqual([]);
        expect(criticalNetwork).toHaveLength(0);
      } finally {
        guards.detach();
      }
    });

    // ── Conditional tests (T9–T11) ────────────────────────────────────────────
    // These skip automatically for geos where the feature is absent.

    // T9 ─ @smoke ─ skip when hasRating: false or hasLazyRating: true ─────────
    // Reads rating from the hidden more-info-table DOM without expanding —
    // works only on pages where the panel is server-rendered (Global Casino,
    // UK Casino). Lazy-rendered pages (GR, UK Sports, US, IE) do not have the
    // panel in the DOM until the toggle is clicked; those are skipped here.
    //
    // TODO: Lazy-rendered rating — full coverage requires click-to-expand.
    // Deferred to follow-up PR (PR #9 candidate) — would need to integrate
    // cookieBanner fixture and add expand interaction. Document in PR
    // description as known coverage gap.
    test(`${config.name} — @smoke @regression rating value is numeric and within range 0–10`, async ({ page }) => {
      test.skip(!config.hasRating, 'No numeric rating on this geo');
      test.skip(!!config.hasLazyRating, 'Rating panel is lazy-rendered — requires click-to-expand (deferred to PR #9)');
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      for (let i = 0; i < 5; i++) {
        const card = cp.nthCard(i);
        const ratingText = await cp.detailAttributeValue(card, config.ratingLabel ?? 'Our Rating').first().textContent();
        const rating = parseFloat((ratingText ?? '').trim());
        expect(rating).toBeGreaterThanOrEqual(0);
        expect(rating).toBeLessThanOrEqual(10);
      }
    });

    // T10 ─ @smoke ─ skip when hasBadge: false ────────────────────────────────
    test(`${config.name} — @smoke @regression regulator badge wrapper is present on the page`, async ({ page }) => {
      test.skip(!config.hasBadge, 'No regulator badge on this geo');
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      expect(await page.locator('div.gambling-comission-logo').count()).toBeGreaterThan(0);
    });

    // T11 ─ @smoke ─ universal ────────────────────────────────────────────────
    // Asserts at least one of the first 5 cards carries the expected age limit.
    // Individual operators sometimes substitute verbose bonus T&C copy in
    // span.terms-and-conditions instead of the standard "18+..." line, so a
    // per-card assertion produces false failures on IT and ES.
    test(`${config.name} — @smoke @regression at least one of the first 5 cards contains age limit ${config.ageLimit}`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      const matches: string[] = [];
      for (let i = 0; i < 5; i++) {
        const text = (await cp.termsText(cp.nthCard(i)).textContent()) ?? '';
        if (text.includes(config.ageLimit)) matches.push(text);
      }
      expect(matches.length).toBeGreaterThan(0);
    });

  });
}
