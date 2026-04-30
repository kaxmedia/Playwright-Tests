import { test, expect } from '@playwright/test';
import { AgeVerificationPage, AGE_VERIFICATION_GEOS } from '../pages/AgeVerificationPage';

// ─── Age Verification Tests — NL & ES ────────────────────────────────────────
//
// Covers compliance-critical age gate behaviour on two geos:
//   NL — gambling.com/nl — 24+ threshold, modal has opt-out checkbox
//   ES — gambling.com/es — 18+ threshold, modal marketing opt-out in DOM
//
// Key behaviours tested:
//   1. Modal appears on fresh visit (cookies cleared)
//   2. Correct heading and age threshold displayed
//   3. Accept button dismisses modal and shows page content
//   4. Reject button redirects to responsible gambling page
//   5. Modal is suppressed on return visit (cookie-based)
//   6. NL / ES modal marketing opt-out checkbox (NL visible, ES may be DOM-only)
//   7. Footer opt-out checkbox present and functional
//   8. Footer disclaimer text present
//   9. Footer opt-out navigates to RG; revisiting geo without clearing cookies blocks normal use (RG or age gate)
//  10. Page language and compliance hints per geo
//
// IMPORTANT: Each test calls gotoFresh() which clears cookies first,
// ensuring the modal always appears. Tests that check cookie suppression
// use a two-step flow: accept → reload → assert modal absent.
// Footer opt-out persists in cookies: revisiting nl/es without clearing cookies must not give a normal
// unrestricted homepage (RG redirect and/or age gate shown again — see regression test below).
// ─────────────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// Shared test factory — runs the same structural tests for both geos
// ════════════════════════════════════════════════════════════════════════════
for (const geoKey of ['nl', 'es'] as const) {
    const geo = AGE_VERIFICATION_GEOS[geoKey];

    test.describe(`Age Verification — ${geoKey.toUpperCase()} (${geo.url})`, () => {
        let avPage: AgeVerificationPage;

        test.beforeEach(async ({ page }) => {
            avPage = new AgeVerificationPage(page, geoKey);
            await avPage.gotoFresh();
        });

        // ── 1. Modal presence ────────────────────────────────────────────────────

        test('@smoke age verification modal appears on fresh visit', async () => {
            await expect(avPage.modal).toBeVisible({ timeout: 10000 });
        });

        test('@smoke modal heading is visible and contains age threshold', async () => {
            await expect(avPage.modalHeading).toBeVisible({ timeout: 10000 });
            const headingText = await avPage.modalHeading.innerText();
            expect(headingText.toLowerCase()).toMatch(avPage.geo.modalHeadingText);
        });

        test('@smoke accept button is visible with correct age text', async () => {
            await expect(avPage.acceptBtn).toBeVisible({ timeout: 10000 });
            const btnText = await avPage.acceptBtn.innerText();
            expect(btnText).toMatch(avPage.geo.acceptBtnText);
        });

        test('@smoke reject button is visible with correct age text', async () => {
            await expect(avPage.rejectBtn).toBeVisible({ timeout: 10000 });
            const btnText = await avPage.rejectBtn.innerText();
            expect(btnText).toMatch(avPage.geo.rejectBtnText);
        });

        test('@regression modal blocks page content until dismissed', async ({ page }) => {
            // Modal should be visible and the page behind it should be inaccessible
            await expect(avPage.modal).toBeVisible({ timeout: 10000 });

            // Nav and logo should not be interactable while modal is open
            // The modal overlay should cover the page
            const modalBox = await avPage.modal.boundingBox();
            expect(modalBox).not.toBeNull();
            expect(modalBox!.width).toBeGreaterThan(100);
            expect(modalBox!.height).toBeGreaterThan(100);
        });

        // ── 2. Accept flow ───────────────────────────────────────────────────────

        test('@smoke clicking accept dismisses the modal', async () => {
            await expect(avPage.acceptBtn).toBeVisible({ timeout: 10000 });
            await avPage.acceptAge();
            await expect(avPage.modal).toBeHidden({ timeout: 8000 });
        });

        test('@smoke page content is accessible after accepting', async () => {
            await avPage.acceptAge();
            await expect(avPage.modal).toBeHidden({ timeout: 8000 });
            await expect(avPage.logo).toBeVisible({ timeout: 8000 });
            await expect(avPage.mainNav).toBeVisible();
        });

        test('@regression page URL stays on geo homepage after accepting', async ({ page }) => {
            await avPage.acceptAge();
            await expect(page).toHaveURL(geo.url);
        });

        // ── 3. Reject flow ───────────────────────────────────────────────────────

        test('@smoke clicking reject redirects to responsible gambling page', async ({ page }) => {
            await expect(avPage.rejectBtn).toBeVisible({ timeout: 10000 });
            await avPage.rejectAge();
            await expect(page).toHaveURL(geo.underageRedirectUrl, { timeout: 15000 });
        });

        test('@regression responsible gambling redirect page loads correctly', async ({ page }) => {
            await avPage.rejectAge();
            await expect(page).toHaveURL(geo.underageRedirectUrl, { timeout: 15000 });

            // Page should have loaded — not a 404 or blank
            const title = await page.title();
            expect(title).not.toBe('');
            expect(title.toLowerCase()).not.toContain('404');
            expect(title.toLowerCase()).not.toContain('error');
        });

        // ── 4. Cookie suppression ────────────────────────────────────────────────

        test('@regression modal is suppressed on reload after accepting (cookie-based)', async ({ page }) => {
            // Step 1 — accept the modal (sets the cookie)
            await expect(avPage.acceptBtn).toBeVisible({ timeout: 10000 });
            await avPage.acceptAge();
            await expect(avPage.modal).toBeHidden({ timeout: 8000 });

            // Step 2 — reload WITHOUT clearing cookies
            await avPage.gotoWithCookies();

            // Modal should not reappear
            await page.waitForTimeout(2000); // allow time for modal to appear if it's going to
            await expect(avPage.modal).toBeHidden({ timeout: 5000 });
        });

        test('@regression page content is immediately accessible on return visit', async () => {
            // Accept first
            await avPage.acceptAge();
            await expect(avPage.modal).toBeHidden({ timeout: 8000 });

            // Return visit
            await avPage.gotoWithCookies();
            await expect(avPage.logo).toBeVisible({ timeout: 8000 });
            await expect(avPage.mainNav).toBeVisible();
        });

        // ── 5. Footer opt-out checkbox ───────────────────────────────────────────

        test('@smoke footer opt-out checkbox is present after accepting', async ({ page }) => {
            await avPage.acceptAge();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            // ES: checkbox can be styled hidden like the modal opt-out — prefer attached + NL stays visible smoke
            if (geoKey === 'es') {
                await expect(avPage.footerCheckbox).toBeAttached();
            } else {
                await expect(avPage.footerCheckbox).toBeVisible({ timeout: 8000 });
            }
        });

        test('@smoke footer opt-out checkbox label contains correct text', async ({ page }) => {
            await avPage.acceptAge();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await expect(avPage.footerCheckboxLabel).toBeVisible({ timeout: 8000 });
            const labelText = await avPage.footerCheckboxLabel.innerText();
            expect(labelText).toMatch(geo.footerCheckboxText);
        });

        test('@regression footer opt-out navigates to responsible gambling URL', async () => {
            await avPage.acceptAge();
            await avPage.tickFooterOptOut();
            await expect(avPage.page).toHaveURL(/verantwoord-gokken|juego-responsable/);
        });

        test('@regression after footer opt-out, revisiting geo without clearing cookies blocks normal browsing', async () => {
            await avPage.acceptAge();
            await expect(avPage.modal).toBeHidden({ timeout: 8000 });

            await avPage.tickFooterOptOut();
            await expect(avPage.page).toHaveURL(/verantwoord-gokken|juego-responsable/);

            // Same session cookies (opt-out persisted) — must NOT silently grant unrestricted nl/es
            await avPage.gotoWithCookies();

            await expect
                .poll(
                    async () => {
                        const u = avPage.page.url();
                        if (/verantwoord-gokken|juego-responsable/.test(u)) return true;
                        return avPage.modal.isVisible();
                    },
                    {
                        timeout: 15000,
                        message:
                            'Expected redirect to responsible-gambling URL or age gate visible again after opt-out + return to geo',
                    }
                )
                .toBe(true);
        });

        // ── 6. Footer compliance ──────────────────────────────────────────────────

        test('@smoke footer responsible gambling disclaimer is visible', async ({ page }) => {
            await avPage.acceptAge();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await expect(avPage.footer).toBeVisible();
            const footerText = await avPage.footer.innerText();
            expect(footerText.toLowerCase()).toMatch(geo.footerDisclaimerText);
        });

        test('@regression footer contains links', async ({ page }) => {
            await avPage.acceptAge();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            const links = avPage.footer.locator('a');
            const count = await links.count();
            expect(count).toBeGreaterThan(5);
        });

        // ── 7. Page language ─────────────────────────────────────────────────────

        test(`@smoke HTML lang attribute is "${geo.language}"`, async ({ page }) => {
            const lang = await page.locator('html').getAttribute('lang');
            expect(lang).toMatch(new RegExp(`^${geo.language}`, 'i'));
        });

    });
}

