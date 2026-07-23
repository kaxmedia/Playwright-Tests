import { type Page, type Locator, expect } from '@playwright/test';

// ─── URLs ─────────────────────────────────────────────────────────────────────
/** `rewards` is the logged-in rewards hub at `/profile` (not `/profile/rewards`, which 404s). */
export const PROFILE_URLS = {
    rewards: 'https://www.gambling.com/profile',
    details: 'https://www.gambling.com/profile/details',
    additional: 'https://www.gambling.com/profile/additional',
    email: 'https://www.gambling.com/profile/email',
    password: 'https://www.gambling.com/profile/password',
    refer: 'https://www.gambling.com/profile/refer',
} as const;

// ─── Test data ────────────────────────────────────────────────────────────────
/** Values used when updating profile fields. Chosen to be clearly test data. */
export const PROFILE_TEST_DATA = {
    firstName: 'GCTest',
    nickname: 'GCNick',
    /** IE mobile-style prefix without leading 0; tests append random last 3 digits so saves are never identical to the current number. */
    phonePrefix: '851234',
    newPassword: 'GcTest2!',          // Temporary — test restores original after use
    origPassword: 'MyTest123!',        // testpot209 — restored after password test
};

export class ProfilePage {
    readonly page: Page;

    /** Main column that contains the profile sidebar (stable after login on `/profile*`). */
    readonly profileShell: Locator;
    /** Marketing tab content only — avoids cookie-banner checkboxes elsewhere on the page. */
    readonly marketingPanel: Locator;
    /** Vue root that wraps the update-password form (anonymous password inputs). */
    readonly passwordFormRoot: Locator;
    /** Close button of the login-streak reward popup — its full-screen backdrop intercepts clicks until dismissed. */
    readonly streakModalCloseBtn: Locator;

    // ── Tab navigation ────────────────────────────────────────────────────────
    readonly tabRewards: Locator;
    readonly tabDetails: Locator;
    readonly tabAdditional: Locator;
    readonly tabMarketing: Locator;
    readonly tabPassword: Locator;
    readonly tabRefer: Locator;

    // ── Rewards tab ───────────────────────────────────────────────────────────
    readonly chipCount: Locator; // "You currently have X Chips"
    readonly levelProgressBar: Locator;
    readonly pendingChallenges: Locator; // section heading
    readonly completedChallenges: Locator; // section heading
    /** Not referenced in specs yet — reserved for Rewards challenge-card assertions. */
    readonly challengeCards: Locator;
    readonly spinTheWheelBanner: Locator;
    /** Not referenced in specs yet — reserved for Rewards prize/package carousel assertions. */
    readonly packageCards: Locator;

    // ── Profile Details tab — read view ──────────────────────────────────────
    readonly detailsHeading: Locator;
    readonly displayFirstName: Locator;
    readonly displayNickname: Locator;
    readonly displayEmail: Locator;
    readonly displayPhone: Locator;
    readonly editDetailsBtn: Locator;
    readonly signOutLink: Locator;
    readonly deleteAccountLink: Locator;

    // ── Profile Details tab — edit form ──────────────────────────────────────
    readonly editFormHeading: Locator; // "Edit Profile Details"
    readonly editFirstNameInput: Locator;
    readonly editNicknameInput: Locator;
    /** Not covered by specs yet — reserved for a country-code / locale regression. */
    readonly editPhoneCountryCode: Locator;
    readonly editPhoneInput: Locator; // number field
    readonly saveChangesBtn: Locator; // on details edit form
    readonly cancelBtn: Locator;

