import { Page, Locator, expect } from '@playwright/test';
import type { AuthPage } from './AuthPage';

/**
 * Page Object for the Slot Review & Demo page template on gambling.com.
 *
 * URL pattern: /{geo}/online-casinos/slots/{slug}
 * Example:     https://www.gambling.com/ie/online-casinos/slots/starburst
 *
 * Template confirmed on: starburst, book-of-dead (IE geo, June 2026)
 *
 * Key DOM notes:
 *  - Game demo iframe: #game-demo — rendered in DOM on page load, `src` is
 *    empty until toggleGameDemo('open') is called. The real URL lives in
 *    data-demourl (slotslaunch.com CDN). We assert data-demourl is populated,
 *    not the src, to avoid triggering a real game load in CI.
 *  - Play demo button: #play-demo-btn (onclick="toggleGameDemo('open')").
 *    Two copies exist in the DOM (mobile/desktop); .first() targets desktop.
 *  - Slot metadata values use .item-value — rendered in a grid of stats
 *    (reels, rows, paylines, bet range, release date, etc.).
 *  - Operator list below the demo uses class .game-demo-oplist, which wraps
 *    standard .automation-single-cta operator items.
 *  - Breadcrumb: 4 levels — Home → Online Casinos → Slots → Slot name.
 *  - Related slots: carousel gallery under "Related Slot Games" (listitems, not
 *    anchor links). Inline review copy may also link to other slot pages.
 *  - Anonymous users see #slot-login-signup-button over the demo — it intercepts
 *    clicks on #play-demo-btn; use activateGameDemo() in tests instead.
 */
export class SlotReviewPage {
  readonly page: Page;

  // ── Page fundamentals ────────────────────────────────────────────────────

  /** Primary H1 — contains slot name e.g. "Starburst Online Slot" */
  readonly heading: Locator;

  // ── Demo area ────────────────────────────────────────────────────────────

  /** Outer container wrapping the demo iframe — always in DOM */
  readonly gameDemoContainer: Locator;

  /**
   * The iframe element itself. `data-demourl` is populated on page load;
   * `src` is empty until the user clicks play. Use data-demourl for existence
   * checks to avoid triggering a live game load in CI.
   */
  readonly gameDemoIframe: Locator;

  /**
   * "Play Demo" button that fires toggleGameDemo('open').
   * Two copies exist (mobile/desktop CSS toggle) — .first() targets desktop.
   */
  readonly playDemoBtn: Locator;

  /** Login/signup gate overlay shown to anonymous users over the demo area */
  readonly slotLoginGate: Locator;

  /** Visible "Play Demo" CTA inside the login gate (opens signup modal) */
  readonly slotLoginSignupBtn: Locator;

  /** The game-demo-oplist section — operator cards below the demo */
  readonly demoCasinoOplist: Locator;

  // ── Slot metadata ────────────────────────────────────────────────────────

  /**
   * Individual metadata value cells (reels, rows, paylines, bet range, etc.).
   * Uses .item-value class. There are typically 9–12 cells per page.
   */
  readonly metadataValues: Locator;

  // ── Operator list (main) ─────────────────────────────────────────────────

  /**
   * Operator cards in main content. Duplicate hidden oplist templates exist in
   * the DOM — cards may be attached but not visible; prefer operatorCtaLinks
   * for affiliate assertions.
   */
  readonly operatorCards: Locator;

  /** Affiliate CTA links — href contains /go/ */
  readonly operatorCtaLinks: Locator;

  // ── Breadcrumb ───────────────────────────────────────────────────────────

  /** The breadcrumb nav element */
  readonly breadcrumb: Locator;

  /** All anchor links within the breadcrumb */
  readonly breadcrumbLinks: Locator;

  /** Breadcrumb link to the Slots hub (/ie/online-casinos/slots) */
  readonly slotsHubLink: Locator;

  // ── Related slots ────────────────────────────────────────────────────────

  /** Carousel gallery under the "Related Slot Games" heading */
  readonly relatedSlotsGallery: Locator;

