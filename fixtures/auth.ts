import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuthPage, SIGN_IN_USER } from '../pages/AuthPage';
import { PROFILE_TEST_DATA } from '../pages/ProfilePage';

const AUTH_LOCK_PATH = path.join(os.tmpdir(), 'gdc-playwright-e2e-auth.lock');

export type AuthLockHandle = { release: () => void };

/**
 * Exclusive lock for the shared E2E account. Concurrent chrome/firefox/webkit
 * sign-ins invalidate each other's Supabase sessions — hold this for the whole
 * signed-in test (not just the sign-in call).
 */
export async function acquireSharedAuthLock(timeoutMs = 180_000): Promise<AuthLockHandle> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const fd = fs.openSync(AUTH_LOCK_PATH, 'wx');
      return {
        release: () => {
          try {
            fs.closeSync(fd);
          } catch {
            /* ignore */
          }
          try {
            fs.unlinkSync(AUTH_LOCK_PATH);
          } catch {
            /* ignore */
          }
        },
      };
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error('Timed out waiting for shared E2E auth lock');
}

async function withSharedAuthLock<T>(fn: () => Promise<T>): Promise<T> {
  const lock = await acquireSharedAuthLock();
  try {
    return await fn();
  } finally {
    lock.release();
  }
}

async function signInWithPasswordCandidates(
  authPage: AuthPage,
  password: string,
): Promise<void> {
  const candidates = [
    password,
    PROFILE_TEST_DATA.origPassword,
    PROFILE_TEST_DATA.newPassword,
  ].filter((p, i, arr) => p && arr.indexOf(p) === i);

  let lastError: Error | undefined;
  for (const candidate of candidates) {
    try {
      await authPage.signIn(SIGN_IN_USER.email, candidate);
      const authRejected = authPage.signupModal.getByText(
        /incorrect password|wrong password|invalid credentials/i,
      );
      await Promise.race([
        authPage.profileAvatar.waitFor({ state: 'visible', timeout: 26000 }),
        authRejected.waitFor({ state: 'visible', timeout: 26000 }).then(() => {
          throw new Error(
            'Sign-in failed (rejected password). Set E2E_TEST_PASSWORD to the current password for testpot209@gmail.com.',
          );
        }),
      ]);
      await authPage.dismissSignupModalIfOpen();
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await authPage.dismissSignupModalIfOpen();
      await authPage.page.keyboard.press('Escape').catch(() => {});
    }
  }
  throw lastError ?? new Error('Sign-in failed for all known test passwords.');
}

/**
 * Sign in with the shared E2E account and dismiss leftover auth UI.
 * Acquires a short lock around the sign-in only — prefer {@link acquireSharedAuthLock}
 * around the whole test when other projects may also sign in.
 */
export async function signInAsTestUser(
  authPage: AuthPage,
  password: string = process.env.E2E_TEST_PASSWORD ?? SIGN_IN_USER.password,
): Promise<void> {
  await withSharedAuthLock(() => signInWithPasswordCandidates(authPage, password));
}

/** Sign in without taking the lock — caller already holds {@link acquireSharedAuthLock}. */
export async function signInAsTestUserUnlocked(
  authPage: AuthPage,
  password: string = process.env.E2E_TEST_PASSWORD ?? SIGN_IN_USER.password,
): Promise<void> {
  await signInWithPasswordCandidates(authPage, password);
}

export { SIGN_IN_USER };
