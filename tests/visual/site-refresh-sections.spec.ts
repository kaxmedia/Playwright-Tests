import { test, expect, type Locator, type Page } from '../../fixtures/test';

// ─── Site Refresh sections (redesign shipping since v_184) ────────────────────
//
// Element-level coverage for the redesigned sections that had none:
//   - homepages.spec.ts captures only the first viewport, and SKIPS the global homepage (/)
//     entirely as known-unstable, so the redesigned global hero, banners and FAQ were never
//     compared;
//   - no visual spec captured any FAQ.
//
// Element screenshots (not the whole viewport) keep each check scoped to one section, so the
// rotating parts of the page that make whole-page captures flaky can't fail these. Live-verified
// 2026-10-23 on all 4 visual projects: every section below was pixel-identical across two fresh
// loads (0.00% diff) once the floating navigation was hidden.
//
// Deliberately NOT covered: the "Featured in" press-logo strip (section.ghp-aso — rotates, 4-8% per
// load, already masked elsewhere) and the local-homepage "Get Unrestricted Access" banner (23% diff
// between loads on /ie).
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS = [
  { name: 'root-hero', path: '/', selector: '.ghp-hero-shell' },
  { name: 'root-compare-banner', path: '/', selector: '.global-home-cmp__banner' },
  { name: 'root-rewards-banner', path: '/', selector: '.global-home-rewb__banner' },
  { name: 'root-faq', path: '/', selector: 'section.global-home-faq' },
  { name: 'uk-best-sites-faq', path: '/uk/online-casinos/best-sites', selector: '.automation-faq-container' },
  { name: 'ie-casinos-faq', path: '/ie/online-casinos', selector: '.automation-faq-container' },
];

/**
 * The sticky header, sub-nav and quick-links bar are position:fixed/sticky, so once a lower section
 * is scrolled into view they're painted over its top edge in an element screenshot (seen live: they
 * hid the FAQ heading and first question). Hide every fixed/sticky element that isn't the section
 * or one of its ancestors; visibility keeps the layout unchanged.
 */
async function hideFloatingChrome(section: Locator): Promise<void> {
  await section.evaluate((target) => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const position = getComputedStyle(el).position;
      if ((position === 'fixed' || position === 'sticky') && !el.contains(target)) {
        el.style.setProperty('visibility', 'hidden', 'important');
      }
    }
  });
}

async function openStable(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  // Capped: in CI the global homepage's 'load' event (every image, ad and tracker) can take longer
  // than the whole test budget (first capture run timed out with the hero already fully rendered).
  // Each test waits for its own section to be visible instead, which is what an element shot needs.
  await page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {});
  // The region prompt is HIDDEN, not dismissed. On the global homepage in CI it can't be closed (every
  // fallback in dismissRegionPromptModal times out), and the auto region-prompt locator handler then
  // re-fires before every action AND assertion, so the test froze until its timeout. Confirmed from
  // the CI traces of runs 39975366794 / 39980946428. It's an overlay, irrelevant to these sections,
  // and once hidden the handler never fires.
  await page.addStyleTag({
    content: [
      '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
      '[aria-labelledby="region-prompt-modal-heading"] { display: none !important; }',
      // Hidden rather than masked: the banner is fixed to the viewport bottom, so a mask was painted
      // over 9-44% of each section (worst on mobile) in the first captured baselines.
      '.cky-consent-container, .cky-banner-bottom { display: none !important; }',
    ].join('\n'),
  });
}

for (const section of SECTIONS) {
  test(`@visual Site Refresh ${section.name} (${section.path}) renders deterministically`, async ({ page }) => {
    test.setTimeout(120_000);
    await openStable(page, section.path);

    const el = page.locator(section.selector).first();
    await expect(el, `${section.selector} not found on ${section.path} — the redesign markup changed`).toBeVisible({ timeout: 30_000 });
    await el.scrollIntoViewIfNeeded();
    // Lower sections lazy-load their images once scrolled to.
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await hideFloatingChrome(el);

    await expect(el).toHaveScreenshot(`${section.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: 0.02,
      timeout: 30_000,
    });
  });
}
