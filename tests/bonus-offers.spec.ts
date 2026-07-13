// ─────────────────────────────────────────────────────────────────────────────
// Bonus / Offers Pages — gambling.com
//
// Covers the casino bonus and offer listing pages across key markets. These are
// among the highest-traffic, highest-revenue pages on gambling.com — they drive
// significant affiliate CTA volume from users actively seeking welcome offers.
//
// APPROACH
// Bonus pages use the exact same operator card DOM template as the casino and
// betting comparison pages already covered by comparison-page.spec.ts and
// betting-sites.spec.ts. ComparisonPage.ts is reused wholesale — no new POM.
//
// Two config arrays drive the suite:
//   bonusPages     — main geo/category bonus listing pages (parameterised loop)
//   bonusSubPages  — UK and IE bonus sub-category pages (Free Spins No Deposit, No Deposit)
//
// COVERAGE
//  • Page URL correct, operator cards present, data attributes populated
//  • Operator logos, offer text, age limit, CTA /go/ affiliate href
//  • CTA opens affiliate redirect in new tab (regression)
//  • Regulator badge present where geo requires it (UK GambleAware)
//  • Distinct operator names across top 3 cards (no duplicate rendering)
//  • Sub-pages: load, cards present, CTA href valid, offer text present
//  • HTTP 200 audit — browser-free parallel sweep of all bonus URLs
//
// Run with:
//   npx playwright test tests/bonus-offers.spec.ts --project=chrome
//   npx playwright test tests/bonus-offers.spec.ts --grep @regression
//   npx playwright test tests/bonus-offers.spec.ts --grep @audit
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../fixtures/test';
import { ComparisonPage, type ComparisonPageConfig } from '../pages/ComparisonPage';

