import { type ConsoleMessage, type Page } from '@playwright/test';

/** Same noise patterns as legacy console tests — applied only to first-party script errors. */
const KNOWN_NOISY_SUBSTRING =
  /favicon|analytics|comment count|failed to fetch|resizeobserver|permissions-policy|taboola|attestation reporting/i;

/**
 * Tracked production `pageerror`s — tests still run and still fail on any other exception.
 * Remove an entry (and `knownPageErrorIds` on comparison configs) once a real fix ships.
 *
 * Entries in {@link ALWAYS_SUPPRESSED_PAGE_ERROR_IDS} are filtered for every caller
 * (no opt-in id list required) — use for noise product has declined to fix.
 */
export const KNOWN_PAGE_ERROR_ALLOWLIST: ReadonlyArray<{
  id: string;
  pattern: RegExp;
  note: string;
}> = [
  {
    id: 'age-checker-related-content-slots',
    pattern:
      /ReferenceError:\s*AgeChecker is not defined[\s\S]*RelatedContentCollectionSlots/i,
    note: 'DE/RO casino comparison — mountAgeCheckerGB runs before AgeChecker global is defined',
  },
  {
    id: 'clarity-collect-cors',
    pattern: /k\.clarity\.ms\/collect/i,
    // THIRD-PARTY analytics — Microsoft Clarity's beacon (https://k.clarity.ms/collect) is
    // CORS-blocked in the CI/test network (webkit + firefox), long-standing (4+ days).
    // Unlike detectIncognito this is NOT a first-party bug and needs NO site-owner
    // escalation — it's an external analytics endpoint gambling.com doesn't control, and
    // the block is environment-specific (didn't reproduce from a normal network).
    // Listed in BOTH allowlists because the browser attributes the CORS error inconsistently
    // (uncaught pageerror vs console error on the document) and it couldn't be reproduced
    // locally to pin the bucket — see news-page.spec.ts.
    note: 'Third-party Microsoft Clarity CORS (k.clarity.ms/collect) — external analytics, not a first-party bug, no escalation',
  },
  {
    id: 'detectincognito-firefox-unhandled-rejection',
    pattern: /detectIncognito cannot determine the browser/i,
    // Product declined to fix. Firefox rejects an unhandled detectIncognito promise on
    // every page; always suppressed so console/pageerror suites stay green.
    note: 'Firefox detectIncognito unhandled rejection — permanent suppress (product declined)',
  },
];

/** Always filtered by `unexpectedPageErrors` / FirstPartyPageGuards — no opt-in needed. */
export const ALWAYS_SUPPRESSED_PAGE_ERROR_IDS: readonly string[] = [
  'detectincognito-firefox-unhandled-rejection',
];

/** Tracked first-party console errors — remove when dev fixes ship. */
export const KNOWN_CONSOLE_ERROR_ALLOWLIST: ReadonlyArray<{
  id: string;
  pattern: RegExp;
  note: string;
}> = [
  {
    id: 'clarity-collect-cors',
    pattern: /k\.clarity\.ms\/collect/i,
    // Same third-party Microsoft Clarity CORS beacon as the page-error allowlist entry —
    // duplicated here because on some browsers the CORS failure surfaces as a console error
    // attributed to the gambling.com document rather than an uncaught pageerror. Not a
    // first-party bug; no site-owner escalation. See the page-error entry for details.
    note: 'Third-party Microsoft Clarity CORS (k.clarity.ms/collect) — external analytics, not a first-party bug, no escalation',
  },
  {
    id: 'detectincognito-firefox-unhandled-rejection',
    pattern: /detectIncognito cannot determine the browser/i,
    note: 'Firefox detectIncognito — permanent suppress (product declined)',
  },
];

/** Always filtered by `unexpectedConsoleErrors` — no opt-in needed. */
export const ALWAYS_SUPPRESSED_CONSOLE_ERROR_IDS: readonly string[] = [
  'detectincognito-firefox-unhandled-rejection',
];

/** Returns pageerrors that are not on the known-issue allowlist (by id). */
export function unexpectedPageErrors(
  pageErrors: string[],
  allowlistIds: readonly string[] = [],
): string[] {
  const ids = [...new Set([...ALWAYS_SUPPRESSED_PAGE_ERROR_IDS, ...allowlistIds])];
  const patterns = KNOWN_PAGE_ERROR_ALLOWLIST.filter(entry =>
    ids.includes(entry.id),
  ).map(entry => entry.pattern);

  return pageErrors.filter(err => {
    // WebKit sometimes emits empty pageerror events with no message/stack.
    if (!err || !err.trim()) return false;
    return !patterns.some(pattern => pattern.test(err));
  });
}

/** Returns console errors not on the known-issue allowlist (by id). */
export function unexpectedConsoleErrors(
  errors: { url: string; text: string }[],
  allowlistIds: readonly string[] = [],
): { url: string; text: string }[] {
  const ids = [...new Set([...ALWAYS_SUPPRESSED_CONSOLE_ERROR_IDS, ...allowlistIds])];
  const patterns = KNOWN_CONSOLE_ERROR_ALLOWLIST.filter(entry =>
    ids.includes(entry.id),
  ).map(entry => entry.pattern);

  return errors.filter(err => {
    const combined = `${err.text} ${err.url}`;
    return !patterns.some(pattern => pattern.test(combined));
  });
}

function isGamblingComScriptUrl(url: string | undefined): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === 'gambling.com';
  } catch {
    return false;
  }
}

/**
 * Option “first-party only”: ignore third-party CMP/analytics console noise (e.g. CookieYes CORS)
 * unless the browser attributes the message to a script URL on gambling.com.
 *
 * - `pageerror`: uncaught exceptions in the page (any origin of throw — usually worth fixing).
 * - `console` `error`: only if {@link ConsoleMessage.location} URL is on gambling.com.
 */
export class FirstPartyPageGuards {
  readonly pageErrors: string[] = [];
  readonly firstPartyConsoleErrors: { url: string; text: string }[] = [];

  private readonly alwaysPageErrorPatterns = KNOWN_PAGE_ERROR_ALLOWLIST.filter(entry =>
    ALWAYS_SUPPRESSED_PAGE_ERROR_IDS.includes(entry.id),
  ).map(entry => entry.pattern);

  private readonly alwaysConsoleErrorPatterns = KNOWN_CONSOLE_ERROR_ALLOWLIST.filter(entry =>
    ALWAYS_SUPPRESSED_CONSOLE_ERROR_IDS.includes(entry.id),
  ).map(entry => entry.pattern);

  private readonly onPageError = (err: Error) => {
    const text = err.stack ?? err.message;
    if (this.alwaysPageErrorPatterns.some(pattern => pattern.test(text))) return;
    this.pageErrors.push(text);
  };

  private readonly onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const url = msg.location()?.url;
    if (!isGamblingComScriptUrl(url)) return;
    const text = msg.text();
    if (KNOWN_NOISY_SUBSTRING.test(text)) return;
    const combined = `${text} ${url}`;
    if (this.alwaysConsoleErrorPatterns.some(pattern => pattern.test(combined))) return;
    this.firstPartyConsoleErrors.push({ url: url!, text });
  };

  constructor(private readonly page: Page) {
    page.on('pageerror', this.onPageError);
    page.on('console', this.onConsole);
  }

  detach() {
    this.page.off('pageerror', this.onPageError);
    this.page.off('console', this.onConsole);
  }
}
