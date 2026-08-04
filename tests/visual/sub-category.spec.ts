import { test, expect } from '../../fixtures/test';

const configs = [
  { geo: 'UK', path: '/uk/online-casinos/new', slug: 'new' },
  { geo: 'IE', path: '/ie/online-casinos/apps', slug: 'apps' },
  { geo: 'UK', path: '/uk/online-casinos/slots', slug: 'slots' },
  { geo: 'UK', path: '/uk/online-casinos/paypal', slug: 'paypal' },
  { geo: 'UK', path: '/uk/online-casinos/paysafecard', slug: 'paysafecard' },
  { geo: 'UK', path: '/uk/online-casinos/fastest-withdrawal', slug: 'fastest-withdrawal' },
  { geo: 'IN', path: '/in/online-casinos/live', slug: 'live' },
];

// ALL 7 combos are SKIPPED: the test captures the FIRST operator card (`li.operator-item`.first()),
// which rotates between baseline capture and CI verification — content rotation, not a rendering
// regression. Confirmed 2026-08-04 by a baseline-vs-CI-actual cross-check (visual run 30916045182):
// the position-1 operator differed from the committed baseline in 6/7 combos — e.g. IN live
// Casino Days → Casino Khajana, IE apps Kingmaker → SlotRave, UK paysafecard Mega Riches → Paddy
// Power, UK paypal Mega Riches → Mr Vegas, UK slots Mega Riches → Peachy Games, UK fastest-withdrawal
// Lucky VIP → Betano. (UK new was the same operator, Ivy Casino, but sits in the same rotating list.)
// Root cause is the unmapped-region ("GX") CI egress IP seeing a different operator ranking than real
// users — the durable fix is a mapped-region CI IP, NOT per-combo rebaselining (which would just
// freeze today's rotation and fail on the next). House rule: rotation ⇒ test.skip, never rebaseline
// or mask the operator logo/name. See the GX-region datacenter-IP backlog note.
for (const config of configs) {
  test.skip(`@visual ${config.geo} ${config.slug} operator list renders deterministically`, async ({ page }) => {
    const response = await page.goto(config.path, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `${config.path} response should be ok`).toBeTruthy();
    await expect(page.locator('li.operator-item').first()).toBeVisible();
    await expect(page.locator('li.operator-item').first()).toHaveScreenshot(
      `${config.geo.toLowerCase()}-${config.slug}.png`, {
        mask: [
          page.locator('.cky-banner-bottom'),
          page.locator('.operator-column-bonus-v2'),
          page.locator('.promo-code'),
        ],
        maxDiffPixelRatio: 0.04,
      }
    );
  });
}
