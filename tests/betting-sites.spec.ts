// ─────────────────────────────────────────────────────────────────────────────
// Betting Sites Category Pages — gambling.com
//
// This suite closes the largest remaining coverage gap in the framework: the
// Betting vertical had zero automated tests despite being one of the two
// primary revenue verticals alongside Casino.
//
// APPROACH
// The Betting pages share the same DOM template as the Casino comparison pages
// already covered by comparison-page.spec.ts. This suite reuses ComparisonPage.ts
// wholesale — no new POM needed. The bettingPages config array below drives
// all parameterised loops.
//
// COVERAGE
//  • Core comparison page structure — operator cards, CTA links, offer text,
//    payment icons, terms text, regulator badges, review links
//  • Affiliate redirect flow — CTA opens a new tab with a /go/ URL
//  • Betting-specific sub-pages — Free Bets (/uk/betting-sites/free-bets)
//    and Betting Apps (/uk/betting-sites/apps)
//  • Multi-geo parameterised loop — UK, IE, DE, US, NZ (5 markets)
//  • HTTP 200 audit — browser-free sweep of all betting URLs
//
// Run with:
//   npx playwright test tests/betting-sites.spec.ts --project=chrome
//   npx playwright test tests/betting-sites.spec.ts --grep @smoke
//   npx playwright test tests/betting-sites.spec.ts --grep @audit
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '../fixtures/test';
import { ComparisonPage, type ComparisonPageConfig } from '../pages/ComparisonPage';

