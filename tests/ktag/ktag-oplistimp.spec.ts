/**
 * tests/ktag/ktag-oplistimp.spec.ts
 *
 * Tests for the `oplistimp` ktag event — fired on page load when one or more
 * operator lists are rendered. Section 8.2 of the Ktag Event Payloads doc.
 *
 * Key characteristic: ONE oplistimp event covers ALL oplists on the page.
 * Each oplistimp_N key is an ARRAY of item objects (not an object with
 * initial_items — that's a count string inside each item).
 */

import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertOplistimpSpecific,
  assertPageviewIdChain,
  findEvent,
} from '../helpers/ktag-assertions';

// A category/listing page that is guaranteed to have at least one operator list
const OPLIST_PAGE = 'https://www.gambling.com/uk/online-casinos';

test.describe('Ktag — oplistimp event @ktag @oplistimp @regression', () => {

  test('oplistimp fires on a page with operator lists', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    const event = await waitForKtagEvent('oplistimp');
    assertBaseline(event, 'oplistimp');
    assertOplistimpSpecific(event);
  });

  test('oplistimp_1 is a non-empty array', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    const event = await waitForKtagEvent('oplistimp');

    expect(Array.isArray(event.oplistimp_1)).toBe(true);
    expect((event.oplistimp_1 as unknown[]).length).toBeGreaterThan(0);
  });

  test('each oplistimp_1 item has required bedrock fields', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    const event = await waitForKtagEvent('oplistimp');

    const items = event.oplistimp_1 as Record<string, unknown>[];
    expect(items.length).toBeGreaterThan(0);

    for (const [i, item] of items.entries()) {
      // List-level metadata — repeated on every item
      expect(item.listid, `item[${i}].listid`).toBeDefined();
      expect(item.listtype, `item[${i}].listtype`).toBeDefined();
      expect(item.oplist_index, `item[${i}].oplist_index`).toBeDefined();

      // Per-item fields
      expect(item.operator_item_id, `item[${i}].operator_item_id`).toBeDefined();
      expect(item.operator, `item[${i}].operator`).toBeDefined();
      expect(item.product, `item[${i}].product`).toBeDefined();
      expect(item.position, `item[${i}].position`).toBeDefined();
      expect(item.offer, `item[${i}].offer`).toBeDefined();

      // Brand / offer FK — ~98%
      expect(item.brand_id, `item[${i}].brand_id`).toBeDefined();
    }
  });

  test('oplistimp: initial_items is a string count when present, not an array @negative', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    const event = await waitForKtagEvent('oplistimp');

    const items = event.oplistimp_1 as Record<string, unknown>[];
    for (const [i, item] of items.entries()) {
      if (item.initial_items !== undefined) {
        // Must be a string count like "20", not an array
        expect(typeof item.initial_items, `item[${i}].initial_items should be a string`).toBe('string');
        expect(Array.isArray(item.initial_items),
          `item[${i}].initial_items must NOT be an array`).toBe(false);
        expect(Number(item.initial_items),
          `item[${i}].initial_items must be a numeric string`).not.toBeNaN();
      }
    }
  });

  test('oplistimp shares pageview_id with the preceding pageview event', async ({ page, ktagEvents }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForTimeout(3000); // allow both events to settle

    const pvEvent = findEvent(ktagEvents, 'pageview', e => !e.aclid);
    const opEvent = findEvent(ktagEvents, 'oplistimp');

    expect(pvEvent).toBeDefined();
    expect(opEvent).toBeDefined();

    assertPageviewIdChain(pvEvent!, opEvent!, 'oplistimp');
  });

  test('oplistimp: pageview_fired is set', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    const event = await waitForKtagEvent('oplistimp');
    expect(event.pageview_fired).toBeTruthy();
  });

  test('oplistimp: only one oplistimp event fires per page load', async ({ page, ktagEvents }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForTimeout(3000);

    const opEvents = ktagEvents.filter(e => e.ct === 'oplistimp');
    // A single event should cover all oplists via oplistimp_1, oplistimp_2, etc.
    expect(opEvents.length).toBe(1);
  });

  test('oplistimp: multiple oplists appear as oplistimp_1, oplistimp_2, etc.', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    const event = await waitForKtagEvent('oplistimp');

    // oplistimp_1 must always exist on pages with lists
    expect(event.oplistimp_1).toBeDefined();

    // If a second list is present, oplistimp_2 should also be an array
    if (event.oplistimp_2 !== undefined) {
      expect(Array.isArray(event.oplistimp_2)).toBe(true);
    }
  });

  test('oplistimp: item positions are sequential starting from 1', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(OPLIST_PAGE);
    const event = await waitForKtagEvent('oplistimp');

    const items = event.oplistimp_1 as Record<string, unknown>[];
    const positions = items.map(item => Number(item.position)).sort((a, b) => a - b);

    // Positions should start at 1 and be sequential
    expect(positions[0]).toBe(1);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBe(positions[i - 1] + 1);
    }
  });
});
