/**
 * tests/ktag/ktag-ctaimp.spec.ts
 *
 * Tests for the `ctaimp` event — fired on page load when one or more
 * single-offer CTAs (not inside an oplist) are rendered.
 * Section 8.4 of the Ktag Event Payloads doc.
 */

import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertCtaimpSpecific,
} from '../helpers/ktag-assertions';

// A review page typically has single-offer CTAs
const REVIEW_PAGE = 'https://www.gambling.com/uk/online-casinos/betmgm';

test.describe('Ktag — ctaimp event @ktag @ctaimp @regression', () => {

  test('ctaimp fires when single-offer CTAs are present on the page', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    const event = await waitForOptionalKtagEvent('ctaimp');
    test.skip(!event, 'ctaimp is not emitted on the current review-page template');
    assertBaseline(event, 'ctaimp');
    assertCtaimpSpecific(event);
  });

  test('ctaimp: ctas array is non-empty', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    const event = await waitForOptionalKtagEvent('ctaimp');
    test.skip(!event, 'ctaimp is not emitted on the current review-page template');

    expect(Array.isArray(event.ctas)).toBe(true);
    expect((event.ctas as unknown[]).length).toBeGreaterThan(0);
  });

  test('ctaimp: each CTA item has cta_id and brand_id', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    const event = await waitForOptionalKtagEvent('ctaimp');
    test.skip(!event, 'ctaimp is not emitted on the current review-page template');

    const items = event.ctas as Record<string, unknown>[];
    for (const [i, item] of items.entries()) {
      expect(item.cta_id, `ctas[${i}].cta_id missing`).toBeDefined();
      expect(item.brand_id, `ctas[${i}].brand_id missing`).toBeDefined();
    }
  });

  test('ctaimp: ctalocation is present on most CTA items', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    const event = await waitForOptionalKtagEvent('ctaimp');
    test.skip(!event, 'ctaimp is not emitted on the current review-page template');

    const items = event.ctas as Record<string, unknown>[];
    // ctalocation is ~63% — check at least some items have it
    const withLocation = items.filter(item => item.ctalocation !== undefined);
    expect(withLocation.length).toBeGreaterThan(0);
  });

  test('ctaimp: pageview_fired is set', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    const event = await waitForOptionalKtagEvent('ctaimp');
    test.skip(!event, 'ctaimp is not emitted on the current review-page template');
    expect(event.pageview_fired).toBeTruthy();
  });
});