    // ── Additional Details tab ────────────────────────────────────────────────
    readonly additionalHeading: Locator;
    readonly interestCasino: Locator;
    readonly interestBetting: Locator;
    readonly interestSlots: Locator;
    readonly interestPoker: Locator;
    readonly interestBingo: Locator;
    readonly operatorCountInput: Locator;
    readonly bettingFreqDaily: Locator;
    readonly bettingFreqWeekly: Locator;
    readonly bettingFreqFewTimes: Locator;
    readonly bettingFreqMonthly: Locator;
    readonly bettingFreqSpecial: Locator;
    readonly bettingFreqNA: Locator;
    readonly casinoFreqDaily: Locator;
    readonly casinoFreqFewTimes: Locator;
    readonly casinoFreqWeekly: Locator;
    readonly casinoFreqMonthly: Locator;
    readonly casinoFreqNA: Locator;
    readonly bonusFreeBets: Locator;
    readonly bonusDepositMatch: Locator;
    readonly bonusRiskFree: Locator;
    readonly bonusEnhancedOdds: Locator;
    readonly bonusFreeSpins: Locator;
    readonly bonusLoyalty: Locator;
    readonly bonusBetInsurance: Locator;
    readonly bonusAccumulator: Locator;
    readonly bonusOtherInput: Locator;
    readonly additionalSaveBtn: Locator;

    // ── Marketing Preferences tab ─────────────────────────────────────────────
    readonly marketingHeading: Locator;
    readonly notificationsHeading: Locator;
    readonly interestsHeading: Locator;
    readonly toggleEmailNotifications: Locator;
    readonly toggleSmsNotifications: Locator;
    readonly togglePushNotifications: Locator;
    readonly toggleGeneralNews: Locator;
    readonly toggleBetting: Locator;
    readonly toggleCasino: Locator;
    readonly marketingSaveBtn: Locator;

    // ── Manage Password tab ───────────────────────────────────────────────────
    readonly passwordHeading: Locator;
    readonly currentPasswordInput: Locator;
    readonly newPasswordInput: Locator;
    readonly confirmPasswordInput: Locator;
    readonly updatePasswordBtn: Locator;

    // ── Refer & Earn tab ──────────────────────────────────────────────────────
    readonly referHeading: Locator;
    readonly referEmailInput: Locator;
    readonly referSendBtn: Locator;
    readonly referralLinkDisplay: Locator;
    readonly copyToClipboardBtn: Locator;
    readonly yourReferralsSection: Locator;

    // ── Shared — success / error feedback ─────────────────────────────────────
    readonly successToast: Locator;
    readonly errorToast: Locator;

