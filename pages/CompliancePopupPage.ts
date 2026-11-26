import { Page, Locator } from '@playwright/test';

/**
 * ES "responsible gambling" compliance interstitial — GDCU-9469.
 *
 * Legal requirement for Spain: a warning pop-up must show on the first page a
 * user opens under /es (any page, not just the homepage), once per visit,
 * right after the existing age-verification gate is passed (never shown at
 * the same time as it), picking one of three mandated warning texts at
 * random and staying up for a minimum dwell before it can be closed.
 *
 * DOM confirmed live 2026-11-26:
 *   .es-cp                 full-viewport overlay (position: fixed, z-index:
 *                           2147483647 — always above the cookie banner and
 *                           everything else on the page)
 *     .es-cp__dialog        role="dialog" aria-modal="true" aria-labelledby="es-cp-warning"
 *       .es-cp__close       the "X" — aria-label="Cerrar", `disabled` for the
 *                           first ~5s after mount; sits above the frame, not
 *                           overlapping it
 *       .es-cp__frame       18px solid black frame (background transparent —
 *                           the black is the border, not a fill)
 *         .es-cp__content   white background, black bold text (Red Hat
 *                           Display — the site's own brand font, not
 *                           literally Helvetica — at font-weight 700)
 *           .es-cp__warning#es-cp-warning   the random warning, always
 *                           rendered as exactly 3 `.es-cp__line` spans
 *           .es-cp__link.es-cp__age   "Solo para mayores de 18 años"
 *           .es-cp__link.es-cp__url   "www.juegoseguro.es"
 *             (both link to https://www.juegoseguro.es, target="_blank")
 *
 * sessionStorage (this is the actual "once per visit" mechanism):
 *   es_compliance_popup_warning  "1" | "2" | "3" — the variant picked for
 *                                this visit, set as soon as the popup mounts
 *   es_compliance_popup_seen     "1" — only written once the popup has been
 *                                on screen for the full minimum dwell; a user
 *                                who navigates away before that will see the
 *                                popup again on the next page
 *
 * Analytics: window.dataLayer receives
 *   { event: 'es_compliance_popup_shown', warning_number: <1|2|3> }
 * once per time the popup is shown, matching the chosen variant.
 *
 * Note on wording vs. implementation: the ticket's "All text in lowercase"
 * requirement is not what ships — the live copy renders in normal Spanish
 * sentence case (e.g. "La ludopatía es…", not "la ludopatía es…"), with no
 * text-transform applied. Tests below assert the actual canonical copy
 * rather than a literal lowercase rule, so they test what is really live.
 */
export class CompliancePopupPage {
  readonly page: Page;

  // Minimum time the popup must stay up before it can be closed (GDCU-9469: "at least 5 seconds").
  static readonly MIN_DWELL_MS = 5000;

  static readonly TARGET_URL = 'https://www.juegoseguro.es/';
  static readonly AGE_LINE_TEXT = 'Solo para mayores de 18 años';
  static readonly URL_LINE_TEXT = 'www.juegoseguro.es';

  /** The three mandated warnings, each rendered as exactly 3 `.es-cp__line` spans — confirmed live. */
  static readonly WARNING_LINES: Record<'1' | '2' | '3', string[]> = {
    '1': ['La ludopatía es', 'un riesgo', 'del juego'],
    '2': ['La probabilidad de ser un', 'jugador que pierde dinero', 'es del 75 %'],
    '3': ['Las pérdidas del total de', 'jugadores superan en', '4 veces sus ganancias'],
  };

  readonly overlay: Locator; // .es-cp
  readonly dialog: Locator; // .es-cp__dialog
  readonly closeButton: Locator;
  readonly frame: Locator;
  readonly content: Locator;
  readonly warning: Locator; // the <p> containing the 3 line spans
  readonly lines: Locator; // the individual .es-cp__line spans
  readonly ageLink: Locator;
  readonly urlLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.overlay = page.locator('.es-cp');
    this.dialog = this.overlay.locator('.es-cp__dialog');
    this.closeButton = this.overlay.locator('.es-cp__close');
    this.frame = this.overlay.locator('.es-cp__frame');
    this.content = this.overlay.locator('.es-cp__content');
    this.warning = this.overlay.locator('.es-cp__warning');
    this.lines = this.overlay.locator('.es-cp__line');
    this.ageLink = this.overlay.locator('.es-cp__age');
    this.urlLink = this.overlay.locator('.es-cp__url');
  }

  /** Which of the 3 warnings sessionStorage recorded for this visit ("1" | "2" | "3" | null). */
  async warningNumber(): Promise<string | null> {
    return this.page.evaluate(() => sessionStorage.getItem('es_compliance_popup_warning'));
  }

  /** Whether the "already shown this visit" flag has been persisted (only set after the full dwell). */
  async seenFlagSet(): Promise<boolean> {
    return this.page.evaluate(() => sessionStorage.getItem('es_compliance_popup_seen') === '1');
  }

  /** dataLayer entries for this popup being shown, in the order pushed. */
  async shownAnalyticsEvents(): Promise<Array<{ event: string; warning_number: number }>> {
    return this.page.evaluate(() =>
      (window as any).dataLayer?.filter((e: any) => e && e.event === 'es_compliance_popup_shown') ?? [],
    );
  }

  /**
   * White content area as a fraction of the visible viewport — the GDCU-9469
   * sizing rule ("white area >= 15% of window width x height, frame and
   * border not counted").
   */
  async contentAreaRatio(): Promise<number> {
    const [contentBox, viewport] = await Promise.all([
      this.content.boundingBox(),
      this.page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight })),
    ]);
    if (!contentBox) return 0;
    return (contentBox.width * contentBox.height) / (viewport.w * viewport.h);
  }
}
