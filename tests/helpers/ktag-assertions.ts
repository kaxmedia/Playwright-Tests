/**
 * helpers/ktag-assertions.ts
 *
 * Assertion helpers for ktag events, organised to mirror the QA reference
 * tables in the Ktag Event Payloads Confluence page (section 8).
 *
 * Usage:
 *   import { assertBaseline, assertPageviewSpecific, ... } from '../helpers/ktag-assertions';
 *
 *   assertBaseline(event);              // Section 8.0 — runs on EVERY event
 *   assertPageviewSpecific(event);      // Section 8.1
 *   assertOplistimpSpecific(event);     // Section 8.2
 *   // ... etc
 */

import { expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KtagEvent = Record<string, unknown>;

// ---------------------------------------------------------------------------
// 8.0 — Baseline (assert on EVERY event regardless of ct)
// ---------------------------------------------------------------------------

/**
 * Assert that all "Always" fields from section 8.0 are present and
 * correctly typed. Call this on every captured event before any
 * event-specific assertions.
 */
export function assertBaseline(event: KtagEvent, context = ''): void {
    const ctx = context ? ` [${context}]` : '';

    // --- Identifiers ---
    expect(event.ct, `ct missing${ctx}`).toEqual(expect.any(String));
    if (event.event_id !== undefined) {
        expect(event.event_id, `event_id malformed${ctx}`).toMatch(/^[0-9a-f-]{36}$/i);
    }
    expect(event.client_event_id, `client_event_id missing${ctx}`).toMatch(/^[0-9a-f-]{36}$/i);
    expect(event.pageview_id, `pageview_id missing${ctx}`).toMatch(/^[0-9a-f-]{36}$/i);
    expect(event.g_uuid, `g_uuid missing${ctx}`).toMatch(/^[0-9a-f-]{36}$/i);
    expect(event.g_sid, `g_sid missing${ctx}`).toEqual(expect.any(String));
    // ga_cid: key must be present; value may be null
    expect(event, `ga_cid key missing${ctx}`).toHaveProperty('ga_cid');
    expect(event.cohort_id, `cohort_id missing${ctx}`).toBeDefined();
    if (event.cohort_name !== undefined) {
        expect(event.cohort_name, `cohort_name malformed${ctx}`).toEqual(expect.any(String));
    }
    expect(event.ktag_version, `ktag_version missing${ctx}`).toMatch(/^\d{8}$/);
    if (event.env !== undefined) {
        expect(event.env, `env malformed${ctx}`).toEqual(expect.any(String));
    }

    // --- Timestamps ---
    if (event.ct === 'redirectv2') {
        expect(event.event_utc_time, `event_utc_time missing${ctx}`).toBeTruthy();
    } else {
        expect(event.client_ts, `client_ts missing${ctx}`).toEqual(expect.any(Number));
        expect(event.client_ts_utc, `client_ts_utc missing${ctx}`).toBeTruthy();
    }
    if (event.event_utc_time !== undefined) {
        expect(event.event_utc_time, `event_utc_time malformed${ctx}`).toEqual(expect.any(String));
    }
    if (event.clicked_ts !== undefined) {
        expect(event.clicked_ts, `clicked_ts malformed${ctx}`).toEqual(expect.any(String));
    }

    // --- Page / URL ---
    expect(event.dom_url, `dom_url missing${ctx}`).toEqual(expect.any(String));
    const optionalUrlFields = [
        'dom_url_clean', 'dom_title', 'dom_pathname', 'dom_domain', 'dom_lang',
        'dom_ua', 'dom_query_string', 'dom_hash', 'dom_referrer', 'referrer_url',
        'referrer_url_clean', 'request_referer',
    ];
    for (const field of optionalUrlFields) {
        if (event[field] !== undefined && event[field] !== null) {
            expect(event[field], `${field} malformed${ctx}`).toEqual(expect.any(String));
        }
    }

    // --- Device ---
    expect(['mobile', 'desktop', 'tablet'], `device_type unexpected value${ctx}`)
        .toContain(event.device_type);
    expect(event.device_os, `device_os missing${ctx}`).toEqual(expect.any(String));
    if (event.ct !== 'redirectv2') {
        expect(event, `incognito key missing${ctx}`).toHaveProperty('incognito');
    }

    // --- Geo / network ---
    const geoStringFields = [
        'ip_address', 'country', 'cc', 'region', 'region_code',
        'continent', 'latitude', 'longitude', 'timezone', 'colo',
    ];
    for (const field of geoStringFields) {
        if (event[field] !== undefined && event[field] !== null) {
            expect(event[field], `${field} malformed${ctx}`).toEqual(expect.any(String));
        }
    }
    if (event.asn !== undefined) {
        expect(event.asn, `asn malformed${ctx}`).toEqual(expect.any(Number));
    }

    // --- Client Hints (ch array) ---
    if (event.ch !== undefined) {
        expect(Array.isArray(event.ch), `ch must be an array${ctx}`).toBe(true);
        expect((event.ch as unknown[]).length, `ch must have at least 1 entry${ctx}`)
            .toBeGreaterThanOrEqual(1);

        const ch0 = (event.ch as KtagEvent[])[0];
        expect(ch0.ua, `ch[0].ua missing${ctx}`).toEqual(expect.any(String));
        expect(ch0.screen_width, `ch[0].screen_width missing${ctx}`).toEqual(expect.any(Number));
        expect(ch0.screen_height, `ch[0].screen_height missing${ctx}`).toEqual(expect.any(Number));
        expect(ch0.dpr, `ch[0].dpr missing${ctx}`).toEqual(expect.any(Number));

        const chBoolFields = [
            'forcedColors', 'prefersColorScheme', 'prefersContrast',
            'prefersReducedData', 'prefersReducedMotion', 'support',
        ];
        for (const field of chBoolFields) {
            expect(ch0, `ch[0].${field} key missing${ctx}`).toHaveProperty(field);
        }
    }

    // --- Bot / AI detection ---
    if (event.ct !== 'redirectv2') {
        expect(event, `ai_referrer key missing${ctx}`).toHaveProperty('ai_referrer');
        expect(event, `ai_ua key missing${ctx}`).toHaveProperty('ai_ua');
    }

    // --- Deprecated top-level screen dimensions should NOT be asserted ---
    // (they live in ch[0] on modern ktag — see section 4.4)
}

// ---------------------------------------------------------------------------
// Negative: fields that must NEVER appear at top level
// ---------------------------------------------------------------------------

/**
 * Assert that deprecated top-level screen fields are absent.
 * Modern ktag moves these into ch[0]. If they appear at top level it
 * indicates the page is running an old ktag version.
 */
export function assertNoDeprecatedTopLevelScreenFields(event: KtagEvent): void {
    expect(event.screen_width,
        'screen_width must not appear at top level — use ch[0].screen_width').toBeUndefined();
    expect(event.screen_height,
        'screen_height must not appear at top level — use ch[0].screen_height').toBeUndefined();
}

// ---------------------------------------------------------------------------
// 8.1 — pageview (regular page load)
// ---------------------------------------------------------------------------

export function assertPageviewSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('pageview');

    // site_id, site_country_version_id, language_id — present on ~96% (CMS pages)
    // Assert when testing a CMS-published page
    expect(event.site_id, 'site_id missing on CMS page').toBeDefined();
    expect(event.site_country_version_id, 'site_country_version_id missing').toBeDefined();
    expect(event.language_id, 'language_id missing').toBeDefined();

    // gtm_unique_event_id — ~88%
    expect(event.gtm_unique_event_id, 'gtm_unique_event_id missing').toEqual(expect.any(Number));

    // MUST NOT be present — aclid would indicate this is the legacy exit event
    expect(event.aclid,
        'aclid must NOT be present on a regular pageview (signals legacy exit event)').toBeFalsy();
}

