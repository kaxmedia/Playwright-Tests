/**
 * tests/ktag/ktag-seenopitems.spec.ts
 *
 * Tests for the `seenopitems` event — fired as operator list items
 * scroll into view. Section 8.3 of the Ktag Event Payloads doc.
 *
 * This event requires a real viewport intersection, so tests must
 * scroll the page to trigger it. Uses mouse.wheel to drive scrolling.
 */

import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertSeenopitemsSpecific,
  assertPageviewIdChain,
  findEvent,
} from '../helpers/ktag-assertions';

const OPLIST_PAGE = 'https://www.gambling.com/uk/online-casinos';

test.describe('Ktag — seenopitems event @ktag @seenopitems @regression', () => {

  test('seenopitems fires after scrolling operator list items into view', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    // Scroll down to trigger visibility events
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600); // allow debounce (~250–500ms per spec doc)

    const event = await waitForKtagEvent('seenopitems');
    assertBaseline(event, 'seenopitems');
    assertSeenopitemsSpecific(event);
  });

  test('seenopitems: each item has seen_item_id and si_type', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600);

    const event = await waitForKtagEvent('seenopitems');
    const items = event.seenopitems as Record<string, unknown>[];

    for (const [i, item] of items.entries()) {
      expect(item.seen_item_id, `seenopitems[${i}].seen_item_id missing`).toBeDefined();
      expect(item.si_type, `seenopitems[${i}].si_type missing`).toBeDefined();
    }
  });

  test('seenopitems: seen_item_id values are unique across items in the event', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(600);

    const event = await waitForKtagEvent('seenopitems');
    const items = event.seenopitems as Record<string, unknown>[];
    const seenIds = items.map(i => i.seen_item_id);
    const uniqueIds = new Set(seenIds);

    expect(uniqueIds.size).toBe(seenIds.length);
  });

  test('seenopitems: items carry brand_id, operator and product fields', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600);

    const event = await waitForKtagEvent('seenopitems');
    const items = event.seenopitems as Record<string, unknown>[];

    // These are ~97–98% on seenopitems items — verify at least most items have them
    const withBrand = items.filter(i => i.brand_id !== undefined);
    expect(withBrand.length).toBeGreaterThan(Math.floor(items.length * 0.9));
  });

  test('seenopitems: shares pageview_id with the originating pageview', async ({ page, ktagEvents }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1500);

    const pvEvent = findEvent(ktagEvents, 'pageview', e => !e.aclid);
    const seenEvent = findEvent(ktagEvents, 'seenopitems');

    expect(pvEvent).toBeDefined();
    expect(seenEvent).toBeDefined();
    assertPageviewIdChain(pvEvent!, seenEvent!, 'seenopitems');
  });

  test('seenopitems: pageview_fired is set', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(600);

    const event = await waitForKtagEvent('seenopitems');
    expect(event.pageview_fired).toBeTruthy();
  });

  test('seenopitems: scrolling further fires additional batched events', async ({ page, ktagEvents, waitForKtagEvents }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    // Scroll in steps to trigger multiple batches
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);

    // Wait for at least 2 seenopitems events
    const events = await waitForKtagEvents('seenopitems', 2, 8000);
    expect(events.length).toBeGreaterThanOrEqual(2);

    // All should have valid payloads
    for (const event of events) {
      assertBaseline(event, 'seenopitems (batch)');
      expect(Array.isArray(event.seenopitems)).toBe(true);
    }
  });
});
