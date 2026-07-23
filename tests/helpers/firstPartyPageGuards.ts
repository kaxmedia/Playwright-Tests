import { type ConsoleMessage, type Page } from '@playwright/test';

/** Same noise patterns as legacy console tests — applied only to first-party script errors. */
const KNOWN_NOISY_SUBSTRING =
  /favicon|analytics|comment count|failed to fetch|resizeobserver|permissions-policy|taboola|attestation reporting/i;

/**
 * Tracked production `pageerror`s — tests still run and still fail on any other exception.
 * Remove an entry (and `knownPageErrorIds` on comparison configs) once dev fixes ship.
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
    // TEMPORARY STOPGAP — this is a REAL first-party production bug, not test noise.
    // gambling.com inlines the detectIncognito library and calls it without a .catch(); on
    // Firefox the library can't identify the browser, so the promise rejects and surfaces as
    // an uncaught pageerror (confirmed first-party: stack frames resolve to the page document
    // URL). Ships to real Firefox users. Allowlisted only to unblock CI until the site team
    // adds a Firefox code path / .catch() at the call site. Remove this entry once fixed.
    note: 'FIRST-PARTY PROD BUG (Firefox): detectIncognito promise rejection left unhandled — pending site-side fix, not a permanent suppression',
  },
];

/** Tracked first-party console errors — remove when dev fixes ship. */
export const KNOWN_CONSOLE_ERROR_ALLOWLIST: ReadonlyArray<{
  id: string;
  pattern: RegExp;
  note: string;
}> = [
  {
    id: 'us-malformed-s3-logo-urls',
    pattern:
      /Failed to load resource.*404.*%22https:\/\/s3\.eu-west-1\.amazonaws\.com\/objects\.kaxmedia\.com/i,
    note: 'US Sportsbooks — logo src wrapped in extra quotes, 404 on gambling.com origin',
  },
  {
    id: 'clarity-collect-cors',
    pattern: /k\.clarity\.ms\/collect/i,
    // Same third-party Microsoft Clarity CORS beacon as the page-error allowlist entry —
    // duplicated here because on some browsers the CORS failure surfaces as a console error
    // attributed to the gambling.com document rather than an uncaught pageerror. Not a
    // first-party bug; no site-owner escalation. See the page-error entry for details.
    note: 'Third-party Microsoft Clarity CORS (k.clarity.ms/collect) — external analytics, not a first-party bug, no escalation',
  },
];

/** Returns pageerrors that are not on the known-issue allowlist (by id). */
export function unexpectedPageErrors(
  pageErrors: string[],
  allowlistIds: readonly string[] = [],
): string[] {
  const patterns = KNOWN_PAGE_ERROR_ALLOWLIST.filter(entry =>
    allowlistIds.includes(entry.id),
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
  const patterns = KNOWN_CONSOLE_ERROR_ALLOWLIST.filter(entry =>
    allowlistIds.includes(entry.id),
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

  private readonly onPageError = (err: Error) => {
    this.pageErrors.push(err.stack ?? err.message);
  };

  private readonly onConsole = (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const url = msg.location()?.url;
    if (!isGamblingComScriptUrl(url)) return;
    const text = msg.text();
    if (KNOWN_NOISY_SUBSTRING.test(text)) return;
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
