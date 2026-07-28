import { type Page } from '@playwright/test';
import { test, expect } from '../../fixtures/test';
import { ComparisonPage, type ComparisonPageConfig } from '../../pages/ComparisonPage';

export interface OplistSubPageConfig {
  name: string;
  url: string;
  expectedCardCountMin: number;
}

export interface OplistGeoSuiteOptions {
  /** Prefix for `test.describe` titles, e.g. `Bonus Pages` or `Betting Sites`. */
  suiteLabel: string;
  pages: ComparisonPageConfig[];
  /** Skip the card-count floor assertion (CI personalization). */
  skipCardCount?: boolean | ((config: ComparisonPageConfig) => boolean);
  skipCardCountReason?: string;
  /** Extra setup before `ComparisonPage.goto` (e.g. block VWO). */
  beforeEachExtra?: (page: Page) => Promise<void>;
}

export interface OplistSubPageSuiteOptions {
  suiteLabel: string;
  subPages: OplistSubPageConfig[];
  skipCardCount?: boolean;
  skipCardCountReason?: string;
  beforeEachExtra?: (page: Page) => Promise<void>;
}

/** Escape a string for use inside a RegExp (URL path matching). */
export function escapeForRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const DEFAULT_CARD_COUNT_SKIP =
  'CI datacenter IP receives a reduced personalization variant (2–3 cards) from gdc-oplist-d1-worker-api / adtech-personalisation-api — CI environment limitation, unrelated to VWO. Re-enable once personalization exclusion is sorted with the site team.';

/**
 * Shared T1–T12 oplist coverage used by bonus-offers and betting-sites.
 * Call once per suite file with that file’s configs.
 */
