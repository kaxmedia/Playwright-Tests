import { AuthPage, SIGN_IN_USER } from '../pages/AuthPage';

/**
 * Sign in with the shared E2E account and dismiss leftover auth UI.
 * Password: `E2E_TEST_PASSWORD` or `SIGN_IN_USER.password` default.
 */
export async function signInAsTestUser(
  authPage: AuthPage,
  password: string = process.env.E2E_TEST_PASSWORD ?? SIGN_IN_USER.password,
): Promise<void> {
  await authPage.signIn(SIGN_IN_USER.email, password);
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
}

export { SIGN_IN_USER };