  /** Slot items inside the related-slots carousel */
  readonly relatedSlotItems: Locator;

  /** Inline review links to other slot review pages in main content */
  readonly relatedSlotBodyLinks: Locator;

  // ── Review body ──────────────────────────────────────────────────────────

  /** The main article body — scoped to avoid nav/footer noise */
  readonly reviewBody: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator('main h1').first();

    this.gameDemoContainer = page.locator('#game-demo-container');
    this.gameDemoIframe    = page.locator('#game-demo');
    this.playDemoBtn       = page.locator('#play-demo-btn').first();
    this.slotLoginGate     = page.locator('#slot-login-signup-button-container');
    this.slotLoginSignupBtn = page.locator('#slot-login-signup-button');
    this.demoCasinoOplist  = page.locator('.game-demo-oplist');

    this.metadataValues = page.locator('.item-value');

    this.operatorCards    = page.locator('main .automation-single-cta.operator-item');
    this.operatorCtaLinks = page.locator('.automation-single-cta.operator-item a[href*="/go/"]');

    this.breadcrumb      = page.locator('#breadcrumb.automation-breadcrumb');
    this.breadcrumbLinks = this.breadcrumb.locator('a');
    this.slotsHubLink    = this.breadcrumb.locator('a[href*="/online-casinos/slots"]');

    this.relatedSlotsGallery = page.locator('main').getByRole('region', { name: 'Gallery' }).first();
    this.relatedSlotItems    = this.relatedSlotsGallery.locator('li');
    this.relatedSlotBodyLinks = page.locator('main a[href*="/online-casinos/slots/"]');

    this.reviewBody = page.locator('main.body_content, main .body_content').first();
  }

  /** Inline slot review links in main content, excluding the current slot slug */
  otherSlotBodyLinks(excludeSlug: string): Locator {
    return this.page.locator(
      `main a[href*="/online-casinos/slots/"]:not([href*="/slots/${excludeSlug}"])`
    );
  }

  /**
   * Navigate to a slot review page.
   * @param geo  - geo code e.g. 'ie', 'uk'
   * @param slug - slot slug e.g. 'starburst', 'book-of-dead'
   */
  async goto(geo: string, slug: string) {
    return this.page.goto(
      `https://www.gambling.com/${geo}/online-casinos/slots/${slug}`
    );
  }

  /**
   * Opens the game demo via the page's toggleGameDemo handler.
   * Prefer this over clicking #play-demo-btn in CI — anonymous users have a
   * login gate overlay that intercepts pointer events on the demo button.
   */
  async activateGameDemo() {
    await this.page.evaluate(() => {
      const w = window as Window & { toggleGameDemo?: (action: string) => void };
      w.toggleGameDemo?.('open');
    });
  }

  /**
   * Signs in via the demo login gate, then clicks Play Demo and waits for the
   * game iframe to load. Credentials are supplied by the calling spec.
   */
  async playDemoLoggedIn(
    auth: AuthPage,
    credentials: { email: string; password: string }
  ) {
    await this.slotLoginSignupBtn.scrollIntoViewIfNeeded();
    await this.slotLoginSignupBtn.click();
    await auth.signIn(credentials.email, credentials.password);

    await expect(this.slotLoginSignupBtn).toBeHidden({ timeout: 20_000 });

    await this.playDemoBtn.scrollIntoViewIfNeeded();
    await this.playDemoBtn.click();

    await expect(this.gameDemoIframe).toHaveAttribute(
      'src',
      /slotslaunch\.com|iframe/,
      { timeout: 20_000 }
    );
  }

  /**
   * Returns all parsed JSON-LD blocks on the page.
   * Malformed blocks are skipped.
   */
  async getJsonLdBlocks(): Promise<Record<string, unknown>[]> {
    const handles = await this.page
      .locator('script[type="application/ld+json"]')
      .all();
    const results: Record<string, unknown>[] = [];
    for (const h of handles) {
      try {
        const text = await h.textContent();
        if (text) results.push(JSON.parse(text));
      } catch {
        // skip malformed
      }
    }
    return results;
  }
}
