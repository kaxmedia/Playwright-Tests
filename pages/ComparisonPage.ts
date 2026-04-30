import { type Page, type Locator } from '@playwright/test';

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
  ageLimit: '18+' | '21+';

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
}

// ─────────────────────────────────────────────────────────────────────────────
// comparisonPages — canonical list of all live comparison pages under test.
//
// 15 entries: Global Casino + 7 geo pairs (UK, US, IE, DE, GR, IT, ES).
// Global Sports does not exist as a standalone comparison page — the site's
// Betting nav links go directly to geo-specific URLs with no global root.
//
// All URLs verified live via Playwright. hasBadge / hasRating / ageLimit flags
// verified against live DOM; card count floors are generous minimums that
// would only be breached by a broken data fetch, not routine editorial edits.
// ─────────────────────────────────────────────────────────────────────────────
export const comparisonPages: ComparisonPageConfig[] = [
  // ── Global ──────────────────────────────────────────────────────────────────
  {
    name: 'Global Casino',
    url: 'https://www.gambling.com/online-casinos',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: true,
    ageLimit: '18+',
  },
  // ── UK ──────────────────────────────────────────────────────────────────────
  {
    name: 'UK Casino',
    url: 'https://www.gambling.com/uk/online-casinos',
    category: 'casino',
    expectedCardCountMin: 20,
    hasRating: true,
    hasBadge: true,
    ageLimit: '18+',
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
// CTA selector: a.operator-item__cta_link (confirmed identical across all geos)
// DO NOT use automation-* classes — they vary by locale:
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

  // Navigate to a comparison page and wait until at least one card is attached.
  // waitUntil: 'domcontentloaded' is sufficient — cards are server-rendered in
  // the initial HTML and do not require JS execution to appear in the DOM.
  async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: 'domcontentloaded' });
    await this.cards.first().waitFor({ state: 'attached' });
  }

  // ── Card selection ──────────────────────────────────────────────────────────

  // Return the card at a 0-based index.
  nthCard(index: number): Locator {
    return this.cards.nth(index);
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
  logoImg(card: Locator): Locator {
    return card.locator('a.operator-item__image_link img');
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
  // Scoped to .operator-main to exclude the identical class on expanded detail
  // attribute rows (.more-info-table), which also carry operator-item__cta_link.
  // .first() guards against VWO A/B variants that inject a duplicate in the same area.
  ctaLink(card: Locator): Locator {
    return card.locator('.operator-main a.operator-item__cta_link').first();
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
    return card.locator('div.gambling-comission-logo img');
  }

  // Review/read-more anchor — carries data-review-url with the canonical path.
  reviewLink(card: Locator): Locator {
    return card.locator('a.operator-review-link');
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