export function registerOplistGeoSuite(options: OplistGeoSuiteOptions): void {
  const {
    suiteLabel,
    pages,
    skipCardCount = false,
    skipCardCountReason = DEFAULT_CARD_COUNT_SKIP,
    beforeEachExtra,
  } = options;

  for (const config of pages) {
    test.describe(`${suiteLabel} — ${config.name}`, () => {
      let oplist: ComparisonPage;

      test.beforeEach(async ({ page }) => {
        if (beforeEachExtra) await beforeEachExtra(page);
        oplist = new ComparisonPage(page);
        await oplist.goto(config.url);
      });

      test('@regression page loads with correct URL', async ({ page }) => {
        await expect(page).toHaveURL(new RegExp(escapeForRegex(config.url)));
      });

      test(`@regression at least ${config.expectedCardCountMin} operator cards are present`, async () => {
        const shouldSkip =
          typeof skipCardCount === 'function' ? skipCardCount(config) : skipCardCount;
        test.skip(shouldSkip, skipCardCountReason);
        const count = await oplist.cards.count();
        expect(
          count,
          `Expected at least ${config.expectedCardCountMin} cards on ${config.name}, got ${count}`,
        ).toBeGreaterThanOrEqual(config.expectedCardCountMin);
      });

      test('@regression first card has operator name and position data attributes', async () => {
        const card = oplist.nthCard(0);
        const operator = await oplist.operatorName(card);
        const position = await oplist.position(card);
        expect(operator, 'data-operator should be non-empty on first card').toBeTruthy();
        expect(position, 'data-position should be non-empty on first card').toBeTruthy();
      });

      test('@regression first card operator logo is attached with a valid src', async () => {
        const card = oplist.nthCard(0);
        const logo = oplist.logoImg(card);
        await expect(logo).toBeAttached();
        const src = await logo.getAttribute('src');
        expect(src?.trim().length, 'Logo src should not be empty').toBeGreaterThan(0);
      });

      test('@regression first card CTA link has a /go/ affiliate href', async () => {
        const card = oplist.nthCard(0);
        const cta = oplist.ctaLink(card);
        await expect(cta).toBeVisible();
        const href = await cta.getAttribute('href');
        expect(href, 'CTA href should be present').toBeTruthy();
        expect(href, 'CTA should point to an affiliate /go/ redirect').toMatch(/\/go\//);
      });

      test('@regression first card CTA opens affiliate redirect in a new tab', async () => {
        const card = oplist.nthCard(0);
        const href = await oplist.ctaLink(card).getAttribute('href');
        expect(href, 'CTA href should point through /go/ before navigation').toMatch(/\/go\//);

        const affiliateTab = await oplist.openCtaAffiliateTab(card);
        await expect
          .poll(() => affiliateTab.url(), { timeout: 20_000 })
          .not.toMatch(/^about:blank$/);

        const affiliateUrl = affiliateTab.url();
        if (affiliateUrl.includes('gambling.com')) {
          expect(affiliateUrl, 'On-site affiliate hops must stay on /go/').toContain('/go/');
        } else {
          expect(affiliateUrl, 'Off-site redirect should be https').toMatch(/^https:\/\//);
        }
        await affiliateTab.close();
      });

      test('@regression first card has offer text', async () => {
        const card = oplist.nthCard(0);
        const offer = await oplist.offerText(card);
        expect(offer?.trim().length, 'data-offer should not be empty').toBeGreaterThan(0);
      });

      test(`@regression first card terms text contains ${config.ageLimit}`, async () => {
        const card = oplist.nthCard(0);
        await expect(oplist.termsText(card)).toContainText(config.ageLimit);
      });

      if (config.hasBadge) {
        test('@regression first card has a regulator badge', async () => {
          const card = oplist.nthCard(0);
          await expect(oplist.regulatorBadge(card)).toBeAttached();
        });
      }

      if (config.hasReviewLink !== false) {
        test('@regression first card review link is present', async ({ page }) => {
          const cardWithReview = oplist.cards
            .filter({ has: page.locator('a.operator-review-link, a[class*="review-link"]') })
            .first();
          await expect(cardWithReview).toBeAttached();
          const reviewLink = oplist.reviewLink(cardWithReview);
          await expect(reviewLink).toBeAttached();
          const href = await reviewLink.getAttribute('href');
          expect(href?.trim().length, 'Review link href should not be empty').toBeGreaterThan(0);
        });
      }

      test('@regression first card rank label is visible', async () => {
        const card = oplist.nthCard(0);
        await expect(oplist.rankLabel(card)).toBeVisible();
      });

      test('@regression top 3 cards have distinct operator names', async () => {
        const count = await oplist.cards.count();
        const checkUpTo = Math.min(count, 3);
        const names: string[] = [];
        for (let i = 0; i < checkUpTo; i++) {
          const card = oplist.nthCard(i);
          const name = await oplist.operatorName(card);
          expect(name, `Card ${i} is missing data-operator`).toBeTruthy();
          expect(names, `Duplicate operator name "${name}" at card ${i}`).not.toContain(name);
          names.push(name!);
        }
      });
    });
  }
}

/** Lightweight smoke for filtered sub-category oplist URLs. */
export function registerOplistSubPageSuite(options: OplistSubPageSuiteOptions): void {
  const {
    suiteLabel,
    subPages,
    skipCardCount = false,
    skipCardCountReason = DEFAULT_CARD_COUNT_SKIP,
    beforeEachExtra,
  } = options;

  for (const subPage of subPages) {
    test.describe(`${suiteLabel} — ${subPage.name}`, () => {
      let oplist: ComparisonPage;

      test.beforeEach(async ({ page }) => {
        if (beforeEachExtra) await beforeEachExtra(page);
        oplist = new ComparisonPage(page);
        await oplist.goto(subPage.url);
      });

      test('@regression page URL is correct', async ({ page }) => {
        await expect(page).toHaveURL(new RegExp(escapeForRegex(subPage.url)));
      });

      test(`@regression at least ${subPage.expectedCardCountMin} operator cards are present`, async () => {
        test.skip(skipCardCount, skipCardCountReason);
        const count = await oplist.cards.count();
        expect(
          count,
          `Expected at least ${subPage.expectedCardCountMin} cards on ${subPage.name}`,
        ).toBeGreaterThanOrEqual(subPage.expectedCardCountMin);
      });

      test('@regression first card CTA has a /go/ affiliate href', async () => {
        const card = oplist.nthCard(0);
        const cta = oplist.ctaLink(card);
        await expect(cta).toBeVisible();
        const href = await cta.getAttribute('href');
        expect(href).toMatch(/\/go\//);
      });

      test('@regression first card has offer text', async () => {
        const card = oplist.nthCard(0);
        const offer = await oplist.offerText(card);
        expect(offer?.trim().length).toBeGreaterThan(0);
      });
    });
  }
}

/** Browser-free parallel HTTP 200 sweep. */
export function registerOplistHttpAudit(
  describeTitle: string,
  urls: { name: string; url: string }[],
): void {
  test.describe(describeTitle, () => {
    test('@regression @audit all page URLs return HTTP 200', async ({ request }) => {
      test.setTimeout(60_000);
      const results = await Promise.all(
        urls.map(async ({ name, url }) => {
          const response = await request.get(url, { timeout: 15_000 });
          return { name, url, status: response.status() };
        }),
      );
      for (const { name, url, status } of results) {
        expect(status, `[${name}] ${url} returned HTTP ${status}`).toBe(200);
      }
    });
  });
}
