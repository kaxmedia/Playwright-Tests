import { type Locator, type Page } from '@playwright/test';

export const SIGN_IN_USER = {
    email: 'testpot209@gmail.com',
    password: 'MyTest123',
};

export const VALID_PASSWORD = 'MyTest123!';

export const WEAK_PASSWORDS = {
    tooShort: 'Ab1!',
    noUppercase: 'mytest123!',
    noNumber: 'MyTestPass!',
    noSpecial: 'MyTest1234',
};

/** Gmail plus-addressing so registrations aren’t rejected as reserved/disposable domains. */
export function generateTestEmail(): string {
    return `testpot209+gctest${Date.now()}@gmail.com`;
}

/** Matches signup steps, email sign-in intro, *and* returning-user “Welcome back” (Google hint may vary). */
const AUTH_MODAL_TEXT =
    /Step\s+[123]\s+of\s+3|Sign\s+in\s+to\s+your\s+account|Welcome\s+to\s+Gambling\.com|Welcome\s+back/i;

export class AuthPage {
    readonly page: Page;

    // Header (scoped to fixed global nav so we don’t hit duplicate CTAs inside dialogs)
    readonly headerSignUpBtn: Locator;
    readonly headerSignInBtn: Locator;
    readonly userAvatar: Locator;

    // Auth modal core
    readonly modal: Locator;
    readonly modalCloseBtn: Locator;
    readonly modalBackBtn: Locator;
    readonly stepIndicator: Locator;

    // Step 1 buttons / links
    readonly continueWithGoogleBtn: Locator;
    readonly continueWithEmailBtn: Locator;
    /** Returning-user flow (after Google or recognized session): passwordless sign-in shell */
    readonly continueWithDifferentAccountBtn: Locator;
    readonly welcomeBackHeading: Locator;
    readonly lastSignedInWithGoogleHint: Locator;
    readonly signInLink: Locator;
    readonly signUpLink: Locator;

    // Step 2 (Sign up form)
    readonly fullNameInput: Locator;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly passwordToggle: Locator;
    readonly ruleLength: Locator;
    readonly ruleUpperLower: Locator;
    readonly ruleNumber: Locator;
    readonly ruleSpecialChar: Locator;

    // Step 3
    /** Narrow title — does not match checkbox copy (prod may still use “Create your account” until a11y lands). */
    readonly almostThereHeading: Locator;
    /** Waits for step 3 when heading exists; falls back to mandatory age checkbox (current prod). */
    readonly stepThreeReady: Locator;
    readonly ageConfirmCheckbox: Locator;
    readonly marketingCheckbox: Locator;
    readonly imInBtn: Locator;

    // Sign in (email)
    readonly signInEmailInput: Locator;
    readonly signInPasswordInput: Locator;
    readonly signInSubmitBtn: Locator;
    readonly forgotPasswordLink: Locator;

    constructor(page: Page) {
        this.page = page;

        // Header CTAs: stable ids where present (text-only nav hits duplicate/hidden nodes inside dialogs).
        this.headerSignUpBtn = page.locator('nav').first().getByText(/^sign up$/i).first();
        this.headerSignInBtn = page.locator('#login-button');
        this.userAvatar = page.locator(
            'button[aria-label*="account" i], button[aria-label*="profile" i], [class*="avatar" i]'
        ).first();

        this.modal = page.locator('[role="dialog"]').filter({ hasText: AUTH_MODAL_TEXT });
        this.modalCloseBtn = this.modal.locator(
            'button[aria-label*="close" i], [data-testid*="close" i], button:has-text("×")'
        ).first();
        this.modalBackBtn = this.modal.getByRole('button', { name: /back/i }).first();
        this.stepIndicator = this.modal.getByText(/\bStep\s+\d\s+of\s+3\b/i).first();

        this.continueWithGoogleBtn = this.modal.getByRole('button', { name: /continue with google/i }).first();
        this.continueWithEmailBtn = this.modal.getByRole('button', { name: /continue with email/i }).first();
        this.continueWithDifferentAccountBtn = this.modal
            .getByRole('button', { name: /continue with a different account/i })
            .first();
        this.welcomeBackHeading = this.modal.getByText(/Welcome back/i).first();
        this.lastSignedInWithGoogleHint = this.modal.getByText(/You last signed in with Google/i).first();
        /** Prefer `<a>` when UI ships links; current prod uses `<button>` — `.or()` keeps both working. */
        this.signInLink = this.modal
            .getByRole('link', { name: /^sign in$/i })
            .or(this.modal.getByRole('button', { name: /^sign in$/i }))
            .first();
        this.signUpLink = this.modal
            .getByRole('link', { name: /^sign up$/i })
            .or(this.modal.getByRole('button', { name: /^sign up$/i }))
            .first();

        // Avoid honeypot `input[name="username"]` — use stable signup field ids
        this.fullNameInput = this.modal.locator('#signup-name');
        this.emailInput = this.modal.locator('#signup-email');
        this.passwordInput = this.modal.locator('#signup-password');
        /** Eye control sits as sibling of the labelled password field row (not parent traversal chains). */
        this.passwordToggle = this.modal
            .locator('#signup-password')
            .locator('xpath=../following-sibling::button')
            .first();

        this.ruleLength = this.modal.getByText(/8\s*[–-]\s*25\s*characters/i);
        this.ruleUpperLower = this.modal.getByText(/upper\s+and\s+lowercase\s+letters/i);
        this.ruleNumber = this.modal.getByText(/1\s+or\s+more\s+numbers/i);
        this.ruleSpecialChar = this.modal.getByText(/special\s+character/i);

        this.almostThereHeading = this.modal.getByRole('heading', { name: /almost there/i });
        this.ageConfirmCheckbox = this.modal.getByRole('checkbox', { name: /confirm I am over|over 18 years old/i }).first();
        this.stepThreeReady = this.almostThereHeading.or(this.ageConfirmCheckbox);
        this.marketingCheckbox = this.modal.getByRole('checkbox', { name: /receive emails|marketing|offers/i }).first();
        this.imInBtn = this.modal.getByRole('button', { name: /i'?m in/i }).first();

        this.signInEmailInput = this.modal.locator('#signin-email');
        this.signInPasswordInput = this.modal.locator('#signin-password');
        /** Scoped to the email/password form so it doesn’t collide with the “Sign In” switch on the sign-up intro. */
        this.signInSubmitBtn = this.modal.locator('form:has(#signin-email)').getByRole('button', { name: /^sign in$/i });
        /** Password reset control is a `<button>` on current layout (not an `<a href>`). */
        this.forgotPasswordLink = this.modal.getByRole('button', { name: /forgot password/i }).first();
    }

    async goto(): Promise<void> {
        await this.page.goto('/');
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 3000 }).catch(() => { });
    }

