import { type Page, type Locator, type Response } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// ComparisonPageConfig — per-URL configuration for parameterised tests.
//
// One entry per comparison page; add new geos/categories here and the test
// loop picks them up automatically — no test code changes needed.
// ─────────────────────────────────────────────────────────────────────────────
export interface ComparisonPageConfig {
  // Human-readable label used in test describe/test names
  name: string;

  // Full URL of the comparison page
  url: string;

  // Casino or sports/betting category
  category: 'casino' | 'sports';

  // Minimum number of operator cards expected — not an exact count because
  // editorial teams add/remove operators regularly. A drop below this floor
  // signals something went wrong (e.g. blank oplist, failed data fetch).
  expectedCardCountMin: number;

  // Whether the expandable "Our Rating" attribute exists for cards on this page.
  // All confirmed geos have it, but flag explicitly so tests can skip the
  // rating assertion on any geo where it is absent.
  hasRating: boolean;

  // Whether a per-card regulator/licence badge is expected.
  // UK → Gambling Commission, DE → GGL Legal, IT → ADM, GR → ΕΕΕΠ.
  // US and any other unregulated badge geos → false.
  hasBadge: boolean;

  // Age restriction shown in the per-card terms-and-conditions text.
  // US is 21+ (state gambling law); all other confirmed geos are 18+.
  ageLimit: '18+' | '19+' | '21+';

  // Label text for the "Our Rating" row in the expandable details panel.
  // English-language pages use "Our Rating" — omit this field and the test
  // defaults to that string. Non-English pages with a rating must supply the
  // localised label, e.g. "Η βαθμολογία μας" for GR.
  ratingLabel?: string;

  // Whether the more-info-table panel is lazy-rendered (only injected into the
  // DOM after the expand toggle is clicked). When true, the hidden-DOM read in
  // T9 will timeout because the element does not exist until interaction.
  // Confirmed lazy on: UK Sports, US Casino, US Sportsbooks, IE Casino,
  // IE Sports, GR Casino, GR Sports. Eager on: Global Casino, UK Casino.
  // T9 skips these entries — full coverage deferred to PR #9 (requires
  // cookieBanner fixture integration and click-to-expand interaction).
  hasLazyRating?: boolean;

  // Whether per-operator review links (a.operator-review-link) appear on list cards.
  // Absent on some sports lists (e.g. IE, NZ betting) — omit or set false to skip the assertion.
  hasReviewLink?: boolean;

  /**
   * IDs from `KNOWN_PAGE_ERROR_ALLOWLIST` in tests/helpers/firstPartyPageGuards.ts.
   * T8 still fails on any other uncaught pageerror — remove ids when the bug is fixed.
   */
  knownPageErrorIds?: string[];

  /**
   * IDs from `KNOWN_CONSOLE_ERROR_ALLOWLIST` in tests/helpers/firstPartyPageGuards.ts.
   * T8 still fails on other first-party console errors — remove ids when the bug is fixed.
   */
  knownConsoleErrorIds?: string[];

  /**
   * Skip T8 (first-party console + network health). Use when the page has known
   * content assets product will not fix (e.g. malformed logo URLs) so the rest
   * of the comparison suite can still cover the oplist.
   */
  skipFirstPartyHealthCheck?: boolean;