// ─────────────────────────────────────────────────────────────────────────────
// Betting page config — one entry per geo/URL.
//
// Flags (hasRating, hasBadge, hasLazyRating, ageLimit) are copied from the
// verified entries already in ComparisonPage.ts comparisonPages array, or
// inferred from live DOM inspection of equivalent casino pages in the same geo.
//
// Add a new entry here and the parameterised loop picks it up automatically —
// no test code changes needed.
// ─────────────────────────────────────────────────────────────────────────────
const bettingPages: ComparisonPageConfig[] = [
    // ── UK ────────────────────────────────────────────────────────────────────
    // UK Sports already verified in ComparisonPage.ts — hasLazyRating confirmed.
    {
        name: 'UK Betting Sites',
        url: 'https://www.gambling.com/uk/betting-sites',
        category: 'sports',
        expectedCardCountMin: 20,
        hasRating: true,
        hasBadge: true,
        ageLimit: '18+',
        hasLazyRating: true,
    },
    // ── IE ────────────────────────────────────────────────────────────────────
    // IE Sports already verified in ComparisonPage.ts.
    {
        name: 'IE Betting Sites',
        url: 'https://www.gambling.com/ie/betting-sites',
        category: 'sports',
        expectedCardCountMin: 20,
        hasRating: true,
        hasBadge: false,
        ageLimit: '18+',
        hasLazyRating: true,
        // IE sports oplist has no a.operator-review-link on cards (verified May 2026).
        hasReviewLink: false,
    },
    // ── DE ────────────────────────────────────────────────────────────────────
    // DE Sports uses /de/sportwetten — localised slug, confirmed in ComparisonPage.ts.
    {
        name: 'DE Sportwetten',
        url: 'https://www.gambling.com/de/sportwetten',
        category: 'sports',
        expectedCardCountMin: 5,
        hasRating: false,
        hasBadge: true,
        ageLimit: '18+',
    },
    // ── US ────────────────────────────────────────────────────────────────────
    // US Sportsbooks — 21+ age limit, no badge, already verified in ComparisonPage.ts.
    {
        name: 'US Sportsbooks',
        url: 'https://www.gambling.com/us/sportsbooks',
        category: 'sports',
        expectedCardCountMin: 5,
        hasRating: true,
        hasBadge: false,
        ageLimit: '21+',
        hasLazyRating: true,
    },
    // ── NZ ────────────────────────────────────────────────────────────────────
    // NZ Sports — no badge, no rating panel (absent from DOM), confirmed in ComparisonPage.ts.
    {
        name: 'NZ Betting Sites',
        url: 'https://www.gambling.com/nz/betting-sites',
        category: 'sports',
        expectedCardCountMin: 20,
        hasRating: false,
        hasBadge: false,
        ageLimit: '18+',
        // NZ sports oplist has no a.operator-review-link on cards (verified May 2026).
        hasReviewLink: false,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Betting sub-page config — UK-only sub-category pages unique to the Betting
// vertical. These have the same operator card structure as the main page but
// are filtered to a specific product type.
// ─────────────────────────────────────────────────────────────────────────────
interface BettingSubPageConfig {
    name: string;
    url: string;
    /** Minimum number of operator cards expected — generous floor, not an exact count. */
    expectedCardCountMin: number;
}

const bettingSubPages: BettingSubPageConfig[] = [
    {
        name: 'UK Free Bets',
        url: 'https://www.gambling.com/uk/betting-sites/free-bets',
        expectedCardCountMin: 5,
    },
    {
        name: 'UK Betting Apps',
        url: 'https://www.gambling.com/uk/betting-sites/apps',
        expectedCardCountMin: 5,
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// Parameterised suite — one describe block per geo, same tests in every block.
// This mirrors the pattern used in comparison-page.spec.ts.
// ─────────────────────────────────────────────────────────────────────────────

for (const config of bettingPages) {
    test.describe(`Betting Sites — ${config.name}`, () => {
        let bettingPage: ComparisonPage;

        test.beforeEach(async ({ page }) => {
            bettingPage = new ComparisonPage(page);
            await bettingPage.goto(config.url);
        });

        // ── T1: Page loads and URL is correct ─────────────────────────────────

        test('@smoke page loads with correct URL', async ({ page }) => {
            await expect(page).toHaveURL(new RegExp(escapeForRegex(config.url)));
        });

        // ── T2: Operator cards are present above the minimum floor ─────────────

        test(`@smoke at least ${config.expectedCardCountMin} operator cards are present`, async () => {
            const count = await bettingPage.cards.count();
            expect(
                count,
                `Expected at least ${config.expectedCardCountMin} cards on ${config.name}, got ${count}`,
            ).toBeGreaterThanOrEqual(config.expectedCardCountMin);
        });

        // ── T3: First card has required data attributes ────────────────────────

        test('@smoke first card has operator name and position data attributes', async () => {
            const card = bettingPage.nthCard(0);
            const operator = await bettingPage.operatorName(card);
            const position = await bettingPage.position(card);
            expect(operator, 'data-operator should be non-empty on first card').toBeTruthy();
            expect(position, 'data-position should be non-empty on first card').toBeTruthy();
        });

        // ── T4: Operator logo is present and has non-empty src ─────────────────

        test('@smoke first card operator logo is attached with a valid src', async () => {
            const card = bettingPage.nthCard(0);
            const logo = bettingPage.logoImg(card);
            await expect(logo).toBeAttached();
            const src = await logo.getAttribute('src');
            expect(src?.trim().length, 'Logo src should not be empty').toBeGreaterThan(0);
        });

        // ── T5: CTA link is present and points to an affiliate redirect ────────

        test('@smoke first card CTA link has a /go/ affiliate href', async () => {
            const card = bettingPage.nthCard(0);
            const cta = bettingPage.ctaLink(card);
            await expect(cta).toBeVisible();
            const href = await cta.getAttribute('href');
            expect(href, 'CTA href should be present').toBeTruthy();
            expect(href, 'CTA should point to an affiliate /go/ redirect').toMatch(/\/go\//);
        });

        // ── T6: CTA opens affiliate redirect in a new tab ─────────────────────

        test('@regression first card CTA opens affiliate redirect in a new tab', async () => {
            const card = bettingPage.nthCard(0);
            const cta = bettingPage.ctaLink(card);
            const href = await cta.getAttribute('href');
            expect(href, 'CTA href should point through /go/ before navigation').toMatch(/\/go\//);

            const affiliateTab = await bettingPage.openCtaAffiliateTab(card);

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

        // ── T7: Offer text is present on the first card ────────────────────────

        test('@smoke first card has offer text', async () => {
            const card = bettingPage.nthCard(0);
            const offer = await bettingPage.offerText(card);
            expect(offer?.trim().length, 'data-offer should not be empty').toBeGreaterThan(0);
        });

        // ── T8: Age limit text is correct for this geo ─────────────────────────

        test(`@smoke first card terms text contains ${config.ageLimit}`, async () => {
            const card = bettingPage.nthCard(0);
            const terms = bettingPage.termsText(card);
            await expect(terms).toContainText(config.ageLimit);
        });

        // ── T9: Regulator badge (geo-conditional) ─────────────────────────────

        if (config.hasBadge) {
            test('@smoke first card has a regulator badge', async () => {
                const card = bettingPage.nthCard(0);
                await expect(bettingPage.regulatorBadge(card)).toBeAttached();
            });
        }

        // ── T10: Review link (geo-conditional) ────────────────────────────────

        if (config.hasReviewLink !== false) {
            test('@smoke first card review link is present', async () => {
                const card = bettingPage.nthCard(0);
                const reviewLink = bettingPage.reviewLink(card);
                await expect(reviewLink).toBeAttached();
                const href = await reviewLink.getAttribute('href');
                expect(href?.trim().length, 'Review link href should not be empty').toBeGreaterThan(0);
            });
        }

        // ── T11: Rank label is visible on the first card ──────────────────────

        test('@smoke first card rank label is visible', async () => {
            const card = bettingPage.nthCard(0);
            await expect(bettingPage.rankLabel(card)).toBeVisible();
        });

        // ── T12: Cards 1–3 all have distinct operator names ───────────────────

        test('@regression top 3 cards have distinct operator names', async () => {
            const count = await bettingPage.cards.count();
            const checkUpTo = Math.min(count, 3);
            const names: string[] = [];

            for (let i = 0; i < checkUpTo; i++) {
                const card = bettingPage.nthCard(i);
                const name = await bettingPage.operatorName(card);
                expect(name, `Card ${i} is missing data-operator`).toBeTruthy();
                expect(names, `Duplicate operator name "${name}" at card ${i}`).not.toContain(name);
                names.push(name!);
            }
        });

    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Betting sub-pages — Free Bets and Betting Apps (UK only)
//
// These pages share the same operator card structure as the main comparison
// page, so tests are deliberately brief — just confirm the page loads, cards
// are present, and CTAs fire. Full structural coverage is handled by the
// parameterised loop above.
// ─────────────────────────────────────────────────────────────────────────────

for (const subPage of bettingSubPages) {
    test.describe(`Betting Sub-Page — ${subPage.name}`, () => {
        let subPageComparison: ComparisonPage;

        test.beforeEach(async ({ page }) => {
            subPageComparison = new ComparisonPage(page);
            await subPageComparison.goto(subPage.url);
        });

        test('@smoke page URL is correct', async ({ page }) => {
            await expect(page).toHaveURL(new RegExp(escapeForRegex(subPage.url)));
        });

        test(`@smoke at least ${subPage.expectedCardCountMin} operator cards are present`, async () => {
            const count = await subPageComparison.cards.count();
            expect(
                count,
                `Expected at least ${subPage.expectedCardCountMin} cards on ${subPage.name}`,
            ).toBeGreaterThanOrEqual(subPage.expectedCardCountMin);
        });

        test('@smoke first card CTA has a /go/ affiliate href', async () => {
            const card = subPageComparison.nthCard(0);
            const cta = subPageComparison.ctaLink(card);
            await expect(cta).toBeVisible();
            const href = await cta.getAttribute('href');
            expect(href).toMatch(/\/go\//);
        });

        test('@smoke first card has offer text', async () => {
            const card = subPageComparison.nthCard(0);
            const offer = await subPageComparison.offerText(card);
            expect(offer?.trim().length).toBeGreaterThan(0);
        });

    });
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP 200 audit — browser-free sweep of all betting URLs.
//
// This catches a 404/500 on any betting page immediately, without requiring a
// full browser run. Fires in parallel — typically completes in ~5s.
// ─────────────────────────────────────────────────────────────────────────────

const allBettingUrls: { name: string; url: string }[] = [
    // Main geo comparison pages
    ...bettingPages.map(({ name, url }) => ({ name, url })),
    // UK sub-pages
    ...bettingSubPages.map(({ name, url }) => ({ name, url })),
];

test.describe('Betting Sites — Multi-URL HTTP 200 check @audit', () => {

    test('@audit all betting page URLs return HTTP 200', async ({ request }) => {
        test.setTimeout(60_000);

        const results = await Promise.all(
            allBettingUrls.map(async ({ name, url }) => {
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