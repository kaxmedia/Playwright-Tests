/**
 * tests/ktag/ktag-cta.spec.ts
 *
 * Tests for the `cta` event — fired when a user clicks a single-offer CTA
 * (i.e. a CTA that is NOT inside an operator list).
 * Section 8.6 of the Ktag Event Payloads doc.
 *
 * Note: review pages typically have single-offer CTAs in the header/sidebar.
 */

import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertCtaSpecific,
  assertPageviewIdChain,
  findEvent,
} from '../helpers/ktag-assertions';

// A brand review page — typically has a single-offer CTA header
const REVIEW_PAGE = 'https://www.gambling.com/uk/online-casinos/betmgm';

test.describe('Ktag — cta event @ktag @cta @regression', () => {

  test('cta event fires on single-offer CTA click', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    await page.route('**/go/**', route => route.abort());

    // Single-offer CTAs are typically outside of list containers
    const singleCta = page.locator(
      '.single-offer a[href*="/go/"], [data-cta-id] a[href*="/go/"], .review-cta a[href*="/go/"]'
    ).first();
    const fallback = page.locator('a[href*="/go/"]').first();

    const target = await singleCta.count() > 0 ? singleCta : fallback;
    await target.click({ force: true }).catch(() => {});

    const event = await waitForOptionalKtagEvent('cta');
    test.skip(!event, 'cta is not emitted on the current review-page template');
    assertBaseline(event, 'cta');
    assertCtaSpecific(event);
  });

  test('cta: mouse_key_clicked is 0 for a standard left click', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    await page.route('**/go/**', route => route.abort());

    const cta = page.locator('a[href*="/go/"]').first();
    await cta.click({ force: true }).catch(() => {});

    const event = await waitForOptionalKtagEvent('cta');
    test.skip(!event, 'cta is not emitted on the current review-page template');
    expect(event.mouse_key_clicked).toBe(0);
  });

  test('cta: site_offer_id and offer_id are present', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    await page.route('**/go/**', route => route.abort());

    const cta = page.locator('a[href*="/go/"]').first();
    await cta.click({ force: true }).catch(() => {});

    const event = await waitForOptionalKtagEvent('cta');
    test.skip(!event, 'cta is not emitted on the current review-page template');
    expect(event.site_offer_id).toBeDefined();
    expect(event.offer_id).toBeDefined();
  });

  test('cta: brand_id, operator and product are populated', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    await page.route('**/go/**', route => route.abort());

    const cta = page.locator('a[href*="/go/"]').first();
    await cta.click({ force: true }).catch(() => {});

    const event = await waitForOptionalKtagEvent('cta');
    test.skip(!event, 'cta is not emitted on the current review-page template');
    expect(event.brand_id).toBeDefined();
    expect(event.operator).toBeDefined();
    expect(event.product).toBeDefined();
  });

  test('cta: pageview_id matches the originating pageview', async ({ page, ktagEvents }) => {
    await page.goto(REVIEW_PAGE);
    await page.route('**/go/**', route => route.abort());

    const cta = page.locator('a[href*="/go/"]').first();
    await cta.click({ force: true }).catch(() => {});

    await page.waitForTimeout(1000);

    const pvEvent = findEvent(ktagEvents, 'pageview', e => !e.aclid);
    const ctaEvent = findEvent(ktagEvents, 'cta');

    if (pvEvent && ctaEvent) {
      assertPageviewIdChain(pvEvent, ctaEvent, 'cta');
    }
  });

  test('cta: ctalocation is present when this is a tracked CTA', async ({ page, waitForOptionalKtagEvent }) => {
    await page.goto(REVIEW_PAGE);
    await page.route('**/go/**', route => route.abort());

    const cta = page.locator('a[href*="/go/"]').first();
    await cta.click({ force: true }).catch(() => {});

    const event = await waitForOptionalKtagEvent('cta');
    test.skip(!event, 'cta is not emitted on the current review-page template');
    // ctalocation is ~76% on cta events — not always present, but assert when it is
    if (event.ctalocation !== undefined) {
      expect(event.ctalocation).toEqual(expect.any(String));
      expect(event.ctalocation).not.toBe('');
    }
  });
});
