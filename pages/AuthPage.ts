import { type Locator, type Page } from '@playwright/test';
import { acceptRegionPromptIfVisible } from '../fixtures/regionPrompt';

export const SIGN_IN_USER = {
    email: 'testpot209@gmail.com',
    password: 'MyTest123!',
};

export const VALID_PASSWORD = 'MyTest123!';

export const WEAK_PASSWORDS = {
    tooShort: 'Ab1!',
    noUppercase: 'mytest123!',
    noNumber: 'MyTestPass!',
    noSpecial: 'MyTest1234',
};

/** Gmail plus-addressing so registrations aren't rejected as reserved/disposable domains. */
export function generateTestEmail(): string {
    return `testpot209+gctest${Date.now()}@gmail.com`;
}

export class AuthPage {
    readonly page: Page;

    // Header (scoped to fixed global nav so we don't hit duplicate CTAs inside dialogs)
    readonly headerSignUpBtn: Locator;
    readonly headerSignInBtn: Locator;
    /** Nav avatar after login (same element as `userAvatar`). */
    readonly profileAvatar: Locator;
    readonly userAvatar: Locator;

    // Auth modal core (`#signup-modal` is stable; inner view swaps between auth steps and logged-in menu)
    readonly signupModal: Locator;
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

    // Sign up form (step 1 — details; step 2 — consent checkboxes)
    readonly fullNameInput: Locator;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly passwordToggle: Locator;
    readonly ruleLength: Locator;
    readonly ruleUpperLower: Locator;
    readonly ruleNumber: Locator;
    readonly ruleSpecialChar: Locator;
    readonly letsGoBtn: Locator;

    // Consent step (step 2 of 2)
    readonly almostThereHeading: Locator;
    /** Waits for the mandatory age checkbox on the consent step. */
    readonly stepThreeReady: Locator;
    readonly ageConfirmCheckbox: Locator;
    readonly marketingCheckbox: Locator;
    /** Primary signup submit CTA (`Let's Go`); kept as `imInBtn` for older specs. */
    readonly imInBtn: Locator;

    // Sign in (email)
    readonly signInEmailInput: Locator;
    readonly signInPasswordInput: Locator;
    readonly signInSubmitBtn: Locator;
    readonly forgotPasswordLink: Locator;

    // Sign up success ("You're in!") — modal stays open until profile or continue
    readonly successHeading: Locator;
    readonly successSubtext: Locator;
    readonly completeProfileBtn: Locator;
    readonly continueToSiteLink: Locator;

    // Profile menu (avatar in nav)
    readonly profileDropdown: Locator;
    readonly profileDropdownHeading: Locator;
    readonly manageAccountLink: Locator;
    readonly goToRewardsLink: Locator;
    readonly signOutBtn: Locator;

