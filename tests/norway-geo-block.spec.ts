import { test, expect, type Page } from '../fixtures/test';

// ─── Norway CTA geo-block (GDCU-9138 / GDCU-9194) ─────────────────────────────
//
// Visitors from outside Norway must not get a live affiliate CTA on /no operator lists: each
// operator row swaps its Play button for "Offer not available for your location" (aria-disabled,
// pointer-events:none) and carries no /go/ link. The blocked state is server-rendered: the raw HTML
// already has it. CI runners and the office are both outside Norway, so this suite always runs as a
// blocked visitor. Run from a Norwegian IP it would fail by design.
//
// MARKET REDIRECT DISABLED: separately from the Norway block, a site-wide script sends visitors whose
// IP country has its own market (BR/DE/ES/GR/IT/NL/RO/SE/DK/BE) from any other market's page to their
// own homepage, about 1s after DOMContentLoaded. The office egress IP geolocates to DE, so locally every
// /no page jumped to /de mid-test (a race, not a result). CI's US runners aren't redirected. The script
// skips bot user agents ("headless", ...), so it's switched off by appending that token to
// navigator.userAgent in page JS only. Requests still carry the real browser UA.
//
// QUICK PICKER EXCLUDED: the homepage quick picker (div.gdc-quick-pick, "Hvor vil du spille?") does
// NOT apply the geo-block. Its cards show a live "Spill Nå" /go/ CTA to every visitor. This is a
// known, accepted gap, not a bug: confirmed with the Norway team (Slack, 2026-10-27). Its cards reuse
// the .operator-item / .operator-list classes, so they're excluded explicitly below. Without that, a
// bare .operator-item selector would pick them up and fail this suite.
//
// NOT COVERED: the slot-game grid on /no/spilleautomater (div.gdc-filterable, hover "Play For Real"
// /go/ links) also isn't blocked (seen live 2026-10-27). Whether that's intended hasn't been confirmed,
// so it's neither asserted nor excluded as accepted.
//
// Live-verified 2026-10-27 from a DE IP: every operator row outside the quick picker was blocked on
// all 14 /no oplist pages sampled, across both list layouts (primary .cf-primary-operator-list and
// secondary .automation-secondary-oplist).
// ─────────────────────────────────────────────────────────────────────────────

const BLOCKED_TEXT = 'Offer not available for your location';

const PAGES = [
  { path: '/no/nettcasino', list: 'primary' },
  { path: '/no/nettcasino/nye-casinoer', list: 'primary' },
  { path: '/no/bonuser/100-kr-casino', list: 'primary' },
  { path: '/no/spilleautomater', list: 'secondary' },
];

type Row = { operator: string; blocked: boolean; ariaDisabled: boolean; goLinks: number };

/** Every operator row on the page EXCEPT quick-picker cards (see header: accepted gap). */
async function operatorRowsOutsideQuickPicker(page: Page): Promise<Row[]> {
  return page.evaluate((blockedText) => {
    return Array.from(document.querySelectorAll<HTMLElement>('.operator-item'))
      .filter((row) => !row.closest('.gdc-quick-pick'))
      .map((row) => {
        const blockedCta = Array.from(row.querySelectorAll('a')).find((a) => a.textContent?.trim() === blockedText);
        return {
          operator: row.querySelector('[data-operator]')?.getAttribute('data-operator') ?? row.innerText.trim().slice(0, 30),
          blocked: !!blockedCta,
          ariaDisabled: blockedCta?.getAttribute('aria-disabled') === 'true',
          goLinks: row.querySelectorAll('a[href*="/go/"]').length,
        };
      });
  }, BLOCKED_TEXT);
}

for (const { path, list } of PAGES) {
  test(`@regression Norway geo-block: ${path} (${list} oplist) shows no live operator CTA to non-NO visitors`, async ({ page }) => {
    // Disable the unrelated market redirect (see header).
    await page.addInitScript(() => {
      const ua = navigator.userAgent;
      Object.defineProperty(navigator, 'userAgent', { get: () => `${ua} headless` });
    });
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    expect(page.url(), `${path} redirected away: the market-redirect bypass stopped working`).toContain(path);

    // Wait for the list to render before reading it.
    await expect.poll(async () => (await operatorRowsOutsideQuickPicker(page)).length, {
      message: `no operator rows found on ${path}: the oplist markup changed`,
      timeout: 30_000,
    }).toBeGreaterThan(0);

    const rows = await operatorRowsOutsideQuickPicker(page);
    const live = rows.filter((r) => !r.blocked || !r.ariaDisabled || r.goLinks > 0);
    expect(
      live,
      `${live.length}/${rows.length} operator rows on ${path} are NOT geo-blocked ` +
        `(expected "${BLOCKED_TEXT}", aria-disabled, and no /go/ link)`,
    ).toEqual([]);
  });
}