    constructor(page: Page) {
        this.page = page;

        this.profileShell = page.locator('main.body_content');
        /** Profile content column that shows the Marketing Preferences heading (subset of `profileShell`). */
        this.marketingPanel = this.profileShell.filter({
            has: page.getByRole('heading', { name: /marketing preferences/i }),
        });
        this.passwordFormRoot = page.locator('[data-v-app]').filter({ has: page.getByRole('button', { name: /update password/i }) });
        this.streakModalCloseBtn = page.getByRole('button', { name: /close modal/i }).first();

        // ── Tabs (sidebar inside profile shell) ─────────────────────────────────
        this.tabRewards = this.profileShell.getByRole('link', { name: /gambling\.com rewards/i }).first();
        this.tabDetails = this.profileShell.getByRole('link', { name: /^profile details$/i }).first();
        this.tabAdditional = this.profileShell.getByRole('link', { name: /^additional details$/i }).first();
        this.tabMarketing = this.profileShell.getByRole('link', { name: /^marketing preferences$/i }).first();
        this.tabPassword = this.profileShell.getByRole('link', { name: /^manage password$/i }).first();
        this.tabRefer = this.profileShell.getByRole('link', { name: /^refer & earn$/i }).first();

        // ── Rewards hub (`/profile`) — active tab is the same nav link as `tabRewards` ─────────────────
        this.chipCount = this.profileShell.getByText(/you currently have|\d+\s*chips?/i).first();
        this.levelProgressBar = this.profileShell.locator('[class*="level-progress"], [class*="progress-bar"]').first();
        this.pendingChallenges = this.profileShell.getByRole('heading', { name: /pending challenges/i }).first();
        this.completedChallenges = this.profileShell.getByRole('heading', { name: /completed challenges/i }).first();
        this.challengeCards = this.profileShell.locator('[class*="challenge-card"], [class*="challenge-item"]');
        /** Below “What You Could Win”; copy varies (“Spin The Wheel”, “Spin the WHEEL”). Scoped so we don’t match unrelated footer copy. */
        const whatYouCouldWin = this.profileShell.filter({
            has: page.getByRole('heading', { name: /what you could win/i }),
        });
        this.spinTheWheelBanner = whatYouCouldWin.getByText(/spin\s*the\s*wheel/i).first();
        this.packageCards = this.profileShell.locator('[class*="package-card"], [class*="prize-card"]');

        // ── Profile Details — read ────────────────────────────────────────────
        this.detailsHeading = page.getByRole('heading', { name: /^profile details$/i }).first();
        /** First element sibling after the label — constrain tag so extra siblings don’t steal `.first()`. */
        this.displayFirstName = this.profileShell
            .getByText('First Name', { exact: true })
            .locator('xpath=following-sibling::*[self::p or self::div or self::span][1]');
        this.displayNickname = this.profileShell
            .getByText('Nickname', { exact: true })
            .locator('xpath=following-sibling::*[self::p or self::div or self::span][1]');
        this.displayEmail = this.profileShell
            .getByText('Email Address', { exact: true })
            .locator('xpath=following-sibling::*[self::p or self::div or self::span][1]');
        this.displayPhone = this.profileShell
            .getByText(/phone no\.?/i)
            .locator('xpath=following-sibling::*[self::p or self::div or self::span][1]');
        /** Prod uses a `<button>`, not a link. */
        this.editDetailsBtn = this.profileShell.getByRole('button', { name: /edit details/i }).first();
        /** Sign out / delete may be `<button>` or `<a>` and sit in the profile content column. */
        this.signOutLink = page
            .getByRole('button', { name: /^sign out$/i })
            .or(page.getByRole('link', { name: /^sign out$/i }))
            .first();
        this.deleteAccountLink = page
            .getByRole('button', { name: /delete account/i })
            .or(page.getByRole('link', { name: /delete account/i }))
            .first();

        // ── Profile Details — edit form (only present after “Edit Details”) ─────
        const detailsEditPane = page.locator('main').filter({ has: page.getByRole('heading', { name: /edit profile details/i }) });
        this.editFormHeading = detailsEditPane.getByRole('heading', { name: /edit profile details/i }).first();
        this.editFirstNameInput = detailsEditPane.locator('input[placeholder*="John" i], input[name*="firstName"], input[name*="first_name"]').first();
        this.editNicknameInput = detailsEditPane.locator('input[placeholder*="HighRoller" i], input[name*="nickname"]').first();
        this.editPhoneCountryCode = detailsEditPane.locator('select[name*="country"], select[name*="code"], [class*="country-code"] select').first();
        this.editPhoneInput = detailsEditPane.locator('input[placeholder*="12345" i], input[name*="phone"], input[type="tel"]').first();
        this.saveChangesBtn = detailsEditPane.getByRole('button', { name: /save changes/i }).first();
        this.cancelBtn = detailsEditPane.getByRole('button', { name: /cancel/i }).first();

        // ── Additional Details (same `main` as sidebar + “Additional details” heading) ──
        const additionalPane = this.profileShell.filter({
            has: page.getByRole('heading', { name: /additional details/i }),
        });
        this.additionalHeading = additionalPane.getByRole('heading', { name: /additional details/i }).first();
        const interest = (label: RegExp) =>
            additionalPane
                .getByRole('radio', { name: label })
                .or(additionalPane.getByRole('checkbox', { name: label }))
                .or(additionalPane.locator('label').filter({ hasText: label }).locator('input').first())
                .first();
        this.interestCasino = interest(/^casino$/i);
        this.interestBetting = interest(/^betting$/i);
        this.interestSlots = interest(/^slots$/i);
        this.interestPoker = interest(/^poker$/i);
        this.interestBingo = interest(/^bingo$/i);
        this.operatorCountInput = additionalPane
            .locator('input[type="number"], input[name*="operator" i], input[placeholder*="operator" i], textarea[name*="operator" i]')
            .first();
        // Closest ancestor of the question that contains radios (handles paragraph vs radios as siblings in Vue layouts).
        const freqGroupByQuestion = (question: RegExp) =>
            additionalPane.getByText(question).locator('xpath=ancestor::*[.//input[@type="radio"]][1]');
        const bettingFreqGroup = freqGroupByQuestion(/^How often do you place bets\?$/i);
        const casinoFreqGroup = freqGroupByQuestion(/^How often do you use casinos\?$/i);
        this.bettingFreqDaily = bettingFreqGroup.getByRole('radio', { name: /^daily$/i });
        this.bettingFreqWeekly = bettingFreqGroup.getByRole('radio', { name: /^weekly$/i });
        this.bettingFreqFewTimes = bettingFreqGroup.getByRole('radio', { name: /a few times a week/i });
        this.bettingFreqMonthly = bettingFreqGroup.getByRole('radio', { name: /^monthly$/i });
        this.bettingFreqSpecial = bettingFreqGroup.getByRole('radio', { name: /special events/i });
        this.bettingFreqNA = bettingFreqGroup.getByRole('radio', { name: /^n\/a$/i });
        this.casinoFreqDaily = casinoFreqGroup.getByRole('radio', { name: /^daily$/i });
        this.casinoFreqFewTimes = casinoFreqGroup.getByRole('radio', { name: /a few times a week/i });
        this.casinoFreqWeekly = casinoFreqGroup.getByRole('radio', { name: /^weekly$/i });
        this.casinoFreqMonthly = casinoFreqGroup.getByRole('radio', { name: /^monthly$/i });
        this.casinoFreqNA = casinoFreqGroup.getByRole('radio', { name: /^n\/a$/i });
        this.bonusFreeBets = additionalPane.getByRole('checkbox', { name: /^free bets$/i }).first();
        this.bonusDepositMatch = additionalPane.getByRole('checkbox', { name: /deposit match bonuses/i }).first();
        this.bonusRiskFree = additionalPane.getByRole('checkbox', { name: /risk-free bets/i }).first();
        this.bonusEnhancedOdds = additionalPane.getByRole('checkbox', { name: /enhanced odds/i }).first();
        this.bonusFreeSpins = additionalPane.getByRole('checkbox', { name: /free spins.*casino/i }).first();
        this.bonusLoyalty = additionalPane.getByRole('checkbox', { name: /loyalty rewards/i }).first();
        this.bonusBetInsurance = additionalPane.getByRole('checkbox', { name: /bet insurance/i }).first();
        this.bonusAccumulator = additionalPane.getByRole('checkbox', { name: /accumulator boosts/i }).first();
        this.bonusOtherInput = additionalPane.locator('input[name*="other"], textarea[name*="other"], input[placeholder*="specify" i]').first();
        this.additionalSaveBtn = additionalPane.getByRole('button', { name: /save changes/i }).first();

        // ── Marketing — notification channels + interest checkboxes (Save Changes persists).
        this.marketingHeading = this.marketingPanel.getByRole('heading', { name: /marketing preferences/i }).first();
        this.notificationsHeading = this.marketingPanel.getByText(/notifications from us/i).first();
        this.interestsHeading = this.marketingPanel.getByText(/indicate your interests/i).first();
        this.toggleEmailNotifications = this.marketingPanel.locator('#newsletter');
        this.toggleSmsNotifications = this.marketingPanel.locator('#sms');
        this.togglePushNotifications = this.marketingPanel.locator('#browser_push');
        this.toggleGeneralNews = this.marketingPanel.locator('#preference_general_news');
        this.toggleBetting = this.marketingPanel.locator('#preference_betting');
        this.toggleCasino = this.marketingPanel.locator('#preference_casino');
        this.marketingSaveBtn = this.marketingPanel.getByRole('button', { name: /save changes/i }).first();

        // ── Password — prefer labels (a11y); fall back to DOM order if inputs are anonymous ──────────────
        const pwdRoot = this.passwordFormRoot;
        this.passwordHeading = pwdRoot.getByRole('heading', { name: /update password/i }).first();
        this.currentPasswordInput = pwdRoot
            .getByLabel(/current password/i)
            .or(pwdRoot.locator('input[type="password"]').nth(0));
        // Avoid matching “Confirm new password” for the middle field — use anchored / exact label text where possible.
        this.newPasswordInput = pwdRoot
            .getByLabel(/^new password$/i)
            .or(pwdRoot.locator('input[type="password"]').nth(1));
        this.confirmPasswordInput = pwdRoot
            .getByLabel(/confirm.*password/i)
            .or(pwdRoot.locator('input[type="password"]').nth(2));
        this.updatePasswordBtn = this.passwordFormRoot.getByRole('button', { name: /update password/i }).first();

        // ── Refer & Earn (invite field is a labelled textbox, not `type="email"`) ──
        const referPane = this.profileShell.filter({
            has: page.getByRole('heading', { name: /refer\s*&\s*earn/i }),
        });
        this.referHeading = referPane.getByRole('heading', { name: /refer\s*&\s*earn/i }).first();
        this.referEmailInput = referPane.getByRole('textbox', {
            name: /invite a friend and earn rewards/i,
        });
        this.referSendBtn = referPane.getByRole('button', { name: /^send$/i }).first();
        this.referralLinkDisplay = referPane.getByText(/gambling\.com\/[^\s]*referral=/i).first();
        this.copyToClipboardBtn = referPane.getByText(/copy to clipboard/i).first();
        this.yourReferralsSection = referPane.getByRole('heading', { name: /your referrals/i }).first();

        // ── Shared feedback — prefer alerts/toasts; avoid broad [class*="success"] (matches unrelated UI) ──
        this.successToast = page
            .locator('[role="alert"], [class*="toast"]')
            .filter({ hasText: /saved|success|updated|changed/i })
            .first();
        this.errorToast = page
            .locator('[role="alert"], [class*="toast"]')
            .filter({ hasText: /error|failed|invalid|wrong/i })
            .first();
    }