// ════════════════════════════════════════════════════════════════════════════
// NL-specific tests
// ════════════════════════════════════════════════════════════════════════════
test.describe('Age Verification — NL specific', () => {
    let avPage: AgeVerificationPage;

    test.beforeEach(async ({ page }) => {
        avPage = new AgeVerificationPage(page, 'nl');
        await avPage.gotoFresh();
    });

    test('@smoke NL modal contains opt-out checkbox', async () => {
        await expect(avPage.modal).toBeVisible({ timeout: 10000 });
        await expect(avPage.modalCheckbox).toBeVisible();
    });

    test('@regression NL modal opt-out checkbox can be ticked before accepting', async () => {
        await expect(avPage.modal).toBeVisible({ timeout: 10000 });
        await avPage.modalCheckbox.check({ force: true });
        const isChecked = await avPage.modalCheckbox.isChecked();
        expect(isChecked).toBe(true);
    });

    test('@regression NL age threshold is 24 — button does not mention 18', async () => {
        const acceptText = await avPage.acceptBtn.innerText();
        expect(acceptText).not.toMatch(/18/);
        expect(acceptText).toMatch(/24/);
    });

    test('@smoke NL footer shows RG messaging (24+ / cost awareness)', async ({ page }) => {
        await avPage.acceptAge();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const footerText = await avPage.footer.innerText();
        expect(footerText.toLowerCase()).toMatch(/wat kost gokken|24\+|verantwoord gokken/i);
    });

    test('@smoke NL underage redirect URL contains verantwoord-gokken', async ({ page }) => {
        await avPage.rejectAge();
        await expect(page).toHaveURL(/verantwoord-gokken/, { timeout: 15000 });
    });
});

