import { type ConsoleMessage, type Page } from '@playwright/test';

/** Same noise patterns as legacy console tests — applied only to first-party script errors. */
const KNOWN_NOISY_SUBSTRING =
  /favicon|analytics|comment count|failed to fetch|resizeobserver|permissions-policy|taboola|attestation reporting/i;

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