    /** Navigate directly to a profile tab URL */
    async gotoTab(tab: keyof typeof PROFILE_URLS): Promise<void> {
        await this.page.goto(PROFILE_URLS[tab]);
        await this.page.waitForLoadState('domcontentloaded');
        await this.profileShell.getByRole('link', { name: /^profile details$/i }).waitFor({ state: 'visible', timeout: 30000 });
        await this.dismissStreakModalIfPresent();
    }

    /**
     * The login-streak reward popup ("N Day Log In Streak") can appear over any profile tab.
     * Its full-screen backdrop (z-1050) intercepts pointer events and blocks form submits
     * (e.g. the Update Password button), so dismiss it properly rather than force-clicking
     * through the overlay. No-op when the popup isn't showing.
     */
    private async dismissStreakModalIfPresent(): Promise<void> {
        if (await this.streakModalCloseBtn.isVisible().catch(() => false)) {
            console.log('[streak-modal] login-streak reward popup detected — dismissing before proceeding');
            await this.streakModalCloseBtn.click();
            await this.streakModalCloseBtn.waitFor({ state: 'hidden', timeout: 10000 });
        }
    }

    /** Click a tab in the profile nav and wait for the page to settle (`email` = Marketing preferences URL). */
    async clickTab(tab: keyof typeof PROFILE_URLS): Promise<void> {
        const tabLocators: Record<keyof typeof PROFILE_URLS, Locator> = {
            rewards: this.tabRewards,
            details: this.tabDetails,
            additional: this.tabAdditional,
            email: this.tabMarketing,
            password: this.tabPassword,
            refer: this.tabRefer,
        };
        await tabLocators[tab].click();
        await this.page.waitForLoadState('domcontentloaded');
        await this.profileShell.getByRole('link', { name: /^profile details$/i }).waitFor({ state: 'visible', timeout: 30000 });
    }

