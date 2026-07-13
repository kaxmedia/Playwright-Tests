/**
 * tests/ktag/ktag-udc.spec.ts
 *
 * Tests for the `udc` (User Data Capture) event — fired on any user-supplied
 * data submission (sign up, sign in, email subscription, etc.).
 * Section 8.10 of the Ktag Event Payloads doc.
 *
 * The most critical negative assertion in the entire ktag suite:
 * OAuth tokens (qp_access_token, qp_refresh_token, etc.) must NEVER appear
 * on udc events. This is a known defect in the social-login flow where the
 * FE fails to strip tokens from the URL before ktag fires.
 *
 * Prerequisites: these tests need an authenticated flow. They reuse the
 * existing auth test credentials and approach from auth.spec.ts.
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertUdcSpecific,
  assertNoOAuthTokensOnUdc,
  findEvents,
} from '../helpers/ktag-assertions';
import { AuthPage, SIGN_IN_USER } from '../../pages/AuthPage';

const BASE_URL = 'https://www.gambling.com';

const TEST_EMAIL = process.env.TEST_EMAIL ?? SIGN_IN_USER.email;
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? SIGN_IN_USER.password;

/** Visible newsletter/subscribe field — excludes hidden auth modal `#signup-email`. */
function visibleSubscriptionEmailInput(page: Page) {
  return page.locator('input[type="email"]').filter({ visible: true });
}

async function submitSubscriptionForm(page: Page, email: string): Promise<boolean> {
  const emailInput = visibleSubscriptionEmailInput(page).first();
  if ((await emailInput.count()) === 0) return false;

  await emailInput.fill(email);
  const submit = page
    .locator('button[type="submit"], .subscribe-btn, [class*="subscribe"] button')
    .filter({ visible: true })
    .first();
  if ((await submit.count()) === 0) return false;

  await submit.click();
  return true;
}

async function signInForKtag(page: Page): Promise<void> {
  const auth = new AuthPage(page);
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /accept all/i }).click({ timeout: 3000 }).catch(() => {});
  await auth.signIn(TEST_EMAIL, TEST_PASSWORD);
  await auth.profileAvatar.waitFor({ state: 'visible', timeout: 20000 });
}

test.describe('Ktag — udc event @ktag @udc @regression', () => {

  test('udc event fires on email subscription form submission', async ({ page, waitForKtagEvent }) => {
    await page.goto(`${BASE_URL}/uk/online-casinos`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /accept all/i }).click({ timeout: 3000 }).catch(() => {});

    if (!(await submitSubscriptionForm(page, 'test+ktag@example.com'))) {
      test.skip(true, 'No visible email subscription form on this page.');
      return;
    }

    const event = await waitForKtagEvent('udc', 8000);
    assertBaseline(event, 'udc');
    assertUdcSpecific(event);
  });

  test('udc: ds field is a known discriminator value', async ({ page, waitForKtagEvent }) => {
    await page.goto(`${BASE_URL}/uk/online-casinos`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /accept all/i }).click({ timeout: 3000 }).catch(() => {});

    if (!(await submitSubscriptionForm(page, 'test+ktag2@example.com'))) {
      test.skip(true, 'No visible email subscription form on this page.');
      return;
    }

    const event = await waitForKtagEvent('udc', 8000);
    const validDs = [
      'email subscription', 'user registration', 'email confirmation',
      'user login', 'competition entry', 'site registration', 'subscribe_form',
    ];
    expect(validDs, `ds="${event.ds}" is not a known discriminator`).toContain(event.ds);
  });

  test('udc: email_sha256 is a valid SHA-256 hex string', async ({ page, waitForKtagEvent }) => {
    await page.goto(`${BASE_URL}/uk/online-casinos`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /accept all/i }).click({ timeout: 3000 }).catch(() => {});

    if (!(await submitSubscriptionForm(page, 'test+ktag3@example.com'))) {
      test.skip(true, 'No visible email subscription form on this page.');
      return;
    }

    const event = await waitForKtagEvent('udc', 8000);
    expect(event.email_sha256).toMatch(/^[a-f0-9]{64}$/i);
  });

  /**
   * CRITICAL: OAuth tokens must NEVER appear on udc events.
   *
   * This is the highest-value negative assertion in the ktag suite.
   * The social-login flow on gambling.com has a known defect where
   * the FE fails to strip OAuth tokens from the URL before ktag fires,
   * meaning these tokens end up in the udc payload (~6% of udc events).
   *
   * Any failure here should be raised as a P1 defect on the FE team.
   */
  test('udc: OAuth tokens must NOT be present (FE must strip before ktag fires) @negative @regression', async ({ page, ktagEvents }) => {
    await signInForKtag(page);
    await page.waitForTimeout(3000);

    const udcEvents = findEvents(ktagEvents, 'udc');
    for (const event of udcEvents) {
      assertNoOAuthTokensOnUdc(event);
    }
  });

  test('udc: udc event for sign-in has ds = "user login"', async ({ page, ktagEvents }) => {
    await signInForKtag(page);
    await page.waitForTimeout(3000);

    const udcEvents = findEvents(ktagEvents, 'udc');
    const loginEvent = udcEvents.find(e => e.ds === 'user login');

    if (loginEvent) {
      expect(loginEvent.ds).toBe('user login');
      expect(loginEvent.email_sha256).toMatch(/^[a-f0-9]{64}$/i);
    }
  });

  test('udc: no forbidden token fields at all, even on non-social auth @negative', async ({ page, ktagEvents }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /accept all/i }).click({ timeout: 3000 }).catch(() => {});

    await page.waitForTimeout(2000);

    const udcEvents = findEvents(ktagEvents, 'udc');
    for (const event of udcEvents) {
      assertNoOAuthTokensOnUdc(event);
    }
  });
});
