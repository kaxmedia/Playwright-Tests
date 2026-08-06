/**
 * fixtures/ktag.ts
 *
 * Extends the base Playwright test with a `ktagEvents` fixture that
 * captures every ktag event fired to the /collect endpoint during a test.
 *
 * Usage:
 *   import { test, expect } from '../fixtures/ktag';
 *
 * The fixture collects events from the moment the test starts. Navigate,
 * interact with the page, then read `ktagEvents` — it will contain all
 * JSON payloads that were POSTed (or GETted) to /collect.
 *
 * Important: many ktag events fire *after* page load (seenopitems, gacid,
 * late oplistimp). Use `waitForKtagEvent` rather than reading ktagEvents
 * immediately after page.goto().
 *
 * Capture note: Chromium often reports ktag collect POSTs with a blob body,
 * so `request.postData()` on a plain `page.on('request')` listener is null.
 * Routing the collect URL makes the body available to Playwright.
 */

import { test as base, expect } from './test';

export interface KtagFixtures {
    ktagEvents: KtagEvent[];
    waitForKtagEvent: (ct: string, timeoutMs?: number) => Promise<KtagEvent>;
    waitForOptionalKtagEvent: (ct: string, timeoutMs?: number) => Promise<KtagEvent | undefined>;
    waitForKtagEvents: (ct: string, count: number, timeoutMs?: number) => Promise<KtagEvent[]>;
}

export type KtagEvent = Record<string, unknown>;

/**
 * Parse a collect request body. Handles both POST (JSON body) and
 * GET (query-string encoded payload) variants.
 */
function parseCollectRequest(url: string, postData: string | null): KtagEvent | null {
    try {
        if (postData) {
            return parseCollectPayload(postData);
        }
        // Fallback: some older collect calls use query params
        const params = new URL(url).searchParams;
        if (params.has('ct')) {
            const obj: KtagEvent = {};
            params.forEach((v, k) => { obj[k] = v; });
            return obj;
        }
    } catch {
        // Unparseable body — ignore
    }
    return null;
}

function parseCollectPayload(payload: string): KtagEvent | null {
    try {
        return JSON.parse(payload) as KtagEvent;
    } catch {
        const params = new URLSearchParams(payload);
        if (!params.has('ct')) return null;
        const obj: KtagEvent = {};
        params.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }
}

function isKtagCollectUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.hostname === 'ktag.kaxcdn.com'
            && (parsed.pathname.endsWith('/collect') || parsed.pathname.includes('/collect/'));
    } catch {
        return false;
    }
}

async function waitForMatchingEvents(
    events: KtagEvent[],
    ct: string,
    count: number,
    timeoutMs: number,
): Promise<KtagEvent[]> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
        const matched = events.filter(event => event.ct === ct);
        if (matched.length >= count) {
            return matched.slice(0, count);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    const matched = events.filter(event => event.ct === ct);
    throw new Error(
        count === 1
            ? `waitForKtagEvent: timed out waiting for ct="${ct}" after ${timeoutMs}ms`
            : `waitForKtagEvents: timed out — got ${matched.length}/${count} ct="${ct}" events after ${timeoutMs}ms`,
    );
}

export const test = base.extend<KtagFixtures>({
    ktagEvents: async ({ page }, use) => {
        const events: KtagEvent[] = [];

        // Intercept collect so Chromium exposes blob-backed POST bodies via postData().
        // Do not also listen on `request` — after route.continue() that path can re-emit
        // the same payload and double-count events (breaks "only one oplistimp" checks).
        await page.route('https://ktag.kaxcdn.com/**/collect*', async (route, request) => {
            if (isKtagCollectUrl(request.url())) {
                const parsed = parseCollectRequest(request.url(), request.postData());
                if (parsed) events.push(parsed);
            }
            await route.continue();
        });

        await use(events);

        await page.unroute('https://ktag.kaxcdn.com/**/collect*').catch(() => {});
    },

    waitForOptionalKtagEvent: async ({ ktagEvents }, use) => {
        const helper = async (ct: string, timeoutMs = 3_000): Promise<KtagEvent | undefined> => {
            const deadline = Date.now() + timeoutMs;
            while (Date.now() <= deadline) {
                const event = ktagEvents.find(candidate => candidate.ct === ct);
                if (event) return event;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return undefined;
        };

        await use(helper);
    },

    /**
     * Waits until at least one event with the given `ct` value appears in
     * ktagEvents, then returns it. Throws if the timeout elapses first.
     */
    waitForKtagEvent: async ({ ktagEvents }, use) => {
        const helper = async (ct: string, timeoutMs = 10_000): Promise<KtagEvent> => {
            const [event] = await waitForMatchingEvents(ktagEvents, ct, 1, timeoutMs);
            return event;
        };

        await use(helper);
    },

    /**
     * Waits until `count` events with the given `ct` value have been captured.
     */
    waitForKtagEvents: async ({ ktagEvents }, use) => {
        const helper = async (ct: string, count: number, timeoutMs = 15_000): Promise<KtagEvent[]> => {
            return waitForMatchingEvents(ktagEvents, ct, count, timeoutMs);
        };

        await use(helper);
    },
});

export { expect };
