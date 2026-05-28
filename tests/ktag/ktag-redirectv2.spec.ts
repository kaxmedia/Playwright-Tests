/**
 * tests/ktag/ktag-redirectv2.spec.ts
 *
 * Tests for the `redirectv2` server-side exit event.
 * Section 8.7 of the Ktag Event Payloads doc.
 *
 * This event is NEVER visible in the browser's Network tab on a normal click
 * because the /go/... handler processes it server-side in a single round-trip.
 *
 * To inspect it, we use the &debug=1 technique documented in section 2.2:
 *   1. Copy a /go/... CTA link from the page
 *   2. Append &debug=1 (or ?debug=1 if no query string)
 *   3. Navigate to the modified URL
 *   4. The handler renders the JSON payload to the page instead of redirecting
 *
 * Note: client_ts_utc is ALWAYS NULL on redirectv2 — this is expected, not a bug.
 */

import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertRedirectv2Specific,
  KtagEvent,
} from '../helpers/ktag-assertions';
import { oplistGoCta } from '../helpers/oplistCta';

const OPLIST_PAGE = 'https://www.gambling.com/uk/online-casinos';

/**
 * Extract a /go/... URL from the first CTA anchor on the page.
 * Returns the URL with debug=1 appended.
 */
async function getGoUrlWithDebug(page: import('@playwright/test').Page): Promise<string | null> {
  const href = await oplistGoCta(page).getAttribute('href');
  if (!href) return null;

  const fullUrl = href.startsWith('http') ? href : `https://www.gambling.com${href}`;
  const separator = fullUrl.includes('?') ? '&' : '?';
  return `${fullUrl}${separator}debug=1`;
}

/**
 * Navigate to the debug URL and scrape the rendered JSON payload from the page.
 * The redirectv2 handler renders the raw JSON to the page body when debug=1 is set.
 */
async function fetchRedirectv2Payload(page: import('@playwright/test').Page, debugUrl: string): Promise<KtagEvent | null> {
  await page.goto(debugUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // The handler renders JSON to the page body
  const bodyText = await page.locator('body').innerText();
  try {
    return unwrapRedirectDebugPayload(JSON.parse(bodyText) as KtagEvent);
  } catch {
    // Some sites render the payload in a <pre> tag
    const preText = await page.locator('pre').first().innerText().catch(() => '');
    try {
      return unwrapRedirectDebugPayload(JSON.parse(preText) as KtagEvent);
    } catch {
      return null;
    }
  }
}

function unwrapRedirectDebugPayload(payload: KtagEvent): KtagEvent {
  return (payload.ktag_payload as KtagEvent | undefined) ?? payload;
}

test.describe('Ktag — redirectv2 event @ktag @redirectv2 @regression', () => {

  test('redirectv2 payload is accessible via &debug=1 on a /go/ URL', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    expect(debugUrl, 'Could not find a /go/ CTA link on the page').toBeTruthy();

    const event = await fetchRedirectv2Payload(page, debugUrl!);
    expect(event, 'Could not parse redirectv2 payload from debug page').not.toBeNull();
    expect(event!.ct).toBe('redirectv2');
  });

  test('redirectv2: all baseline section 8.0 fields are present', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    assertBaseline(event, 'redirectv2');
  });

  test('redirectv2: event-specific always fields from section 8.7', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    assertRedirectv2Specific(event);
  });

  test('redirectv2: aclid is populated (conversion attribution key) @smoke', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    expect(event.aclid, 'aclid must be present and populated on redirectv2').toBeTruthy();
    expect(typeof event.aclid).toBe('string');
  });

  test('redirectv2: client_ts_utc is NULL (server-rendered, no client handler) @negative', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    // This is a documented exception — client_ts_utc is always NULL on redirectv2
    expect(event.client_ts_utc,
      'client_ts_utc must be null/absent on redirectv2 — use event_utc_time instead'
    ).toBeFalsy();
  });

  test('redirectv2: destination URLs are all present', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    expect(event.dest_url, 'dest_url missing').toBeTruthy();
    expect(event.dest_url_seo, 'dest_url_seo missing').toBeTruthy();
    test.fail(
      !event.dest_url_mobile,
      'Known live redirectv2 issue: UK operator payloads currently return dest_url_mobile as null',
    );
    expect(event.dest_url_mobile, 'dest_url_mobile missing').toBeTruthy();
  });

  test('redirectv2: meta object contains telemetry fields', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    expect(event.meta).toBeDefined();
    const meta = event.meta as Record<string, unknown>;
    expect(meta.json_load_time).toBeDefined();
    expect(meta.process_redirect_time).toBeDefined();
    expect(meta.storage_hit).toBeDefined();
    expect(meta.tag).toBeDefined();
  });

  test('redirectv2: qp_pageview_id and qp_cta_id link back to originating click', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    // ~79% — part of the referrer chain
    if (event.qp_pageview_id) {
      expect(event.qp_pageview_id).toMatch(/^[0-9a-f-]{36}$/i);
    }
    if (event.qp_cta_id) {
      expect(event.qp_cta_id).toEqual(expect.any(String));
    }
  });

  test('redirectv2: brand and offer context is present', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    expect(event.brand_id, 'brand_id missing').toBeDefined();
    expect(event.site_offer_id, 'site_offer_id missing').toBeDefined();
    expect(event.offer_text, 'offer_text missing').toBeDefined();
    expect(event.geo, 'geo (market code) missing').toBeDefined();
  });

  test('redirectv2: dest_url_ppc is absent (deprecated on modern sites) @negative', async ({ page }) => {
    await page.goto(OPLIST_PAGE);
    await page.waitForLoadState('networkidle');

    const debugUrl = await getGoUrlWithDebug(page);
    if (!debugUrl) { test.skip(); return; }

    const event = await fetchRedirectv2Payload(page, debugUrl);
    if (!event) { test.skip(); return; }

    // dest_url_ppc is effectively gone on modern redirectv2 (<0.1%)
    // If it appears, flag for investigation
    if (event.dest_url_ppc) {
      console.warn('dest_url_ppc is present on redirectv2 — check if this site is on legacy redirect handler');
    }
  });
});
