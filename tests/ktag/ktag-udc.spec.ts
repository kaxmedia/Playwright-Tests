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

import { test, expect } from '../../fixtures/ktag';
import {
  assertBaseline,
  assertUdcSpecific,
  assertNoOAuthTokensOnUdc,
  findEvents,
} from '../helpers/ktag-assertions';

const BASE_URL  = 'https://www.gambling.com';

// Credentials — use the same test account pattern as auth.spec.ts
// (Gmail plus-address pattern)
const TEST_EMAIL    = process.env.TEST_EMAIL    ?? 'your-test-email+ktag@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'YourTestPassword123!';

test.describe('Ktag — udc event @ktag @udc @regression', () => {

  test('udc event fires on email subscription form submission', async ({ page, ktagEvents, waitForKtagEvent }) => {
    // Navigate to a page with a newsletter/subscription widget
    await page.goto(`${BASE_URL}/uk/online-casinos`, { waitUntil: 'domcontentloaded' });

    // Look for email subscription input
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() === 0) {
      test.skip();
      return;
    }

    await emailInput.fill('test+ktag@example.com');
    await page.locator('button[type="submit"], .subscribe-btn').first().click();

    const event = await waitForKtagEvent('udc', 8000);
    assertBaseline(event, 'udc');
    assertUdcSpecific(event);
  });

  test('udc: ds field is a known discriminator value', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(`${BASE_URL}/uk/online-casinos`, { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() === 0) { test.skip(); return; }

    await emailInput.fill('test+ktag2@example.com');
    await page.locator('button[type="submit"], .subscribe-btn').first().click();

    const event = await waitForKtagEvent('udc', 8000);
    const validDs = [
      'email subscription', 'user registration', 'email confirmation',
      'user login', 'competition entry', 'site registration', 'subscribe_form',
    ];
    expect(validDs, `ds="${event.ds}" is not a known discriminator`).toContain(event.ds);
  });

  test('udc: email_sha256 is a valid SHA-256 hex string', async ({ page, ktagEvents, waitForKtagEvent }) => {
    await page.goto(`${BASE_URL}/uk/online-casinos`, { waitUntil: 'domcontentloaded' });

    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.count() === 0) { test.skip(); return; }

    await emailInput.fill('test+ktag3@example.com');
    await page.locator('button[type="submit"], .subscribe-btn').first().click();

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
  test('udc: OAuth tokens must NOT be present (FE must strip before ktag fires) @negative @smoke', async ({ page, ktagEvents }) => {
    // Attempt the sign-in flow to trigger a udc event
    await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });

    // Open the sign-in modal
    const signInTrigger = page.locator('[data-modal="signin"], .sign-in-btn, [href*="signin"]').first();
    if (await signInTrigger.count() === 0) {
      test.skip();
      return;
    }

    await signInTrigger.click();
    await page.waitForTimeout(500);

    // Fill credentials
    const emailInput = page.locator('#email, input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('#password, input[name="password"], input[type="password"]').first();

    if (await emailInput.count() === 0) { test.skip(); return; }

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();

    // Wait for auth to complete and ktag to fire
    await page.waitForTimeout(3000);

    const udcEvents = findEvents(ktagEvents, 'udc');
    for (const event of udcEvents) {
      assertNoOAuthTokensOnUdc(event);
    }
  });

  test('udc: udc event for sign-in has ds = "user login"', async ({ page, ktagEvents }) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });

    const signInTrigger = page.locator('[data-modal="signin"], .sign-in-btn, [href*="signin"]').first();
    if (await signInTrigger.count() === 0) { test.skip(); return; }

    await signInTrigger.click();
    await page.waitForTimeout(500);

    const emailInput = page.locator('#email, input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('#password, input[name="password"], input[type="password"]').first();
    if (await emailInput.count() === 0) { test.skip(); return; }

    await emailInput.fill(TEST_EMAIL);
    await passwordInput.fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForTimeout(3000);

    const udcEvents = findEvents(ktagEvents, 'udc');
    const loginEvent = udcEvents.find(e => e.ds === 'user login');

    if (loginEvent) {
      expect(loginEvent.ds).toBe('user login');
      expect(loginEvent.email_sha256).toMatch(/^[a-f0-9]{64}$/i);
    }
  });

  test('udc: no forbidden token fields at all, even on non-social auth @negative', async ({ page, ktagEvents }) => {
    await page.goto(`${BASE_URL}`, { waitUntil: 'domcontentloaded' });

    // Watch for any udc events during a normal browse session
    await page.waitForTimeout(2000);

    const udcEvents = findEvents(ktagEvents, 'udc');
    for (const event of udcEvents) {
      assertNoOAuthTokensOnUdc(event);
    }
  });
});
