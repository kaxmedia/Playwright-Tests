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
 */

import { test as base, expect, type Request } from '@playwright/test';

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

function isKtagCollectRequest(req: Request): boolean {
    try {
        const url = new URL(req.url());
        return url.hostname === 'ktag.kaxcdn.com'
            && (url.pathname.endsWith('/collect') || url.pathname.includes('/collect/'));
    } catch {
        return false;
    }
}

export const test = base.extend<KtagFixtures>({
    ktagEvents: async ({ page }, use) => {
        const events: KtagEvent[] = [];

        page.on('request', (req) => {
            if (!isKtagCollectRequest(req)) return;
            const parsed = parseCollectRequest(req.url(), req.postData());
            if (parsed) events.push(parsed);
        });

        await use(events);
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
    waitForKtagEvent: async ({ page, ktagEvents }, use) => {
        const helper = async (ct: string, timeoutMs = 10_000): Promise<KtagEvent> => {
            return new Promise((resolve, reject) => {
                const existing = ktagEvents.find(event => event.ct === ct);
                if (existing) {
                    resolve(existing);
                    return;
                }

                const cleanup = () => {
                    clearTimeout(timeout);
                    page.off('request', handler);
                };

                const handler = (req: Request) => {
                    if (!isKtagCollectRequest(req)) return;
                    const parsed = parseCollectRequest(req.url(), req.postData());
                    if (parsed && parsed.ct === ct) {
                        cleanup();
                        resolve(parsed);
                    }
                };

                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error(`waitForKtagEvent: timed out waiting for ct="${ct}" after ${timeoutMs}ms`));
                }, timeoutMs);

                page.on('request', handler);
            });
        };

        await use(helper);
    },

    /**
     * Waits until `count` events with the given `ct` value have been captured.
     */
    waitForKtagEvents: async ({ page, ktagEvents }, use) => {
        const helper = async (ct: string, count: number, timeoutMs = 15_000): Promise<KtagEvent[]> => {
            const collected: KtagEvent[] = ktagEvents.filter(event => event.ct === ct);
            if (collected.length >= count) {
                return collected.slice(0, count);
            }

            return new Promise((resolve, reject) => {
                const cleanup = () => {
                    clearTimeout(timeout);
                    page.off('request', handler);
                };

                const handler = (req: Request) => {
                    if (!isKtagCollectRequest(req)) return;
                    const parsed = parseCollectRequest(req.url(), req.postData());
                    if (parsed && parsed.ct === ct) {
                        collected.push(parsed);
                        if (collected.length >= count) {
                            cleanup();
                            resolve(collected.slice(0, count));
                        }
                    }
                };

                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error(
                        `waitForKtagEvents: timed out — got ${collected.length}/${count} ct="${ct}" events after ${timeoutMs}ms`
                    ));
                }, timeoutMs);

                page.on('request', handler);
            });
        };

        await use(helper);
    },
});

export { expect };