  /**
   * Oplist renders an initial batch (10) with a "Show More" control — card-count tests
   * must expand before asserting expectedCardCountMin.
   */
  hasOplistPagination?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// comparisonPages — canonical list of all live comparison pages under test.
//
// 28 entries: 13 geo pairs (UK, US, IE, DE, GR, IT, ES, IN, RO, NZ, MX, SE,
// CA-EN) + CA-FR Casino + CA-FR Sports.
// Global Sports does not exist as a standalone comparison page — the site's
// Betting nav links go directly to geo-specific URLs with no global root.
//
// All URLs verified live via Playwright. hasBadge / hasRating / ageLimit flags
// verified against live DOM; card count floors are generous minimums that
// would only be breached by a broken data fetch, not routine editorial edits.
// ─────────────────────────────────────────────────────────────────────────────
export const comparisonPages: ComparisonPageConfig[] = [
  // ── UK ──────────────────────────────────────────────────────────────────────
  {
    name: 'UK Casino',
    url: 'https://www.gambling.com/uk/online-casinos',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: true,
    ageLimit: '18+',
    hasOplistPagination: true,
  },
  {
    name: 'UK Sports',
    url: 'https://www.gambling.com/uk/betting-sites',
    category: 'sports',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: true,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  // ── US ──────────────────────────────────────────────────────────────────────
  {
    name: 'US Casino',
    url: 'https://www.gambling.com/us/online-casinos',
    category: 'casino',
    expectedCardCountMin: 10,
    hasRating: true,
    hasBadge: false,
    ageLimit: '21+',
    hasLazyRating: true,
  },
  {
    name: 'US Sportsbooks',
    url: 'https://www.gambling.com/us/sportsbooks',
    category: 'sports',
    expectedCardCountMin: 5,
    hasRating: true,
    hasBadge: false,
    ageLimit: '21+',
    hasLazyRating: true,
    // Malformed quoted S3 logo srcs (content) — product declined to fix; skip T8.
    skipFirstPartyHealthCheck: true,
  },
  // ── IE ──────────────────────────────────────────────────────────────────────
  {
    name: 'IE Casino',
    url: 'https://www.gambling.com/ie/online-casinos',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: false,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  {
    name: 'IE Sports',
    url: 'https://www.gambling.com/ie/betting-sites',
    category: 'sports',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: false,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  // ── DE ──────────────────────────────────────────────────────────────────────
  {
    name: 'DE Casino',
    url: 'https://www.gambling.com/de/online-casinos',
    category: 'casino',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: true,
    knownPageErrorIds: ['age-checker-related-content-slots'],
    ageLimit: '18+',
  },
  {
    name: 'DE Sports',
    url: 'https://www.gambling.com/de/sportwetten',
    category: 'sports',
    expectedCardCountMin: 5,
    hasRating: false,
    hasBadge: true,
    ageLimit: '18+',
  },
  // ── GR ──────────────────────────────────────────────────────────────────────
  {
    name: 'GR Casino',
    url: 'https://www.gambling.com/gr/online-casinos',
    category: 'casino',
    expectedCardCountMin: 5,
    hasRating: true,
    hasBadge: false,
    ageLimit: '21+',
    ratingLabel: 'Η βαθμολογία μας',
    hasLazyRating: true,
  },
  {
    name: 'GR Sports',
    url: 'https://www.gambling.com/gr/stoiximatikes-etairies',
    category: 'sports',
    expectedCardCountMin: 5,
    hasRating: true,
    hasBadge: false,
    ageLimit: '21+',
    ratingLabel: 'Η βαθμολογία μας',
    hasLazyRating: true,
  },
  // ── IT ──────────────────────────────────────────────────────────────────────
  // IT expandable panel shows casino features (jackpot slots, withdrawal time,
  // slot providers) — not a numeric "Our Rating" score. hasRating: false.
  {
    name: 'IT Casino',
    url: 'https://www.gambling.com/it/casino-online',
    category: 'casino',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: true,
    ageLimit: '18+',
  },
  {
    name: 'IT Sports',
    url: 'https://www.gambling.com/it/scommesse-sportive/migliori-siti',
    category: 'sports',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: true,
    ageLimit: '18+',
  },
  // ── ES ──────────────────────────────────────────────────────────────────────
  {
    name: 'ES Casino',
    url: 'https://www.gambling.com/es/casinos-online',
    category: 'casino',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: false,
    ageLimit: '18+',
  },
  {
    name: 'ES Sports',
    url: 'https://www.gambling.com/es/casas-de-apuestas',
    category: 'sports',
    expectedCardCountMin: 10,
    hasRating: false,
    hasBadge: false,
    ageLimit: '18+',
  },
  // ── IN ──────────────────────────────────────────────────────────────────────
  // No national gambling regulator (OGAI covers online gaming, not casino/betting).
  // Both pages server-rendered with Our Rating score present.
  {
    name: 'IN Casino',
    url: 'https://www.gambling.com/in/online-casinos',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: false,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  {
    name: 'IN Sports',
    url: 'https://www.gambling.com/in/betting-sites',
    category: 'sports',
    expectedCardCountMin: 10,
    hasRating: true,
    hasBadge: false,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  // ── RO ──────────────────────────────────────────────────────────────────────
  // ONJN-regulated EU market — hasBadge: true. Details panel absent from DOM
  // on both pages; no rating score exposed.
  {
    name: 'RO Casino',
    url: 'https://www.gambling.com/ro/cazino-online',
    category: 'casino',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: true,
    knownPageErrorIds: ['age-checker-related-content-slots'],
    ageLimit: '18+',
  },
  {
    name: 'RO Sports',
    url: 'https://www.gambling.com/ro/pariuri-sportive',
    category: 'sports',
    expectedCardCountMin: 10,
    hasRating: false,
    hasBadge: true,
    ageLimit: '18+',
  },
  // ── NZ ──────────────────────────────────────────────────────────────────────
  // No regulator badge. Casino has Our Rating (server-rendered); Sports panel
  // absent from DOM entirely.
  {
    name: 'NZ Casino',
    url: 'https://www.gambling.com/nz/online-casinos',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: false,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  {
    name: 'NZ Sports',
    url: 'https://www.gambling.com/nz/betting-sites',
    category: 'sports',
    expectedCardCountMin: 20,
    hasRating: false,
    hasBadge: false,
    ageLimit: '18+',
  },
  // ── MX ──────────────────────────────────────────────────────────────────────
  // No regulator badge. Casino details panel present but exposes RTP stats,
  // not an editorial rating score. Sports panel absent from DOM.
  {
    name: 'MX Casino',
    url: 'https://www.gambling.com/mx/casino-online',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: false,
    hasBadge: false,
    ageLimit: '18+',
  },
  {
    name: 'MX Sports',
    url: 'https://www.gambling.com/mx/apuestas-deportivas',
    category: 'sports',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: false,
    ageLimit: '18+',
  },
  // ── SE ──────────────────────────────────────────────────────────────────────
  // Spelinspektionen-regulated but badge not rendered on either page.
  // Casino panel exposes wagering/RTP stats, not a rating score.
  // Sports URL is /se/betting — convention-based slugs (/se/sportsbetting etc.) all 404.
  {
    name: 'SE Casino',
    url: 'https://www.gambling.com/se/online-casinon',
    category: 'casino',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: false,
    ageLimit: '18+',
  },
  {
    name: 'SE Sports',
    url: 'https://www.gambling.com/se/betting',
    category: 'sports',
    expectedCardCountMin: 15,
    hasRating: false,
    hasBadge: false,
    ageLimit: '18+',
  },
  // ── CA ──────────────────────────────────────────────────────────────────────
  // Provincial age minimum is 19+ across all three CA entries.
  // No regulator badge. EN Casino has Our Rating (server-rendered).
  // Sports panel absent from DOM; sports URL is /ca/sportsbooks
  // (/ca/sports-betting redirects there — use the canonical final URL).
  // CA-FR Casino is a distinct French-language page with ratingLabel in French.
  {
    name: 'CA EN Casino',
    url: 'https://www.gambling.com/ca/online-casinos',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: false,
    ageLimit: '19+',
    hasLazyRating: true,
  },
  {
    name: 'CA EN Sports',
    url: 'https://www.gambling.com/ca/sportsbooks',
    category: 'sports',
    expectedCardCountMin: 20,
    hasRating: false,
    hasBadge: false,
    ageLimit: '19+',
  },
  {
    name: 'CA FR Casino',
    url: 'https://www.gambling.com/ca/fr/casinos-en-ligne',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: false,
    ageLimit: '19+',
    ratingLabel: 'Notre Évaluation',
    hasLazyRating: true,
  },
  {
    name: 'CA FR Sports',
    url: 'https://www.gambling.com/ca/fr/paris-sportifs',
    category: 'sports',
    expectedCardCountMin: 20,
    hasRating: false,
    hasBadge: false,
    ageLimit: '19+',
    ratingLabel: 'Évaluation globale', // Forward-prep for lazy-rating framework PR; dormant while hasRating: false
    hasLazyRating: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ComparisonPage — Page Object for gambling.com operator comparison pages.
//
// Covers all geos (Global, UK, US, DE, IE, GR, IT, ES) and both categories
// (casino, sports/betting). The HTML template is identical across all 15
// confirmed URLs;
// locale differences are data-level (text, currency) not structural.
//
// SELECTOR STRATEGY
// All key data is available on data-* attributes directly on the card <li>.
// Use data attributes for identity assertions wherever possible — they are
// set server-side and do not change with CSS refactors or Tailwind purges.
//
// CTA selector: prefer `a.operator-item__cta_link` inside `.operator-main` when present; otherwise
// the first card-scoped CTA (CA FR featured rows omit `.operator-main`). Do not rely on locale-specific
// automation-* classes — they vary by locale:
//   automation-visit-casino-cta (UK) · automation-jetzt-spielen-cta (DE)
//   automation-play-now-cta (US) — these would silently fail cross-geo.
// ─────────────────────────────────────────────────────────────────────────────
export class ComparisonPage {
  readonly page: Page;

  // All operator cards on the page.
  // Selector confirmed across UK, DE, US live DOM via Playwright inspection.
  readonly cards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.cards = page.locator('li.operator-item');
  }

  /** "Show More" control for paginated oplists (10 cards per batch). */
  showMoreOplistButton(): Locator {
    return this.page
      .locator('a.automation-readmore-button[data-gtm="show_more_less"]')
      .filter({ hasText: /Show More/i });
  }

  // Navigate to a comparison page and wait until at least one card is attached.
  // Retries transient navigation errors (e.g. ERR_NETWORK_CHANGED on long CI runs).
  async goto(url: string): Promise<Response | null> {
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        if (response !== null && response.status() >= 400) {
          throw new Error(`${url} returned HTTP ${response.status()}`);
        }
        await this.cards.first().waitFor({ state: 'attached' });
        return response;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        const isTransientNetwork = /ERR_NETWORK|ERR_INTERNET|ERR_CONNECTION|ERR_NAME_NOT_RESOLVED/i.test(message);
        if (!isTransientNetwork || attempt === maxAttempts) {
          throw error;
        }
        await this.page.waitForTimeout(1000 * attempt);
      }
    }

    throw lastError;
  }

  /** Click "Show More" until at least `min` operator cards are in the DOM. */
  async expandOplistToMinimum(min: number): Promise<void> {
    while ((await this.cards.count()) < min) {
      const showMore = this.showMoreOplistButton().first();
      if (!(await showMore.isVisible().catch(() => false))) {
        break;
      }
      const before = await this.cards.count();
      await showMore.scrollIntoViewIfNeeded();
      await showMore.click();
      await this.page
        .waitForFunction(
          (prev) => document.querySelectorAll('li.operator-item').length > prev,
          before,
          { timeout: 10_000 },
        )
        .catch(() => {});
      if ((await this.cards.count()) <= before) {
        break;
      }
    }
  }

  // ── Card selection ──────────────────────────────────────────────────────────

  // Return the card at a 0-based index.
  nthCard(index: number): Locator {
    return this.cards.nth(index);
  }

  // ── CA FR editorial “TOP 3” strip (inside .cf-primary-operator-list) ────────
  // Only on the CA FR casino comparison layout: a label row plus a horizontal flex strip
  // with three `li.operator-item` before the main `ol.rwd-table`. Other geos have no
  // matching flex row — these locators match nothing there.

  /** Horizontal flex row with the three featured operator cards. */
  editorialTopThreeStrip(): Locator {
    return this.page.locator(
      'div.operator-list-full.cf-primary-operator-list > div.cf-removalable-on-pagination.flex'
    );
  }

  /** Label directly above the strip (e.g. “TOP 3 DE LA RÉDACTION”) — excludes the flex row, which also uses mb-4. */
  editorialTopThreeLabel(): Locator {
    return this.page.locator(
      'div.operator-list-full.cf-primary-operator-list > div.cf-removalable-on-pagination.mb-4:not(.flex)'
    );
  }

  /** One of the three featured `li.operator-item` nodes inside {@link editorialTopThreeStrip}. */
  nthEditorialTopPick(index: number): Locator {
    return this.editorialTopThreeStrip().locator('li.operator-item').nth(index);
  }

  // Return a card by its data-operator value (exact match, case-sensitive).
  // Prefer this over nthCard() when asserting a specific operator's presence —
  // positional tests are fragile if editorial reorders the list.
  cardByOperator(operatorName: string): Locator {
    return this.page.locator(`li.operator-item[data-operator="${operatorName}"]`);
  }

  // ── Card-level data attribute readers ──────────────────────────────────────
  // These read data-* attributes directly from the card <li> element.
  // Prefer these over text/CSS assertions for identity checks.

  // Operator name as stored server-side (matches data-operator on the <li>).
  async operatorName(card: Locator): Promise<string | null> {
    return card.getAttribute('data-operator');
  }

  // Full product label, e.g. "Caesars Casino" (data-product on the <li>).
  async productName(card: Locator): Promise<string | null> {
    return card.getAttribute('data-product');
  }

  // Product type string, e.g. "Casino" (data-product-type on the <li>).
  async productType(card: Locator): Promise<string | null> {
    return card.getAttribute('data-product-type');
  }

  // Editorial rank position as a string, e.g. "1" (data-position on the <li>).
  async position(card: Locator): Promise<string | null> {
    return card.getAttribute('data-position');
  }

  // Bonus/offer text as stored server-side (data-offer on the <li>).
  // Use this rather than scraping the rendered bonus text — it is stable
  // even when the display format changes (bold, em tags, etc.).
  async offerText(card: Locator): Promise<string | null> {
    return card.getAttribute('data-offer');
  }

  // ── Card-scoped element locators ────────────────────────────────────────────
  // Each method accepts a card Locator (from nthCard / cardByOperator) and
  // returns a child Locator scoped to that card.

  // Logo image — alt text is "[Operator Name] Casino" on all confirmed geos.
  // Some cards ship responsive srcset pairs (e.g. hidden lg:block + lg:hidden); .first() avoids strict violations.
  logoImg(card: Locator): Locator {
    return card.locator('a.operator-item__image_link img').first();
  }

  // Logo anchor — href is the /go/ affiliate redirect for this operator.
  logoLink(card: Locator): Locator {
    return card.locator('a.operator-item__image_link');
  }

  // Rank number element — visible integer label (1, 2, 3…).
  rankLabel(card: Locator): Locator {
    return card.locator('div.operator-column-ranking-v2');
  }

  // Founded/launched year label — text is localised ("Launched 2024" / "Gegründet 2021").
  foundedYearLabel(card: Locator): Locator {
    return card.locator('div.operator-established-year-v2');
  }

  // Offer/bonus clickable text link (distinct from the CTA button).
  offerLink(card: Locator): Locator {
    return card.locator('a.operator-item__offer_link');
  }

  // Primary CTA button anchor.
  // Prefer `.operator-main …` so we ignore duplicate `operator-item__cta_link` anchors inside
  // `.more-info-table` (UK lists ~7 matching anchors per card; the list CTA is the first outside the panel).
  // CA FR (and similar v2 layouts) sometimes omit `.operator-main` on featured top picks — fall back to
  // the first card-scoped CTA, which is still the list button in DOM order before any detail-panel clones.
  ctaLink(card: Locator): Locator {
    return card
      .locator('.operator-main a.operator-item__cta_link')
      .first()
      .or(card.locator('a.operator-item__cta_link').first());
  }

  /**
   * Taps/clicks the list CTA (usually `target="_blank"`) and returns the new tab.
   * Use `tap: true` on mobile projects; desktop can omit it.
   */
  async openCtaAffiliateTab(card: Locator, options?: { tap?: boolean }): Promise<Page> {
    const cta = this.ctaLink(card);
    await cta.scrollIntoViewIfNeeded();

    const popupPromise = this.page.context().waitForEvent('page');
    if (options?.tap) {
      await cta.tap();
    } else {
      await cta.click();
    }

    const affiliateTab = await popupPromise;
    await affiliateTab.waitForLoadState('domcontentloaded');
    return affiliateTab;
  }

  // CTA button visible text element (e.g. "Visit Casino", "Jetzt Spielen").
  ctaButtonText(card: Locator): Locator {
    return card.locator('span.button-blue-v2');
  }

  // Payment method icon images.
  paymentIcons(card: Locator): Locator {
    return card.locator('div.primary-list-item-payment-methods img.payment-provider-img');
  }

  // Per-card terms / age-warning text element.
  // Text varies: "18+. Gamble Responsibly…" (UK), "18+. Es gelten die AGB" (DE),
  // "Must be 21+ to participate…" (US).
  termsText(card: Locator): Locator {
    return card.locator('span.terms-and-conditions');
  }

  // Regulator / licence badge image inside its container.
  // Present on UK (Gambling Commission), DE (GGL Legal), IT (ADM), GR (ΕΕΕΠ).
  // Absent on US — use hasBadge flag in ComparisonPageConfig before asserting.
  regulatorBadge(card: Locator): Locator {
    return card.locator('div.gambling-comission-logo img').first();
  }

  // Review/read-more anchor — class varies by oplist version
  // (operator-review-link historically; read-review-link-2 on current IE/UK cards).
  reviewLink(card: Locator): Locator {
    return card.locator('a.operator-review-link, a[class*="review-link"]').first();
  }

  // ── Expandable details panel ────────────────────────────────────────────────

  // "More Details" / "Weniger Infos" toggle button.
  detailsToggle(card: Locator): Locator {
    return card.locator('div.more_info_button');
  }

  // The expandable details panel (hidden by default on most cards).
  detailsPanel(card: Locator): Locator {
    return card.locator('div.more-info-table');
  }

  // Click the toggle to open the details panel if it is not already visible.
  async expandDetails(card: Locator): Promise<void> {
    const panel = this.detailsPanel(card);
    if (await panel.isVisible()) return;
    await this.detailsToggle(card).click();
    await panel.waitFor({ state: 'visible' });
  }

  // Get the value element for a named attribute in the expanded details panel.
  // The "Our Rating" attribute value is the numeric score (e.g. "9.9").
  // Other available labels (vary by geo): "Payout Speed", "Bonus Wagering",
  // "Casino Games", "Live Casino Games", "Promo Code".
  //
  // Usage:
  //   await comparisonPage.expandDetails(card);
  //   const rating = comparisonPage.detailAttributeValue(card, 'Our Rating');
  //   await expect(rating).toHaveText(/^\d+\.\d+$/);
  detailAttributeValue(card: Locator, labelText: string): Locator {
    return this.detailsPanel(card)
      .locator('div.attribute')
      .filter({
        has: this.page.locator('div.attribute-name-text', { hasText: labelText }),
      })
      .locator('div.attribute-value');
  }
}