    /** Open the Profile Details edit form by clicking Edit Details */
    async openEditForm(): Promise<void> {
        await this.editDetailsBtn.click();
        await expect(this.editFormHeading).toBeVisible({ timeout: 10000 });
    }

    /**
     * Update profile details and save.
     * Pass only the fields you want to change — others are left untouched.
     */
    async updateProfileDetails(options: {
        firstName?: string;
        nickname?: string;
        phoneNumber?: string;
    }): Promise<void> {
        await this.openEditForm();
        if (options.firstName !== undefined) {
            await this.editFirstNameInput.clear();
            await this.editFirstNameInput.fill(options.firstName);
        }
        if (options.nickname !== undefined) {
            await this.editNicknameInput.clear();
            await this.editNicknameInput.fill(options.nickname);
        }
        if (options.phoneNumber !== undefined) {
            await this.editPhoneInput.clear();
            await this.editPhoneInput.fill(options.phoneNumber);
        }
        await this.saveChangesBtn.click();
        // Read view replaces edit heading; prod may show a toast instead — settle before tab switches.
        await expect
            .poll(
                async () => {
                    const editOpen = await this.editFormHeading.isVisible().catch(() => false);
                    if (!editOpen) return true;
                    if (await this.detailsHeading.isVisible().catch(() => false)) return true;
                    if (await this.successToast.isVisible().catch(() => false)) return true;
                    return false;
                },
                {
                    timeout: 35000,
                    message:
                        'Save did not complete — edit form stayed open with no read view or success toast',
                }
            )
            .toBeTruthy();
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Change password and optionally restore it afterwards.
     * Navigates to the password tab and clears fields between submits so Vue inputs don’t keep stale values.
     */
    async changePassword(currentPw: string, newPw: string, options = { restore: true }): Promise<void> {
        await this.gotoTab('password');
        await this.submitPasswordUpdate(currentPw, newPw, newPw);
        if (options.restore) {
            await this.gotoTab('password');
            await this.submitPasswordUpdate(newPw, currentPw, currentPw);
        }
    }

    private async submitPasswordUpdate(currentPw: string, newPw: string, confirmPw: string): Promise<void> {
        await this.updatePasswordBtn.waitFor({ state: 'visible', timeout: 25000 });
        await this.fillPasswordField(this.currentPasswordInput, currentPw);
        await this.fillPasswordField(this.newPasswordInput, newPw);
        await this.fillPasswordField(this.confirmPasswordInput, confirmPw);
        await this.updatePasswordBtn.click();
        await expect
            .poll(
                async () => {
                    if (await this.successToast.isVisible().catch(() => false)) return true;
                    const inlineOk = await this.passwordFormRoot
                        .getByText(/success|updated|changed|password.*updated/i)
                        .first()
                        .isVisible()
                        .catch(() => false);
                    return inlineOk;
                },
                { timeout: 25000, message: 'Password update produced no success toast or inline confirmation' }
            )
            .toBeTruthy();
    }

    private async fillPasswordField(locator: Locator, value: string): Promise<void> {
        await locator.waitFor({ state: 'visible', timeout: 15000 });
        await locator.clear({ force: true });
        await locator.fill(value, { force: true });
    }

    /** Get the current state (checked/unchecked) of a marketing toggle */
    async getToggleState(toggle: Locator): Promise<boolean> {
        try {
            return await toggle.evaluate((el) => {
                if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.checked;
                if (el.getAttribute('role') === 'switch') return el.getAttribute('aria-checked') === 'true';
                if (el.getAttribute('aria-checked') === 'true') return true;
                if (el.getAttribute('aria-checked') === 'false') return false;
                const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
                return input?.checked ?? false;
            });
        } catch {
            return toggle.isChecked().catch(() => false);
        }
    }

    /** Toggle a marketing preference checkbox and return the new checked state after the UI updates. */
    async toggleMarketing(toggle: Locator): Promise<boolean> {
        const before = await this.getToggleState(toggle);
        await toggle.click({ force: true });
        await expect
            .poll(async () => await this.getToggleState(toggle), { timeout: 15000 })
            .not.toBe(before);
        return await this.getToggleState(toggle);
    }

    /** Persist marketing checkbox changes — the Save button stays disabled until a value changes. */
    async saveMarketingPreferences(): Promise<void> {
        await expect(this.marketingSaveBtn).toBeEnabled({ timeout: 10000 });
        const saveRequest = this.page
            .waitForResponse(
                (response) =>
                    response.url().includes('update-customer-preferences') && response.status() === 200,
                { timeout: 20000 }
            )
            .catch(() => null);
        await this.marketingSaveBtn.click();
        await saveRequest;
        await this.page.waitForLoadState('domcontentloaded');
    }

    /** Toggle Free spins bonus — label click is flaky; target the Vue `value="free_spins"` input. */
    async clickBonusFreeSpinsRow(): Promise<void> {
        const pane = this.profileShell.filter({
            has: this.page.getByRole('heading', { name: /additional details/i }),
        });
        await pane.locator('input[type="checkbox"][value="free_spins"]').check({ force: true });
    }
}