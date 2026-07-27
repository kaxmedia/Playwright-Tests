import { expect, type Locator, type Page } from '@playwright/test';

/** Site origin — prefer relative paths with Playwright `baseURL` when adding new journeys. */
export const GDC_ORIGIN = 'https://www.gambling.com';

/** Shared IE journey paths (Confluence core journeys). */
export const IE_URLS = {
  homepage: `${GDC_ORIGIN}/ie`,
  casinoToplist: `${GDC_ORIGIN}/ie/online-casinos`,
  newCasinos: `${GDC_ORIGIN}/ie/online-casinos/new`,
  slotsCasinos: `${GDC_ORIGIN}/ie/online-casinos/slots`,
  liveCasinos: `${GDC_ORIGIN}/ie/online-casinos/live`,
  mobileCasinos: `${GDC_ORIGIN}/ie/online-casinos/apps`,
  cryptoCasinos: `${GDC_ORIGIN}/ie/online-casinos/bitcoin`,
  paymentCasinos: `${GDC_ORIGIN}/ie/online-casinos/paypal`,
  howWeReview: `${GDC_ORIGIN}/ie/reviews/casino`,
  casinoReview: `${GDC_ORIGIN}/ie/online-casinos/kingmaker`,
  slotPage: `${GDC_ORIGIN}/ie/online-casinos/slots/starburst`,
  strategyHub: `${GDC_ORIGIN}/ie/online-casinos/strategy`,
  bettingToplist: `${GDC_ORIGIN}/ie/betting-sites`,
  bonusHub: `${GDC_ORIGIN}/ie/online-casinos/bonus`,
  noDeposit: `${GDC_ORIGIN}/ie/online-casinos/no-deposit-bonus`,
  freeSpins: `${GDC_ORIGIN}/ie/online-casinos/bonus/free-spins-no-deposit`,
  news: `${GDC_ORIGIN}/ie/news`,
  games: `${GDC_ORIGIN}/ie/games`,
  tournaments: `${GDC_ORIGIN}/ie/games/tournaments`,
  authors: `${GDC_ORIGIN}/ie/authors`,
  responsible: `${GDC_ORIGIN}/responsible`,
  profile: `${GDC_ORIGIN}/profile`,
  geoHomepage: `${GDC_ORIGIN}/uk`,
} as const;

/** Resolve a possibly-relative href against the gambling.com origin. */
export function resolveGdcHref(href: string, origin = GDC_ORIGIN): string {
  return href.startsWith('http') ? href : `${origin}${href}`;
}

/**
 * Navigate and assert a non-error HTTP status. Standard journey `beforeEach` pattern.
 */
export async function gotoOk(
  page: Page,
  url: string,
  label = 'Page',
): Promise<void> {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  expect(response?.status(), `${label} should return HTTP < 400`).toBeLessThan(400);
}

/** Prefer main-content affiliate links over footer/editorial matches. */
export function mainGoCta(page: Page): Locator {
  return page.locator('main a[href*="/go/"]').first();
}

export async function assertMainGoCtaPresent(page: Page): Promise<void> {
  await expect(mainGoCta(page)).toBeAttached();
}