// ---------------------------------------------------------------------------
// 8.2 — oplistimp
// ---------------------------------------------------------------------------

export function assertOplistimpSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('oplistimp');
    expect(event.pageview_fired, 'pageview_fired missing on oplistimp').toBeTruthy();

    // oplistimp_1 must be a non-empty array on pages with operator lists
    expect(Array.isArray(event.oplistimp_1),
        'oplistimp_1 must be an array').toBe(true);
    expect((event.oplistimp_1 as unknown[]).length,
        'oplistimp_1 must contain at least 1 item').toBeGreaterThan(0);

    // Assert bedrock fields on each item
    const items = event.oplistimp_1 as KtagEvent[];
    for (const [i, item] of items.entries()) {
        const ctx = `oplistimp_1[${i}]`;
        assertOplistimpItem(item, ctx);
    }
}

function assertOplistimpItem(item: KtagEvent, context: string): void {
    const listMetaFields = [
        'listid', 'listtype', 'listlocation', 'listlength',
        'version', 'parentlistid', 'oplist_index',
    ];
    for (const field of listMetaFields) {
        expect(item[field], `${field} missing on ${context}`).toBeDefined();
    }

    const itemFields = ['operator_item_id', 'operator', 'product', 'position', 'offer'];
    for (const field of itemFields) {
        expect(item[field], `${field} missing on ${context}`).toBeDefined();
    }

    // ~98% — brand / offer foreign keys
    expect(item.brand_id, `brand_id missing on ${context}`).toBeDefined();
    expect(item.brand_product_id, `brand_product_id missing on ${context}`).toBeDefined();
    expect(item.site_offer_id, `site_offer_id missing on ${context}`).toBeDefined();
    expect(item.offer_id, `offer_id missing on ${context}`).toBeDefined();
}