// ─────────────────────────────────────────────────────────────────────────────
// Main bonus page config — one entry per geo/URL.
//
// Flags inherited from verified ComparisonPage.ts entries for the same geo
// where available. UK badge confirmed (GambleAware logo visible on bonus pages).
// IE/US badge absent — same as their casino comparison page entries.
// ─────────────────────────────────────────────────────────────────────────────
const bonusPages: ComparisonPageConfig[] = [
    // ── UK Casino Bonuses ─────────────────────────────────────────────────────
    // UK bonus page — same operator card template as /uk/online-casinos.
    // hasBadge: true — GambleAware logo is present on UK bonus pages.
    {
        name: 'UK Casino Bonuses',
        url: 'https://www.gambling.com/uk/online-casinos/bonus',
        category: 'casino',
        expectedCardCountMin: 10,
        hasRating: true,
        hasBadge: true,
        ageLimit: '18+',
        hasLazyRating: true,
    },
    // ── IE Casino Bonuses ─────────────────────────────────────────────────────
    // IE bonus page — same template, no badge (consistent with IE casino page).
    {
        name: 'IE Casino Bonuses',
        url: 'https://www.gambling.com/ie/online-casinos/bonus',
        category: 'casino',
        expectedCardCountMin: 10,
        hasRating: true,
        hasBadge: false,
        ageLimit: '18+',
        hasLazyRating: true,
    },
    // ── US Casino Bonuses ─────────────────────────────────────────────────────
    // US bonus page — 21+ age limit, no badge, consistent with US casino entry.
    {
        name: 'US Casino Bonuses',
        url: 'https://www.gambling.com/us/online-casinos/bonus',
        category: 'casino',
        expectedCardCountMin: 5,
        hasRating: true,
        hasBadge: false,
        ageLimit: '21+',
        hasLazyRating: true,
    },
    // ── CA Casino Bonuses ─────────────────────────────────────────────────────
    // Flags match CA EN Casino in ComparisonPage.ts — provincial age is 19+, no badge.
    // T9 (badge) skipped via hasBadge: false.
    // T10 (review link) intentionally enabled — hasReviewLink omitted (defaults true);
    // a.operator-review-link is present on CA bonus cards (verified Chrome run).
    {
        name: 'CA Casino Bonuses',
        url: 'https://www.gambling.com/ca/online-casinos/bonus',
        category: 'casino',
        expectedCardCountMin: 5,
        hasRating: true,
        hasBadge: false,
        ageLimit: '19+',
        hasLazyRating: true,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Bonus sub-page config — UK and IE bonus type sub-categories.
// These are high-SEO pages with specific bonus types filtered from the main list.
// Tests are deliberately lightweight — full structural coverage is in the
// parameterised loop above.
// ─────────────────────────────────────────────────────────────────────────────
interface BonusSubPageConfig {
    name: string;
    url: string;
    expectedCardCountMin: number;
}

const bonusSubPages: BonusSubPageConfig[] = [
    {
        name: 'UK Free Spins No Deposit',
        url: 'https://www.gambling.com/uk/online-casinos/bonus/free-spins-no-deposit',
        expectedCardCountMin: 5,
    },
    {
        name: 'IE Free Spins No Deposit',
        url: 'https://www.gambling.com/ie/online-casinos/bonus/free-spins-no-deposit',
        expectedCardCountMin: 5,
    },
    {
        name: 'IE No Deposit Bonus',
        url: 'https://www.gambling.com/ie/online-casinos/no-deposit-bonus',
        expectedCardCountMin: 5,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Parameterised suite — one describe block per geo/category, 11 tests each.
// Mirrors the pattern used in betting-sites.spec.ts and comparison-page.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

for (const config of bonusPages) {
    test.describe(`Bonus Pages — ${config.name}`, () => {
        let bonusPage: ComparisonPage;

        test.beforeEach(async ({ page }) => {
            bonusPage = new ComparisonPage(page);
            await bonusPage.goto(config.url);
        });

        // ── T1: Page URL is correct ───────────────────────────────────────────

        test('@regression page loads with correct URL', async ({ page }) => {
            await expect(page).toHaveURL(new RegExp(escapeForRegex(config.url)));
        });

        // ── T2: Operator cards are present ────────────────────────────────────

        test(`@regression at least ${config.expectedCardCountMin} operator cards are present`, async () => {
            const count = await bonusPage.cards.count();
            expect(
                count,
                `Expected at least ${config.expectedCardCountMin} cards on ${config.name}, got ${count}`,
            ).toBeGreaterThanOrEqual(config.expectedCardCountMin);
        });

        // ── T3: First card has required data attributes ────────────────────────

        test('@regression first card has operator name and position data attributes', async () => {
            const card = bonusPage.nthCard(0);
            const operator = await bonusPage.operatorName(card);
            const position = await bonusPage.position(card);
            expect(operator, 'data-operator should be non-empty on first card').toBeTruthy();
            expect(position, 'data-position should be non-empty on first card').toBeTruthy();
        });

        // ── T4: Operator logo is present ──────────────────────────────────────

        test('@regression first card operator logo is attached with a valid src', async () => {
            const card = bonusPage.nthCard(0);
            const logo = bonusPage.logoImg(card);
            await expect(logo).toBeAttached();
            const src = await logo.getAttribute('src');
            expect(src?.trim().length, 'Logo src should not be empty').toBeGreaterThan(0);
        });

        // ── T5: CTA link has affiliate href ───────────────────────────────────

        test('@regression first card CTA link has a /go/ affiliate href', async () => {
            const card = bonusPage.nthCard(0);
            const cta = bonusPage.ctaLink(card);
            await expect(cta).toBeVisible();
            const href = await cta.getAttribute('href');
            expect(href, 'CTA href should be present').toBeTruthy();
            expect(href, 'CTA should point to an affiliate /go/ redirect').toMatch(/\/go\//);
        });

        // ── T6: CTA opens affiliate redirect in a new tab ─────────────────────

        test('@regression first card CTA opens affiliate redirect in a new tab', async () => {
            const card = bonusPage.nthCard(0);
            const cta = bonusPage.ctaLink(card);
            const href = await cta.getAttribute('href');
            expect(href).toMatch(/\/go\//);

            const affiliateTab = await bonusPage.openCtaAffiliateTab(card);

            await expect
                .poll(() => affiliateTab.url(), { timeout: 20_000 })
                .not.toMatch(/^about:blank$/);

            const affiliateUrl = affiliateTab.url();
            if (affiliateUrl.includes('gambling.com')) {
                expect(affiliateUrl).toContain('/go/');
            } else {
                expect(affiliateUrl).toMatch(/^https:\/\//);
            }

            await affiliateTab.close();
        });

        // ── T7: Offer text is present ─────────────────────────────────────────

        test('@regression first card has offer text', async () => {
            const card = bonusPage.nthCard(0);
            const offer = await bonusPage.offerText(card);
            expect(offer?.trim().length, 'data-offer should not be empty on a bonus page').toBeGreaterThan(0);
        });

        // ── T8: Age limit is correct for this geo ─────────────────────────────

        test(`@regression first card terms text contains ${config.ageLimit}`, async () => {
            const card = bonusPage.nthCard(0);
            const terms = bonusPage.termsText(card);
            await expect(terms).toContainText(config.ageLimit);
        });

        // ── T9: Regulator badge (geo-conditional) ─────────────────────────────

        if (config.hasBadge) {
            test('@regression first card has a regulator badge', async () => {
                const card = bonusPage.nthCard(0);
                await expect(bonusPage.regulatorBadge(card)).toBeAttached();
            });
        }

        // ── T10: Review link (geo-conditional) ────────────────────────────────

        if (config.hasReviewLink !== false) {
            test('@regression first card review link is present', async () => {
                const card = bonusPage.nthCard(0);
                const reviewLink = bonusPage.reviewLink(card);
                await expect(reviewLink).toBeAttached();
                const href = await reviewLink.getAttribute('href');
                expect(href?.trim().length, 'Review link href should not be empty').toBeGreaterThan(0);
            });
        }

        // ── T11: Rank label is visible ────────────────────────────────────────

        test('@regression first card rank label is visible', async () => {
            const card = bonusPage.nthCard(0);
            await expect(bonusPage.rankLabel(card)).toBeVisible();
        });

        // ── T12: Top 3 cards have distinct operator names ─────────────────────

        test('@regression top 3 cards have distinct operator names', async () => {
            const count = await bonusPage.cards.count();
            const checkUpTo = Math.min(count, 3);
            const names: string[] = [];

            for (let i = 0; i < checkUpTo; i++) {
                const card = bonusPage.nthCard(i);
                const name = await bonusPage.operatorName(card);
                expect(name, `Card ${i} is missing data-operator`).toBeTruthy();
                expect(names, `Duplicate operator name "${name}" at card ${i}`).not.toContain(name);
                names.push(name!);
            }
        });

    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Bonus sub-pages — UK and IE Free Spins No Deposit, IE No Deposit Bonus
//
// Brief smoke tests only — full structural coverage handled by the geo loop above.
// ─────────────────────────────────────────────────────────────────────────────

for (const subPage of bonusSubPages) {
    test.describe(`Bonus Sub-Page — ${subPage.name}`, () => {
        let subPageComparison: ComparisonPage;

        test.beforeEach(async ({ page }) => {
            subPageComparison = new ComparisonPage(page);
            await subPageComparison.goto(subPage.url);
        });

        test('@regression page URL is correct', async ({ page }) => {
            await expect(page).toHaveURL(new RegExp(escapeForRegex(subPage.url)));
        });

        test(`@regression at least ${subPage.expectedCardCountMin} operator cards are present`, async () => {
            const count = await subPageComparison.cards.count();
            expect(
                count,
                `Expected at least ${subPage.expectedCardCountMin} cards on ${subPage.name}`,
            ).toBeGreaterThanOrEqual(subPage.expectedCardCountMin);
        });

        test('@regression first card CTA has a /go/ affiliate href', async () => {
            const card = subPageComparison.nthCard(0);
            const cta = subPageComparison.ctaLink(card);
            await expect(cta).toBeVisible();
            const href = await cta.getAttribute('href');
            expect(href).toMatch(/\/go\//);
        });

        test('@regression first card has offer text', async () => {
            const card = subPageComparison.nthCard(0);
            const offer = await subPageComparison.offerText(card);
            expect(offer?.trim().length).toBeGreaterThan(0);
        });

    });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 200 audit — browser-free parallel sweep of all bonus URLs.
// Catches a 404/500 on any bonus page without requiring a full browser run.
// ─────────────────────────────────────────────────────────────────────────────

const allBonusUrls: { name: string; url: string }[] = [
    ...bonusPages.map(({ name, url }) => ({ name, url })),
    ...bonusSubPages.map(({ name, url }) => ({ name, url })),
];

test.describe('Bonus Pages — Multi-URL HTTP 200 check @audit', () => {

    test('@regression @audit all bonus page URLs return HTTP 200', async ({ request }) => {
        test.setTimeout(60_000);

        const results = await Promise.all(
            allBonusUrls.map(async ({ name, url }) => {
                const response = await request.get(url, { timeout: 15_000 });
                return { name, url, status: response.status() };
            }),
        );

        for (const { name, url, status } of results) {
            expect(status, `[${name}] ${url} returned HTTP ${status}`).toBe(200);
        }
    });

});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Escape a string for use inside a RegExp — prevents dots and slashes in URLs
 *  from being treated as regex metacharacters when building URL match patterns. */
function escapeForRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}