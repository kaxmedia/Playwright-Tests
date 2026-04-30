import { Page, Locator } from '@playwright/test';

export const AGE_VERIFICATION_GEOS = {
    nl: {
        url: 'https://www.gambling.com/nl',
        ageThreshold: 24,
        acceptBtnText: /ik ben 24 jaar of ouder/i,
        rejectBtnText: /ik ben jonger dan 24 jaar/i,
        modalHeadingText: /hoe oud bent u/i,
        underageRedirectUrl: 'https://www.gambling.com/nl/verantwoord-gokken',
        /** Footer “no gambling ads” line (`ins#footer-cookie-checkbox-label`) — short regex; live copy uses “online gokken”, not the substring “gokreclame”. */
        footerCheckboxText: /online gokken zien/i,
        footerDisclaimerText: /verantwoord gokken|wat kost gokken jou|24\+/i,
        language: 'nl',
    },
    es: {
        url: 'https://www.gambling.com/es',
        ageThreshold: 18,
        acceptBtnText: /sí, tengo más de 18 años/i,
        rejectBtnText: /todavía no tengo 18 años/i,
        modalHeadingText: /eres mayor de edad/i,
        underageRedirectUrl: 'https://www.gambling.com/es/juego-responsable',
        footerCheckboxText: /no quiero ver anuncios de apuestas/i,
        footerDisclaimerText: /juego responsable|no hagas apuestas/i,
        language: 'es',
    },
} as const;

export type GeoKey = keyof typeof AGE_VERIFICATION_GEOS;

export class AgeVerificationPage {
    readonly page: Page;
    readonly geo: typeof AGE_VERIFICATION_GEOS[GeoKey];

    // ── Age verification modal ──────────────────────────────────────────────────
    readonly modal: Locator;
    readonly modalHeading: Locator;
    readonly acceptBtn: Locator; // "I am 24+" / "Sí, tengo más de 18 años"
    readonly rejectBtn: Locator; // "I am under 24" / "Todavía no tengo 18 años"

    // ── NL only — modal checkbox ────────────────────────────────────────────────
    readonly modalCheckbox: Locator; // "Ik wil geen online gokreclame's zien"

    // ── Footer ──────────────────────────────────────────────────────────────────
    readonly footer: Locator;
    readonly footerCheckbox: Locator; // opt-out checkbox in footer
    readonly footerCheckboxLabel: Locator;
    readonly footerDisclaimer: Locator;

    // ── Page structure ──────────────────────────────────────────────────────────
    readonly logo: Locator;
    readonly mainNav: Locator;

    constructor(page: Page, geoKey: GeoKey) {
        this.page = page;
        this.geo = AGE_VERIFICATION_GEOS[geoKey];

        // Micromodal age gate (do not use generic [role=dialog] — matches cookie/CKY dialogs)
        this.modal = page.locator('#age-validation');

        this.modalHeading = this.modal.locator('#av-how-old');

        this.acceptBtn = page.getByRole('button', { name: this.geo.acceptBtnText });
        this.rejectBtn = page.getByRole('button', { name: this.geo.rejectBtnText });

        this.modalCheckbox = this.modal.locator('#ageValidationCheckBox');

        // Footer opt-out control navigates to the geo RG URL when clicked (same id NL & ES)
        this.footer = page.locator('footer').first();
        this.footerCheckbox = page.locator('#footer_cookie_checkbox');
        this.footerCheckboxLabel = page.locator('#footer-cookie-checkbox-label');
        this.footerDisclaimer = this.footer.locator('p, div').filter({
            hasText: this.geo.footerDisclaimerText,
        }).first();

        // Page structure
        this.logo = page.locator('img.global-nav-logo').nth(1);
        this.mainNav = page.locator('nav').first();
    }

    /**
     * Navigate to the geo homepage fresh — using `storageState: undefined` equivalent
     * by clearing cookies first so the age modal always appears.
     */
    async gotoFresh(): Promise<void> {
        await this.page.context().clearCookies();
        await this.page.goto(this.geo.url);
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Navigate to the geo homepage **without** clearing cookies (session / opt-out / age cookies preserved).
     * Use after age acceptance to confirm the gate stays dismissed, or after footer opt-out to confirm
     * the user cannot browse nl/es normally until cookies are cleared.
     */
    async gotoWithCookies(): Promise<void> {
        await this.page.goto(this.geo.url);
        await this.page.waitForLoadState('domcontentloaded');
    }

    /** Accept age verification — clicks the blue confirm button */
    async acceptAge(): Promise<void> {
        await this.acceptBtn.click();
        await this.page.waitForTimeout(500);
    }

    /** Reject age verification — clicks the underage button */
    async rejectAge(): Promise<void> {
        const prefix = this.geo.underageRedirectUrl.replace(/\/$/, '');
        await Promise.all([
            this.page.waitForURL((url) => url.href.replace(/\/$/, '').startsWith(prefix), { timeout: 20000 }),
            this.rejectBtn.click(),
        ]);
    }

    /**
     * Clicks the footer “no gambling ads” control — navigates to the geo responsible-gambling URL
     * (not an in-place toggle).
     */
    async tickFooterOptOut(): Promise<void> {
        await this.footer.scrollIntoViewIfNeeded();
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await Promise.all([
            this.page.waitForURL(/verantwoord-gokken|juego-responsable/, { timeout: 20000 }),
            this.footerCheckbox.click({ force: true }),
        ]);
    }
}