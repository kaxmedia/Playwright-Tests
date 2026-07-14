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

for (const config of configs) {
  test(`@visual ${config.geo} ${config.slug} operator list renders deterministically`, async ({ page }) => {
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