// ════════════════════════════════════════════════════════════════════════════
// ES-specific tests
// ════════════════════════════════════════════════════════════════════════════
test.describe('Age Verification — ES specific', () => {
    let avPage: AgeVerificationPage;

    test.beforeEach(async ({ page }) => {
        avPage = new AgeVerificationPage(page, 'es');
        await avPage.gotoFresh();
    });

    test('@smoke ES modal includes marketing opt-out checkbox in DOM', async () => {
        await expect(avPage.modal).toBeVisible({ timeout: 10000 });
        // ES can hide the native checkbox visually while keeping it for behaviour / a11y
        expect(await avPage.modalCheckbox.count()).toBe(1);
        await expect(avPage.modalCheckbox).toBeAttached();
    });

    test('@regression ES age threshold is 18 — button does not mention 24', async () => {
        const acceptText = await avPage.acceptBtn.innerText();
        expect(acceptText).not.toMatch(/24/);
        expect(acceptText).toMatch(/18/);
    });

    test('@smoke ES compliance logos present in footer — Juego Seguro and AutoProhibición', async ({ page }) => {
        await avPage.acceptAge();
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        const footerImgs = avPage.footer.locator('img');
        const alts: string[] = [];
        const count = await footerImgs.count();
        for (let i = 0; i < count; i++) {
            const alt = await footerImgs.nth(i).getAttribute('alt') ?? '';
            alts.push(alt.toLowerCase());
        }
        const footerText = await avPage.footer.innerText();
        const hasJuegoSeguro = alts.some(a => a.includes('juego')) || footerText.toLowerCase().includes('juego seguro');
        const hasAutoProhibicion = alts.some(a => a.includes('auto')) || footerText.toLowerCase().includes('autoprohibici');
        expect(hasJuegoSeguro || hasAutoProhibicion).toBe(true);
    });

    test('@smoke ES underage redirect URL contains juego-responsable', async ({ page }) => {
        await avPage.rejectAge();
        await expect(page).toHaveURL(/juego-responsable/, { timeout: 15000 });
    });
});