// ---------------------------------------------------------------------------
// 8.3 — seenopitems
// ---------------------------------------------------------------------------

export function assertSeenopitemsSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('seenopitems');
    expect(event.pageview_fired, 'pageview_fired missing on seenopitems').toBeTruthy();

    expect(Array.isArray(event.seenopitems),
        'seenopitems must be an array').toBe(true);
    expect((event.seenopitems as unknown[]).length,
        'seenopitems must have at least 1 item').toBeGreaterThan(0);

    const items = event.seenopitems as KtagEvent[];
    for (const [i, item] of items.entries()) {
        const ctx = `seenopitems[${i}]`;
        expect(item.seen_item_id, `seen_item_id missing on ${ctx}`).toBeDefined();
        expect(item.si_type, `si_type missing on ${ctx}`).toBeDefined();
        // ~98%
        expect(item.brand_id, `brand_id missing on ${ctx}`).toBeDefined();
        // ~97%
        expect(item.operator, `operator missing on ${ctx}`).toBeDefined();
        expect(item.product, `product missing on ${ctx}`).toBeDefined();
        // ~96%
        expect(item.offer, `offer missing on ${ctx}`).toBeDefined();
        // ~95%
        expect(item.offer_id, `offer_id missing on ${ctx}`).toBeDefined();
        expect(item.site_offer_id, `site_offer_id missing on ${ctx}`).toBeDefined();
    }
}

// ---------------------------------------------------------------------------
// 8.4 — ctaimp
// ---------------------------------------------------------------------------

export function assertCtaimpSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('ctaimp');
    expect(event.pageview_fired, 'pageview_fired missing on ctaimp').toBeTruthy();

    expect(Array.isArray(event.ctas), 'ctas must be an array').toBe(true);
    expect((event.ctas as unknown[]).length,
        'ctas must have at least 1 item').toBeGreaterThan(0);

    const items = event.ctas as KtagEvent[];
    for (const [i, item] of items.entries()) {
        const ctx = `ctas[${i}]`;
        expect(item.cta_id, `cta_id missing on ${ctx}`).toBeDefined();
        // ~98%
        expect(item.brand_id, `brand_id missing on ${ctx}`).toBeDefined();
    }
}

// ---------------------------------------------------------------------------
// 8.5 — oplistclk
// ---------------------------------------------------------------------------

