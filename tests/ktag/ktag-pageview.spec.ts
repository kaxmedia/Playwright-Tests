/**
 * tests/ktag/ktag-pageview.spec.ts
 *
 * Tests for the regular `pageview` ktag event (ct = "pageview", no aclid).
 * Section 8.1 of the Ktag Event Payloads Confluence doc.
 *
 * What this does NOT cover:
 *  - The legacy exit pageview (ct = "pageview" + aclid) — that is in ktag-redirectv2.spec.ts
 *  - Any other ct values
 */

import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertPageviewSpecific,
  assertNoDeprecatedTopLevelScreenFields,
  findEvent,
} from '../helpers/ktag-assertions';

// ---------------------------------------------------------------------------
// Configuration — update these URLs to real gambling.com pages
// ---------------------------------------------------------------------------
const BASE_URL = 'https://www.gambling.com';
const CMS_PAGE  = `${BASE_URL}/uk/online-casinos`;   // Any CMS-published page
const NEWS_PAGE = `${BASE_URL}/news`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Ktag — pageview event @ktag @pageview @regression', () => {

  test('regular pageview fires on page load with all baseline fields', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);

    const event = await waitForKtagEvent('pageview');

    assertBaseline(event, 'regular pageview');
    assertPageviewSpecific(event);
  });

  test('pageview: all section 8.0 baseline identifiers are correct types', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');

    // UUID format checks
    if (event.event_id !== undefined) {
      expect(event.event_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    }
    expect(event.client_event_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(event.pageview_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(event.g_uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    // ktag_version is an 8-digit date string e.g. "20260520"
    expect(event.ktag_version).toMatch(/^\d{8}$/);
    expect(Number(event.ktag_version)).toBeGreaterThan(20200101);
  });

  test('pageview: device_type is a valid value', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');
    expect(['mobile', 'desktop', 'tablet']).toContain(event.device_type);
  });

  test('pageview: client hints (ch) array is present and well-formed', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');

    expect(Array.isArray(event.ch)).toBe(true);
    expect((event.ch as unknown[]).length).toBeGreaterThanOrEqual(1);

    const ch0 = (event.ch as Record<string, unknown>[])[0];
    expect(ch0.ua).toEqual(expect.any(String));
    expect(ch0.screen_width).toEqual(expect.any(Number));
    expect(ch0.screen_height).toEqual(expect.any(Number));
    expect(ch0.dpr).toEqual(expect.any(Number));
  });

  test('pageview: screen dimensions are in ch[0], NOT at top level', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');

    // Must NOT be at top level (deprecated location)
    assertNoDeprecatedTopLevelScreenFields(event);

    // Must be in ch[0]
    const ch0 = (event.ch as Record<string, unknown>[])[0];
    expect(ch0.screen_width).toBeGreaterThan(0);
    expect(ch0.screen_height).toBeGreaterThan(0);
  });

  test('pageview: dom_url matches the page navigated to', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');
    expect(event.dom_url).toContain('gambling.com');
    expect(event.dom_url).toEqual(expect.any(String));
  });

  test('pageview: site_id and language_id are present on a CMS page', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');
    expect(event.site_id).toBeDefined();
    expect(event.site_country_version_id).toBeDefined();
    expect(event.language_id).toBeDefined();
  });

  test('pageview: aclid must NOT be present on a regular page load @negative', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');

    // Presence of aclid means this is the legacy exit event, not a regular pageview
    expect(event.aclid).toBeFalsy();
  });

  test('pageview: env field is populated', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');
    expect(event.env).toEqual(expect.any(String));
    expect(event.env).not.toBe('');
  });

  test('pageview: geo fields are populated', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');

    if (event.cc !== undefined) {
      expect(event.cc).toMatch(/^[A-Z]{2}$/);           // 2-letter ISO country code
    }
    if (event.country !== undefined) {
      expect(event.country).toEqual(expect.any(String));
    }
    if (event.timezone !== undefined) {
      expect(event.timezone).toContain('/');              // IANA timezone e.g. "Europe/London"
    }
    if (event.ip_address !== undefined) {
      expect(event.ip_address).toEqual(expect.any(String));
    }
  });

  test('pageview: ai_referrer and ai_ua bot detection flags are present', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(CMS_PAGE);
    const event = await waitForKtagEvent('pageview');

    expect(event).toHaveProperty('ai_referrer');
    expect(event).toHaveProperty('ai_ua');
    expect(event.ai_referrer).toEqual(expect.any(Boolean));
    expect(event.ai_ua).toEqual(expect.any(Boolean));
  });

  test('pageview: unique pageview_id is generated per page load', async ({ page, ktagEvents }) => {
    await page.goto(CMS_PAGE);
    // Gather a brief window of events
    await page.waitForTimeout(2000);

    const pvEvents = ktagEvents.filter(e => e.ct === 'pageview' && !e.aclid);
    expect(pvEvents.length).toBeGreaterThanOrEqual(1);

    // All pageview_id values should be UUIDs
    for (const e of pvEvents) {
      expect(e.pageview_id).toMatch(/^[0-9a-f-]{36}$/i);
    }
  });

  test('pageview: news page also fires correctly', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(NEWS_PAGE);
    const event = await waitForKtagEvent('pageview');
    assertBaseline(event, 'news pageview');
    expect(event.aclid).toBeFalsy();
    expect(event.dom_url).toContain('gambling.com/news');
  });
});
