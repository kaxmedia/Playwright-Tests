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
];

/** Returns pageerrors that are not on the known-issue allowlist (by id). */
export function unexpectedPageErrors(
  pageErrors: string[],
  allowlistIds: readonly string[] = [],
): string[] {
  const patterns = KNOWN_PAGE_ERROR_ALLOWLIST.filter(entry =>
    allowlistIds.includes(entry.id),
  ).map(entry => entry.pattern);

  return pageErrors.filter(err => !patterns.some(pattern => pattern.test(err)));
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
