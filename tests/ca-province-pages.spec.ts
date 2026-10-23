import { test, expect } from '../fixtures/test';

// ─── Canada province casino pages ─────────────────────────────────────────────
//
// /ca/online-casinos/{alberta,ontario,british-columbia,quebec}. Live-verified 2026-10-23 (two loads
// each, identical): every page loads with its own title, its provincial regulator/lottery in the
// copy, and an operator list. Ontario is the regulated market: iGaming Ontario + AGCO in the copy,
// its own operator list (PartyCasino, OLG), and ConnexOntario linked from the page body.
//
// NOT asserted, because the live site doesn't have it (reported, not encoded as failing tests):
//   - Alberta / BC / Quebec link no province-specific help resource (e.g. Alberta Health Services).
//     The only helpline link on those pages is the ConnexOntario logo in the shared CA footer.
//   - The BC H1 reads "BRITISH COLOMBIA", so the province name is checked via the title instead.
// ─────────────────────────────────────────────────────────────────────────────

const PROVINCES = [
  { slug: 'alberta', name: 'Alberta', regulator: /\bAGLC\b/ },
  { slug: 'ontario', name: 'Ontario', regulator: /iGaming Ontario/ },
  { slug: 'british-columbia', name: 'British Columbia', regulator: /\bBCLC\b/ },
  { slug: 'quebec', name: 'Quebec', regulator: /Loto-Qu[ée]bec/ },
];

// Each page has two <main> elements (a small empty one first); the content lives in this one.
const pageBody = 'main.body_content';
const operatorCards = `${pageBody} .operator-list:not([data-disabled]) .operator-item`;

for (const province of PROVINCES) {
  test.describe(`Canada — ${province.name} online casinos`, () => {
    test.beforeEach(async ({ page }) => {
      const res = await page.goto(`/ca/online-casinos/${province.slug}`, { waitUntil: 'domcontentloaded' });
      expect(res?.status(), `/ca/online-casinos/${province.slug} did not load`).toBe(200);
    });

    test(`@smoke @regression ${province.name} page loads with a province title, H1 and operator list`, async ({ page }) => {
      await expect(page).toHaveTitle(new RegExp(province.name, 'i'));
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator(operatorCards).first()).toBeVisible({ timeout: 15000 });
    });

    test(`@regression ${province.name} page references its provincial gambling authority`, async ({ page }) => {
      await expect(page.locator(pageBody)).toContainText(province.regulator);
    });
  });
}

test.describe('Canada — Ontario regulated-market specifics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ca/online-casinos/ontario', { waitUntil: 'domcontentloaded' });
    await expect(page.locator(operatorCards).first()).toBeVisible({ timeout: 15000 });
  });

  test('@regression Ontario copy references iGaming Ontario and the AGCO', async ({ page }) => {
    const main = page.locator(pageBody);
    await expect(main).toContainText('iGaming Ontario');
    await expect(main).toContainText(/AGCO|Alcohol and Gaming Commission of Ontario/);
  });

  test('@regression Ontario operator list includes Ontario-regulated brands (PartyCasino, OLG)', async ({ page }) => {
    const names = await page.locator(`${operatorCards} img`).evaluateAll((imgs) =>
      imgs.map((img) => (img.getAttribute('alt') || '').trim()).filter(Boolean),
    );
    expect(names.some((n) => /party/i.test(n)), `PartyCasino not in the Ontario list: ${names.slice(0, 15).join(', ')}…`).toBe(true);
    expect(names.some((n) => /\bOLG\b|proline/i.test(n)), `OLG not in the Ontario list: ${names.slice(0, 15).join(', ')}…`).toBe(true);
  });

  test('@regression Ontario page body links to ConnexOntario', async ({ page }) => {
    // The page body, not the shared CA footer logo, which links ConnexOntario on every province page.
    await expect(page.locator(`${pageBody} a[href*="connexontario.ca"]`).first()).toBeAttached();
  });
});
