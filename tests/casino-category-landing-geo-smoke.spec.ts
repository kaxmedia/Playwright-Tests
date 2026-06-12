import { test, expect } from '@playwright/test';

const geos = [
  { geo: 'UK', path: '/uk/online-casinos', currency: 'GBP' },
  { geo: 'IE', path: '/ie/online-casinos', currency: 'EUR' },
  { geo: 'CA', path: '/ca/online-casinos', currency: 'CAD' },
  { geo: 'NZ', path: '/nz/online-casinos', currency: 'NZD' },
  { geo: 'US', path: '/us/online-casinos', currency: 'USD' },
  { geo: 'DE', path: '/de/online-casinos', currency: 'EUR' },
  { geo: 'NL', path: '/nl/online-casinos', currency: 'EUR' },
  { geo: 'AT', path: '/at/online-casinos', currency: 'EUR' },
  { geo: 'IN', path: '/in/online-casinos', currency: 'INR' },
  { geo: 'GR', path: '/gr/online-casinos', currency: 'EUR' },
  { geo: 'BE', path: '/be/online-casinos', currency: 'EUR' },
];

for (const { geo, path } of geos) {
  test(`@smoke ${geo} ${path} loads with H1 and operator list`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response?.ok(), `${path} response should be ok`).toBeTruthy();

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const h1Text = await h1.innerText();
    expect(h1Text.trim()).not.toBe('');

    const operators = page.locator('li.operator-item');
    expect(await operators.count()).toBeGreaterThanOrEqual(5);
  });
}