export function assertOplistclkSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('oplistclk');

    // ~100% — brand / offer context
    const alwaysFields = [
        'cta_id', 'brand_id', 'brand_product_id', 'site_offer_id',
        'offer_id', 'operator', 'product',
    ];
    for (const field of alwaysFields) {
        expect(event[field], `${field} missing on oplistclk`).toBeDefined();
    }

    // DOM click metadata
    expect(event.htmlnode, 'htmlnode missing on oplistclk').toBeDefined();
    expect(event.clickon, 'clickon missing on oplistclk').toBeDefined();
    expect([0, 1, 2], 'mouse_key_clicked must be 0, 1 or 2')
        .toContain(event.mouse_key_clicked);

    expect(event.pageview_fired, 'pageview_fired missing on oplistclk').toBeTruthy();

    // ~99.6%
    expect(event.offer, 'offer missing on oplistclk').toBeDefined();
    // ~99.5%
    expect(event.oplist_index, 'oplist_index missing on oplistclk').toBeDefined();
    expect(event.position, 'position missing on oplistclk').toBeDefined();
    // ~98.9%
    expect(event.seen_item_id, 'seen_item_id missing on oplistclk').toBeDefined();
    // ~98.7%
    expect(event.version, 'version missing on oplistclk').toBeDefined();
    expect(event.listid, 'listid missing on oplistclk').toBeDefined();
    // ~98.6%
    expect(event.operator_item_id, 'operator_item_id missing on oplistclk').toBeDefined();
}

// ---------------------------------------------------------------------------
// 8.6 — cta (single-offer CTA click)
// ---------------------------------------------------------------------------

export function assertCtaSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('cta');

    expect([0, 1, 2], 'mouse_key_clicked must be 0, 1 or 2')
        .toContain(event.mouse_key_clicked);
    expect(event.pageview_fired, 'pageview_fired missing on cta').toBeTruthy();

    // ~99.3%
    expect(event.htmlnode, 'htmlnode missing on cta').toBeDefined();
    expect(event.clickon, 'clickon missing on cta').toBeDefined();
    // ~99.1%
    expect(event.site_offer_id, 'site_offer_id missing on cta').toBeDefined();
    // ~99%
    expect(event.offer_id, 'offer_id missing on cta').toBeDefined();
    // ~98%
    expect(event.product, 'product missing on cta').toBeDefined();
    expect(event.operator, 'operator missing on cta').toBeDefined();
    expect(event.brand_id, 'brand_id missing on cta').toBeDefined();
}

// ---------------------------------------------------------------------------
// 8.7 — redirectv2 (modern server-side exit)
// ---------------------------------------------------------------------------

export function assertRedirectv2Specific(event: KtagEvent): void {
    expect(event.ct).toBe('redirectv2');

    // EXCEPTION: client_ts_utc is always NULL on redirectv2
    // (overrides the baseline — already handled in assertBaseline)
    expect(event.client_ts_utc).toBeFalsy(); // Must be null/undefined/empty

    // ~100%
    expect(event.aclid, 'aclid missing on redirectv2 — conversion key').toBeTruthy();
    expect(event.pageview_id, 'pageview_id missing on redirectv2').toMatch(/^[0-9a-f-]{36}$/i);

    const brandFields = [
        'brand_id', 'brand_product_id', 'site_brand_id',
        'site_offer_id', 'offer_id', 'offer_text',
    ];
    for (const field of brandFields) {
        expect(event[field], `${field} missing on redirectv2`).toBeDefined();
    }

    expect(event.geo, 'geo missing on redirectv2').toEqual(expect.any(String));
    expect(event.meta, 'meta object missing on redirectv2').toBeDefined();
    const meta = event.meta as KtagEvent;
    const metaFields = [
        'json_load_time', 'json_lookup_time', 'json_size', 'json_url',
        'process_redirect_time', 'storage_hit', 'storage_lookup_time', 'tag',
    ];
    for (const field of metaFields) {
        expect(meta, `meta.${field} key missing`).toHaveProperty(field);
    }

    // Destination URLs
    expect(event.dest_url, 'dest_url missing').toEqual(expect.any(String));
    expect(event.dest_url_seo, 'dest_url_seo missing').toEqual(expect.any(String));
    expect(event, 'dest_url_mobile key missing').toHaveProperty('dest_url_mobile');
    // ~99.5%
    expect(event.dest_url_tc, 'dest_url_tc missing').toBeDefined();
    // ~96%
    expect(event.dest_url_deeplink, 'dest_url_deeplink missing').toBeDefined();
}

