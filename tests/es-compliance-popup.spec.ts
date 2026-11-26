import { test, expect } from '../fixtures/test';
import { AgeVerificationPage } from '../pages/AgeVerificationPage';
import { CompliancePopupPage } from '../pages/CompliancePopupPage';

// ─────────────────────────────────────────────────────────────────────────────
// ES Compliance Popup — GDCU-9469
//
// Spain requires a "responsible gambling" warning pop-up on the first page a
// user opens under /es, shown once per visit, right after the existing age
// gate is passed. Covers the acceptance criteria from the ticket:
//
//   - shows on first page of a visit, right after age verification, never
//     at the same time as it
//   - one of three mandated warnings is picked, each followed by the fixed
//     "18+" / juegoseguro.es lines, both linking out correctly
//   - an analytics event records which of the three was shown
//   - does not reappear mid-visit (reload, or a different /es page) once
//     the minimum display time has been recorded — but DOES reappear if the
//     user left before that time was up
//   - a new visit (new browser context) shows it again
//   - the close "X" cannot dismiss it before the minimum display time, and
//     can afterwards
//   - sizing (>= 15% of the viewport) holds on desktop, tablet and mobile
//   - never shown on any other geo
//
// Intentionally not asserted (see pages/CompliancePopupPage.ts header): the
// ticket's literal "font: Helvetica Bold" and "all text in lowercase" wording
// — production renders the site's own bold brand font and normal sentence
// case, not those literal properties, so tests assert the actual canonical
// copy and a bold weight instead of the ticket's exact phrasing.
//
// Each test drives the real flow via AgeVerificationPage (gotoFresh +
// acceptAge) rather than the auto-dismiss handler other suites use — this
// suite is testing the popup itself, not working around it.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('ES Compliance Popup (GDCU-9469)', () => {
  let avPage: AgeVerificationPage;
  let popup: CompliancePopupPage;

  test.beforeEach(async ({ page }) => {
    avPage = new AgeVerificationPage(page, 'es');
    popup = new CompliancePopupPage(page);
    await avPage.gotoFresh();
  });

  // ── Sequencing with the age gate ─────────────────────────────────────────

  test('@smoke @regression age verification modal appears first; compliance popup is not shown yet', async () => {
    await expect(avPage.modal).toBeVisible({ timeout: 10000 });
    await expect(popup.overlay).toHaveCount(0);
  });

  test('@smoke @regression compliance popup appears right after accepting age verification, never together with it', async () => {
    await expect(avPage.acceptBtn).toBeVisible({ timeout: 10000 });
    await avPage.acceptAge();
    await expect(avPage.modal).toBeHidden({ timeout: 8000 });
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    // Still hidden now that the popup is up — the two must never overlap.
    await expect(avPage.modal).toBeHidden();
  });

  // ── Dialog semantics & content ───────────────────────────────────────────

  test('@regression popup has correct dialog ARIA semantics', async () => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    await expect(popup.dialog).toHaveAttribute('role', 'dialog');
    await expect(popup.dialog).toHaveAttribute('aria-modal', 'true');
    await expect(popup.dialog).toHaveAttribute('aria-labelledby', 'es-cp-warning');
    await expect(popup.warning).toHaveAttribute('id', 'es-cp-warning');
  });

  test('@smoke @regression warning shown is one of the three mandated compliance messages', async () => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });

    const warningNumber = await popup.warningNumber();
    expect(['1', '2', '3']).toContain(warningNumber);

    const renderedLines = await popup.lines.allInnerTexts();
    expect(renderedLines).toEqual(CompliancePopupPage.WARNING_LINES[warningNumber as '1' | '2' | '3']);

    await expect(popup.ageLink).toHaveText(CompliancePopupPage.AGE_LINE_TEXT);
    await expect(popup.urlLink).toHaveText(CompliancePopupPage.URL_LINE_TEXT);
  });

  test('@smoke @regression the 18+ and juegoseguro.es lines both link to juegoseguro.es in a new tab', async () => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });

    for (const link of [popup.ageLink, popup.urlLink]) {
      await expect(link).toHaveAttribute('href', CompliancePopupPage.TARGET_URL);
      await expect(link).toHaveAttribute('target', '_blank');
      const rel = (await link.getAttribute('rel')) ?? '';
      expect(rel).toContain('noopener');
    }
  });

  test('@regression an analytics event is pushed with the warning number matching the one shown', async () => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    const warningNumber = await popup.warningNumber();

    await expect.poll(async () => (await popup.shownAnalyticsEvents()).length, { timeout: 3000 }).toBeGreaterThan(0);
    const events = await popup.shownAnalyticsEvents();
    expect(events).toHaveLength(1);
    expect(events[0].warning_number).toBe(Number(warningNumber));
  });

  test('@regression popup sits above everything else on the page, including the cookie banner', async () => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    const style = await popup.overlay.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { zIndex: Number(cs.zIndex), position: cs.position };
    });
    expect(style.position).toBe('fixed');
    // Deliberately max-int z-index per the live implementation — assert a
    // very high floor rather than the exact constant, so this isn't brittle
    // to a harmless future tweak while still catching "no longer on top".
    expect(style.zIndex).toBeGreaterThan(2_000_000_000);
  });

  test('@regression popup matches the mandated frame, background and text styling', async () => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });

    const frameStyle = await popup.frame.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { borderWidth: cs.borderTopWidth, borderColor: cs.borderTopColor, borderStyle: cs.borderTopStyle };
    });
    expect(frameStyle.borderStyle).toBe('solid');
    expect(frameStyle.borderWidth).toBe('18px');
    expect(frameStyle.borderColor).toBe('rgb(0, 0, 0)');

    const contentStyle = await popup.content.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { bg: cs.backgroundColor, color: cs.color, fontWeight: Number(cs.fontWeight) };
    });
    expect(contentStyle.bg).toBe('rgb(255, 255, 255)');
    expect(contentStyle.color).toBe('rgb(0, 0, 0)');
    expect(contentStyle.fontWeight).toBeGreaterThanOrEqual(700);
  });

  // ── Close behaviour / minimum display time ───────────────────────────────

  test('@smoke @regression close button cannot dismiss the popup before the minimum display time', async ({ page }) => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    await expect(popup.closeButton).toBeDisabled();

    // `force: true` bypasses Playwright's own actionability wait (which would
    // otherwise just hang on a disabled control) but still fires a real
    // mouse click through the browser, so this exercises the app's actual
    // guard rather than Playwright refusing to click a disabled button.
    await popup.closeButton.click({ force: true });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, 5); // outside the frame
    await expect(popup.overlay).toBeVisible();
    expect(await popup.seenFlagSet()).toBe(false);
  });

  test('@smoke @regression close button dismisses the popup once the minimum display time has passed', async () => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    await expect(popup.closeButton).toBeEnabled({ timeout: CompliancePopupPage.MIN_DWELL_MS + 3000 });
    await popup.closeButton.click();
    await expect(popup.overlay).toBeHidden({ timeout: 3000 });
  });

  // ── Once-per-visit persistence ───────────────────────────────────────────

  test('@regression popup does not reappear on reload once the minimum display time has been recorded', async ({ page }) => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    await expect.poll(() => popup.seenFlagSet(), { timeout: CompliancePopupPage.MIN_DWELL_MS + 3000 }).toBe(true);

    await avPage.gotoWithCookies();
    await page.waitForTimeout(1500); // give a late popup time to mount if it were going to
    await expect(popup.overlay).toBeHidden();
  });

  test('@regression popup does not reappear on a different /es page in the same session', async ({ page }) => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    await expect.poll(() => popup.seenFlagSet(), { timeout: CompliancePopupPage.MIN_DWELL_MS + 3000 }).toBe(true);

    await page.goto('https://www.gambling.com/es/casinos-online/bonos-sin-deposito');
    await page.waitForTimeout(1500);
    await expect(popup.overlay).toBeHidden();
  });

  test('@regression leaving the page before the minimum display time shows the popup again on the next page', async ({ page }) => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    // Confirm we're genuinely leaving inside the dwell window, before "seen" is recorded.
    expect(await popup.seenFlagSet()).toBe(false);

    await page.goto('https://www.gambling.com/es/casinos-online/bonos-sin-deposito');
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });
  });

  test('@regression the three warnings are picked at random — not hardcoded to always the same one', async ({ page }) => {
    await avPage.acceptAge();
    await expect(popup.overlay).toBeVisible({ timeout: 8000 });

    // "Cap loops over dynamic content at 10 iterations" — framework convention.
    // With a true 1-in-3 random pick, seeing only one value after 10 fresh
    // visits has probability (1/3)^9 ~= 0.002% — negligible flake risk.
    const MAX_SAMPLES = 10;
    const seen = new Set<string>();
    for (let i = 0; i < MAX_SAMPLES; i++) {
      const warningNumber = await popup.warningNumber();
      expect(['1', '2', '3'], `sample ${i}: unexpected warning number "${warningNumber}"`).toContain(warningNumber);
      if (warningNumber) seen.add(warningNumber);
      if (seen.size > 1) break; // enough evidence it isn't hardcoded

      await page.evaluate(() => {
        sessionStorage.removeItem('es_compliance_popup_warning');
        sessionStorage.removeItem('es_compliance_popup_seen');
      });
      await page.reload();
      await expect(popup.overlay).toBeVisible({ timeout: 8000 });
    }

    expect(seen.size, `only ever saw warning(s) ${[...seen].join(', ')} across ${MAX_SAMPLES} fresh visits`).toBeGreaterThan(1);
  });

  test('@regression a new visit (new browser context) shows the popup again', async ({ browser }) => {
    const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
    try {
      for (const ctx of contexts) {
        const p = await ctx.newPage();
        const av = new AgeVerificationPage(p, 'es');
        const cp = new CompliancePopupPage(p);
        await av.gotoFresh();
        await av.acceptAge();
        await expect(cp.overlay).toBeVisible({ timeout: 8000 });
      }
    } finally {
      await Promise.all(contexts.map((ctx) => ctx.close()));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sizing — GDCU-9469: white content area must be >= 15% of the visible
// viewport (frame and outer border not counted), on desktop, tablet and
// mobile. Example windows from the ticket: 1440x900 desktop -> >= ~540x360;
// 390x844 phone -> >= ~300x165.
// ─────────────────────────────────────────────────────────────────────────────
for (const [label, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['tablet', { width: 768, height: 1024 }],
  ['mobile', { width: 390, height: 844 }],
] as const) {
  test.describe(`ES Compliance Popup — sizing (${label})`, () => {
    test.use({ viewport });

    test(`@regression white content area is at least 15% of the viewport — ${label}`, async ({ page }) => {
      const avPage = new AgeVerificationPage(page, 'es');
      const popup = new CompliancePopupPage(page);
      await avPage.gotoFresh();
      await avPage.acceptAge();
      await expect(popup.overlay).toBeVisible({ timeout: 8000 });

      const ratio = await popup.contentAreaRatio();
      expect(ratio).toBeGreaterThanOrEqual(0.15);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Not shown on other geos — this is an ES-only legal requirement.
// ─────────────────────────────────────────────────────────────────────────────
test.describe('ES Compliance Popup — not shown on other geos', () => {
  test('@smoke @regression .es-cp never renders on NL or UK', async ({ page }) => {
    for (const path of ['/nl', '/uk/online-casinos']) {
      await page.goto(`https://www.gambling.com${path}`);
      await expect(page.locator('.es-cp')).toHaveCount(0);
    }
  });
});