    /** Opens Sign In from the global header (falls back to DOM click when Playwright visibility checks fail). */
    async openSignInFromHeader(): Promise<void> {
        const el = this.headerSignInBtn;
        try {
            await el.click({ timeout: 8000, force: true });
        } catch {
            await el.evaluate((node: HTMLElement) => node.click());
        }
    }

    async openSignUpModal(): Promise<void> {
        if (await this.modal.isVisible().catch(() => false)) return;
        await this.headerSignUpBtn.click();
        await this.modal.waitFor({ state: 'visible', timeout: 10000 });
    }

    async openSignInModal(): Promise<void> {
        if (await this.modal.locator('#signin-email').isVisible().catch(() => false)) return;

        if (await this.modal.getByText(/Welcome back/i).isVisible().catch(() => false)) return;

        if (
            (await this.modal.getByText(/sign in to your account/i).isVisible().catch(() => false)) &&
            (await this.continueWithEmailBtn.isVisible().catch(() => false))
        ) {
            return;
        }

        if (await this.modal.isVisible().catch(() => false)) {
            if (await this.signInLink.isVisible().catch(() => false)) {
                await this.signInLink.click();
                await this.modal.waitFor({ state: 'visible', timeout: 10000 });
                return;
            }
        }

        if (await this.headerSignInBtn.isVisible().catch(() => false)) {
            await this.openSignInFromHeader();
        } else {
            await this.openSignUpModal();
            await this.signInLink.click();
        }
        await this.modal.waitFor({ state: 'visible', timeout: 10000 });
    }

    async fillSignUpForm(fullName: string, email: string, password: string): Promise<void> {
        await this.fullNameInput.fill(fullName);
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.imInBtn.click().catch(async () => {
            await this.passwordInput.press('Enter');
        });
    }

    async signUp(fullName: string, email: string, password: string): Promise<void> {
        await this.openSignUpModal();
        await this.continueWithEmailBtn.click();
        await this.fillSignUpForm(fullName, email, password);
        await this.stepThreeReady.waitFor({ state: 'visible', timeout: 15000 });
        await this.ageConfirmCheckbox.check({ force: true });
        await this.imInBtn.click();
    }

    async signIn(email: string, password: string): Promise<void> {
        await this.openSignInModal();
        await this.continueWithEmailBtn.click();
        await this.signInEmailInput.fill(email);
        await this.signInPasswordInput.fill(password);
        await this.signInSubmitBtn.click();
    }

    /** Ends session via UI (prefer when cookie-clear would drop returning-user hints you need to keep). */
    async signOut(): Promise<void> {
        const logout = this.page.locator('#supabase-logout-button');
        await logout.waitFor({ state: 'attached', timeout: 20000 });
        await logout.scrollIntoViewIfNeeded().catch(() => { });
        await logout.click({ force: true, timeout: 20000 });
        await logout.waitFor({ state: 'detached', timeout: 20000 }).catch(() => { });
    }
}
