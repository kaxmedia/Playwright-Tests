import { test, expect } from '@playwright/test';
import { ComparisonPage, comparisonPages } from '../pages/ComparisonPage';

// Parameterised suite — one describe block per entry in comparisonPages.
// To add a new geo or category: add an entry to comparisonPages in
// pages/ComparisonPage.ts — no changes needed here.

for (const config of comparisonPages) {
  test.describe(config.name, () => {

    // ── Universal tests (T1–T8) ───────────────────────────────────────────────
    // These run against every entry in the array — no conditional skipping.

    // T1 ─ @smoke ─────────────────────────────────────────────────────────────
    // Navigates independently to capture the HTTP response object.
    // ComparisonPage.goto() returns void, so page.goto() is called directly here.
    test(`${config.name} — @smoke page loads with HTTP 200 and non-empty title`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      const response = await page.goto(config.url, { waitUntil: 'domcontentloaded' });
      await cp.cards.first().waitFor({ state: 'attached' });
      expect(response?.status()).toBeLessThan(400);
      expect(await page.title()).toBeTruthy();
    });

    // T2 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke comparison list of operator cards is visible`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      await expect(cp.cards.first()).toBeVisible();
    });

    // T3 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke at least ${config.expectedCardCountMin} operator cards rendered`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      expect(await cp.cards.count()).toBeGreaterThanOrEqual(config.expectedCardCountMin);
    });

    // T4 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke first 5 cards each have logo, CTA link, and operator name`, async ({ page }) => {
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
    test(`${config.name} — @smoke all CTA links match the /go/ affiliate pattern`, async ({ page }) => {
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      const count = await cp.cards.count();
      for (let i = 0; i < count; i++) {
        const href = await cp.ctaLink(cp.nthCard(i)).getAttribute('href');
        expect(href).toMatch(/^\/go\//);
      }
    });

    // T6 ─ @smoke ─────────────────────────────────────────────────────────────
    test(`${config.name} — @smoke first 10 cards each have product-type, position, and offer attributes`, async ({ page }) => {
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
    // Console errors: known-noisy third-party patterns are filtered out.
    // Network failures: filtered to gambling.com first-party requests only;
    // Cloudflare RUM beacons (/cdn-cgi/rum) are excluded as they fail transiently
    // without affecting page function.
    test(`${config.name} — @regression no console errors and no failed first-party network requests`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('requestfailed', req => failedRequests.push(req.url()));

      const cp = new ComparisonPage(page);
      await cp.goto(config.url);

      const criticalConsole = consoleErrors.filter(e =>
        !/favicon|analytics|comment count|failed to fetch|resizeobserver|permissions-policy|taboola|attestation reporting/i.test(e)
      );

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

      expect(criticalConsole).toHaveLength(0);
      expect(criticalNetwork).toHaveLength(0);
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
    test(`${config.name} — @smoke rating value is numeric and within range 0–10`, async ({ page }) => {
      test.skip(!config.hasRating, 'No numeric rating on this geo');
      test.skip(!!config.hasLazyRating, 'Rating panel is lazy-rendered — requires click-to-expand (deferred to PR #9)');
      const cp = new ComparisonPage(page);
      await cp.goto(config.url);
      for (let i = 0; i < 5; i++) {
        const card = cp.nthCard(i);
        const ratingText = await card.locator('div.more-info-table div.attribute-value').first().textContent();
        const rating = parseFloat((ratingText ?? '').trim());
        expect(rating).toBeGreaterThanOrEqual(0);
        expect(rating).toBeLessThanOrEqual(10);
      }
    });

    // T10 ─ @smoke ─ skip when hasBadge: false ────────────────────────────────
    test(`${config.name} — @smoke regulator badge wrapper is present on the page`, async ({ page }) => {
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
    test(`${config.name} — @smoke at least one of the first 5 cards contains age limit ${config.ageLimit}`, async ({ page }) => {
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