    constructor(page: Page) {
        this.page = page;

        this.headerSignUpBtn = page.locator('#gdc-signup-text');
        this.headerSignInBtn = page.locator('#login-button');
        /** Post–sign-in initials chip in the global nav (prod: `#logged-in-user-icon`). */
        this.profileAvatar = page.locator('nav').first().locator('#logged-in-user-icon');
        this.userAvatar = this.profileAvatar;

        this.signupModal = page.locator('#signup-modal');
        this.modal = this.signupModal;
        this.modalCloseBtn = this.signupModal.locator(
            'button[aria-label*="close" i], [data-testid*="close" i], button:has-text("×")'
        ).first();
        this.modalBackBtn = this.modal.getByRole('button', { name: /back/i }).first();
        this.stepIndicator = this.modal.getByText(/\bStep\s+\d+\s+of\s+\d+\b/i).first();

        this.continueWithGoogleBtn = this.modal.getByRole('button', { name: /continue with google/i }).first();
        this.continueWithEmailBtn = this.modal.getByRole('button', { name: /continue with email/i }).first();
        this.continueWithDifferentAccountBtn = this.modal
            .getByRole('button', { name: /continue with a different account/i })
            .first();
        this.welcomeBackHeading = this.modal.getByText(/Welcome back/i).first();
        this.lastSignedInWithGoogleHint = this.modal.getByText(/You last signed in with Google/i).first();
        this.signInLink = this.modal
            .getByRole('link', { name: /^sign in$/i })
            .or(this.modal.getByRole('button', { name: /^sign in$/i }))
            .first();
        this.signUpLink = this.modal
            .getByRole('link', { name: /^sign up$/i })
            .or(this.modal.getByRole('button', { name: /^sign up$/i }))
            .first();

        this.fullNameInput = this.modal.locator('#signup-name');
        this.emailInput = this.modal.locator('#signup-email');
        this.passwordInput = this.modal.locator('#signup-password');
        this.passwordToggle = this.modal
            .locator('#signup-password')
            .locator('xpath=../following-sibling::button')
            .first();

        this.ruleLength = this.modal.getByText(/8\s*[–-]\s*25\s*characters/i);
        this.ruleUpperLower = this.modal.getByText(/upper\s+and\s+lowercase\s+letters/i);
        this.ruleNumber = this.modal.getByText(/1\s+or\s+more\s+numbers/i);
        this.ruleSpecialChar = this.modal.getByText(/special\s+character/i);
        this.letsGoBtn = this.modal.locator('#supabase-signup-details-button');

        this.almostThereHeading = this.modal.getByRole('heading', { name: /almost there/i });
        this.ageConfirmCheckbox = this.modal
            .locator('#age-confirm-inline')
            .or(this.modal.getByRole('checkbox', { name: /confirm I am over|over 18 years old/i }))
            .first();
        this.stepThreeReady = this.almostThereHeading.or(this.ageConfirmCheckbox);
        this.marketingCheckbox = this.modal
            .locator('#marketing-consent-inline')
            .or(this.modal.getByRole('checkbox', { name: /receive emails|marketing|offers/i }))
            .first();
        this.imInBtn = this.letsGoBtn;

        this.signInEmailInput = this.modal.locator('#signin-email');
        this.signInPasswordInput = this.modal.locator('#signin-password');
        this.signInSubmitBtn = this.modal.locator('form:has(#signin-email)').getByRole('button', { name: /^sign in$/i });
        this.forgotPasswordLink = this.modal.getByRole('button', { name: /forgot password/i }).first();

        this.successHeading = this.modal.getByText(/you're in/i).first();
        this.successSubtext = this.modal.getByText(/successfully created your account/i).first();
        this.completeProfileBtn = this.modal
            .getByRole('button', { name: /complete your profile/i })
            .or(this.modal.getByRole('link', { name: /complete your profile/i }))
            .first();
        this.continueToSiteLink = this.modal
            .getByRole('button', { name: /continue to site/i })
            .or(this.modal.getByRole('link', { name: /continue to site/i }))
            .first();

        /** Logged-in account menu reuses `#signup-modal` with `user-logged-in` (see `modal-authentication-content`). */
        this.profileDropdown = page.locator('#signup-modal.user-logged-in');
        this.profileDropdownHeading = this.profileDropdown.getByText(/hello/i).first();
        this.manageAccountLink = this.profileDropdown.getByText(/^manage your account$/i).first();
        this.goToRewardsLink = this.profileDropdown.getByText(/go to rewards/i).first();
        this.signOutBtn = this.profileDropdown.getByRole('button', { name: /sign out/i }).first();
    }

    async goto(): Promise<void> {
        await this.page.goto('/');
        await this.page.getByRole('button', { name: /accept all/i }).click({ timeout: 3000 }).catch(() => { });
    }

    /** Opens Sign In — header `#login-button` is often hidden; fall back to Sign In inside the auth modal. */
    async openSignInFromHeader(): Promise<void> {
        await acceptRegionPromptIfVisible(this.page);

        if (await this.headerSignInBtn.isVisible().catch(() => false)) {
            try {
                await this.headerSignInBtn.click({ timeout: 8000, force: true });
            } catch {
                await this.headerSignInBtn.evaluate((node: HTMLElement) => node.click());
            }
            await this.signupModal.waitFor({ state: 'visible', timeout: 10000 });
            return;
        }

        await this.openSignUpModal();
        await this.signInLink.click();
        await this.signupModal.waitFor({ state: 'visible', timeout: 10000 });
    }

    async openSignUpModal(): Promise<void> {
        if (await this.signupModal.isVisible().catch(() => false)) return;

        await acceptRegionPromptIfVisible(this.page);

        const trigger = this.headerSignUpBtn;
        try {
            await trigger.click({ timeout: 8000, force: true });
        } catch {
            await trigger.evaluate((node: HTMLElement) => node.click());
        }
        await this.signupModal.waitFor({ state: 'visible', timeout: 10000 });
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

        if (await this.signupModal.isVisible().catch(() => false)) {
            if (await this.signInLink.isVisible().catch(() => false)) {
                await this.signInLink.click();
                await this.signupModal.waitFor({ state: 'visible', timeout: 10000 });
                return;
            }
        }

        await this.openSignInFromHeader();
        await this.signupModal.waitFor({ state: 'visible', timeout: 10000 });
    }

    /** Rewards signup step 1 already shows the email form — no "Continue with Email" on this view. */
    async ensureSignUpFormVisible(): Promise<void> {
        await this.fullNameInput.waitFor({ state: 'visible', timeout: 10000 });
    }

    async fillSignUpForm(fullName: string, email: string, password: string, advance = true): Promise<void> {
        await this.ensureSignUpFormVisible();
        await this.fullNameInput.fill(fullName);
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        if (advance) {
            await this.letsGoBtn.click();
        }
    }

    async signUp(fullName: string, email: string, password: string): Promise<void> {
        await this.openSignUpModal();
        await this.fillSignUpForm(fullName, email, password);
        await this.stepThreeReady.waitFor({ state: 'visible', timeout: 15000 });
        await this.ageConfirmCheckbox.check({ force: true });
        await this.letsGoBtn.click();
    }

    async signIn(email: string, password: string): Promise<void> {
        await this.openSignInModal();
        if (await this.continueWithEmailBtn.isVisible().catch(() => false)) {
            await this.continueWithEmailBtn.click();
        }
        await this.signInEmailInput.fill(email);
        await this.signInPasswordInput.fill(password);
        await this.signInSubmitBtn.click();
        await this.dismissSignupModalIfOpen();
    }

    /** After `signIn`, prod may leave `#signup-modal` open — close so profile UI is usable. */
    async dismissSignupModalIfOpen(): Promise<void> {
        if (!(await this.signupModal.isVisible().catch(() => false))) return;
        if (await this.modalCloseBtn.isVisible().catch(() => false)) {
            await this.modalCloseBtn.click({ timeout: 5000 }).catch(() => { });
        } else {
            await this.page.keyboard.press('Escape');
        }
        await this.signupModal.waitFor({ state: 'hidden', timeout: 8000 }).catch(() => { });
    }

    /** Opens the profile dropdown by clicking the avatar in the nav bar. */
    async openProfileDropdown(): Promise<void> {
        await this.profileAvatar.click();
        await this.profileDropdown.waitFor({ state: 'visible', timeout: 8000 });
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
