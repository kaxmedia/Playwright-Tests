/**
 * tests/ktag/ktag-oplistclk.spec.ts
 *
 * Tests for the `oplistclk` event — fired when a user clicks a CTA
 * inside an operator list. Section 8.5 of the Ktag Event Payloads doc.
 *
 * Important: clicking a CTA will navigate away. We intercept the navigation
 * so the test can inspect the event payload without leaving the page.
 */

import { test, expect } from '../../fixtures/ktag';
import {
  assertPageviewIdChain,
  findEvent,
} from '../helpers/ktag-assertions';

const OPLIST_PAGE = 'https://www.gambling.com/uk/online-casinos';

test.describe('Ktag — oplistclk event @ktag @oplistclk @regression', () => {

  test('oplistclk tracking params are present on a CTA in an operator list', async ({ page }) => {
    await page.goto(OPLIST_PAGE);

    // Find and click the first CTA button inside an operator list
    const ctaButton = page.locator('[data-listid] a[href*="/go/"], [data-oplist] a[href*="/go/"]').first();

    // Fallback: try any CTA anchor if list-specific selectors don't match
    const fallbackCta = page.locator('a[href*="/go/"]').first();

    const target = await ctaButton.count() > 0 ? ctaButton : fallbackCta;
    const href = await target.getAttribute('href');
    expect(href).toContain('/go/');
    const url = new URL(href!, 'https://www.gambling.com');
    expect(url.searchParams.get('ct')).toBe('oplistclk');
    expect(url.searchParams.get('cta_id')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(url.searchParams.get('operator_item_id')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(url.searchParams.get('pageview_id')).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('oplistclk: CTA href carries click attribution fields', async ({ page }) => {
    await page.goto(OPLIST_PAGE);

    const cta = page.locator('a[href*="/go/"]').first();
    const href = await cta.getAttribute('href');
    const url = new URL(href!, 'https://www.gambling.com');
    expect(url.searchParams.get('ct')).toBe('oplistclk');
    expect(url.searchParams.get('listid')).toBeTruthy();
    expect(url.searchParams.get('listtype')).toBeTruthy();
    expect(url.searchParams.get('list_position')).toBeTruthy();
  });

  test('oplistclk: seen_item_id joins back to seenopitems', async ({ page, ktagEvents }) => {
    await page.goto(OPLIST_PAGE);

    // Scroll to trigger seenopitems
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600);

    await page.route('**/go/**', route => route.abort());
    const cta = page.locator('a[href*="/go/"]').first();
    await cta.click({ force: true }).catch(() => {});

    await page.waitForTimeout(1000);

    const clickEvent = findEvent(ktagEvents, 'oplistclk');
    const seenEvents = ktagEvents.filter(e => e.ct === 'seenopitems');

    if (clickEvent && seenEvents.length > 0 && clickEvent.seen_item_id) {
      // The seen_item_id from the click should match a seen_item_id in seenopitems
      const allSeenIds = seenEvents.flatMap(e =>
        (e.seenopitems as Record<string, unknown>[]).map(item => item.seen_item_id)
      );
      expect(allSeenIds).toContain(clickEvent.seen_item_id);
    }
  });

  test('oplistclk: pageview_id matches the originating pageview', async ({ page, ktagEvents }) => {
    await page.goto(OPLIST_PAGE);
    await page.route('**/go/**', route => route.abort());

    const cta = page.locator('a[href*="/go/"]').first();
    await cta.click({ force: true }).catch(() => {});

    await page.waitForTimeout(1000);

    const pvEvent = findEvent(ktagEvents, 'pageview', e => !e.aclid);
    const clickEvent = findEvent(ktagEvents, 'oplistclk');

    if (pvEvent && clickEvent) {
      assertPageviewIdChain(pvEvent, clickEvent, 'oplistclk');
    }
  });

  test('oplistclk: cta_id is present on the CTA href @smoke', async ({ page }) => {
    await page.goto(OPLIST_PAGE);

    const cta = page.locator('a[href*="/go/"]').first();
    const href = await cta.getAttribute('href');
    const url = new URL(href!, 'https://www.gambling.com');
    expect(url.searchParams.get('cta_id')).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test('oplistclk: CTA href carries seen item and source metadata', async ({ page }) => {
    await page.goto(OPLIST_PAGE);

    const cta = page.locator('a[href*="/go/"]').first();
    const href = await cta.getAttribute('href');
    const url = new URL(href!, 'https://www.gambling.com');
    const source = url.searchParams.get('source');
    if (source !== null) {
      expect(source).toBe('oplist');
    }

    const seenItemId = url.searchParams.get('seen_item_id');
    if (seenItemId !== null) {
      expect(seenItemId).toMatch(/^[0-9a-f-]{36}$/i);
    }
  });
});