// ---------------------------------------------------------------------------
// 8.10 — udc (User Data Capture)
// ---------------------------------------------------------------------------

/**
 * Valid `ds` discriminator values for udc events.
 */
const VALID_UDC_DS_VALUES = [
    'email subscription',
    'user registration',
    'email confirmation',
    'user login',
    'competition entry',
    'site registration',
    'subscribe_form',
] as const;

export function assertUdcSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('udc');

    // ds must be one of the known discriminator values
    expect(VALID_UDC_DS_VALUES, `ds="${event.ds}" is not a known udc discriminator`)
        .toContain(event.ds);

    // ~99.9%
    expect(event.email_sha256, 'email_sha256 missing on udc').toBeDefined();
    expect(event.email_sha256).toMatch(/^[a-f0-9]{64}$/i); // SHA-256 hex

    // ~90%
    expect(event.qp_utm_source, 'qp_utm_source missing on udc').toBeDefined();
    expect(event.qp_utm_medium, 'qp_utm_medium missing on udc').toBeDefined();
    expect(event.qp_utm_campaign, 'qp_utm_campaign missing on udc').toBeDefined();
}

/**
 * Assert that OAuth tokens must NOT leak into udc events.
 * This is a known defect in the social-login flow (section 5.10).
 * A passing test should see NONE of these fields.
 */
export function assertNoOAuthTokensOnUdc(event: KtagEvent): void {
    expect(event.ct).toBe('udc');

    const forbiddenFields = [
        'qp_access_token',
        'qp_refresh_token',
        'qp_provider_token',
        'qp_token_type',
        'qp_expires_at',
        'qp_expires_in',
        'qp_rtid',
        'qp_sb',
    ];

    for (const field of forbiddenFields) {
        expect(event[field],
            `OAuth token "${field}" must NOT be present on udc event — FE must strip it before ktag fires`
        ).toBeUndefined();
    }
}

// ---------------------------------------------------------------------------
// 8.9 — gacid
// ---------------------------------------------------------------------------

export function assertGacidSpecific(event: KtagEvent): void {
    expect(event.ct).toBe('gacid');
    expect(event.pageview_fired, 'pageview_fired missing on gacid').toBeTruthy();

    // On gacid specifically, ga_cid must be non-null (unlike other events)
    expect(event.ga_cid,
        'ga_cid must be non-null on a gacid event — this event exists specifically to relay it'
    ).toBeTruthy();
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Find a specific event by ct value in a list of captured events.
 * Optionally provide a predicate for further filtering (e.g. !event.aclid).
 */
export function findEvent(
    events: KtagEvent[],
    ct: string,
    predicate?: (e: KtagEvent) => boolean
): KtagEvent | undefined {
    return events.find(e => e.ct === ct && (!predicate || predicate(e)));
}

/**
 * Find all events of a given ct value.
 */
export function findEvents(events: KtagEvent[], ct: string): KtagEvent[] {
    return events.filter(e => e.ct === ct);
}

/**
 * Assert that a pageview_id on a child event (click, impression, etc.)
 * matches the pageview_id of the originating pageview event.
 */
export function assertPageviewIdChain(
    pageviewEvent: KtagEvent,
    childEvent: KtagEvent,
    childEventName: string
): void {
    expect(childEvent.pageview_id,
        `${childEventName}.pageview_id must match the originating pageview`
    ).toBe(pageviewEvent.pageview_id);
}
