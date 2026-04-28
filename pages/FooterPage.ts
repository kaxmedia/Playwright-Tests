import { type Page, type Locator } from '@playwright/test';

export class FooterPage {
  readonly page: Page;

  // The semantic <footer> element — no CSS class needed, it's the only footer on the page
  readonly footer: Locator;

  // "Responsible Gambling" compliance link — legally required on every gambling site
  readonly responsibleGamblingLink: Locator;

  // "Terms and Conditions" compliance link — exact:true prevents it matching "Rewards Terms and Conditions"
  // .first() because the same text appears twice in the footer (nav section + bottom inline text)
  readonly termsLink: Locator;

  // "Privacy and Cookies Policy" compliance link — same reason for exact:true and .first()
  readonly privacyLink: Locator;

  // The <p> at the bottom of the footer — contains both the disclaimer and the copyright line
  readonly legalText: Locator;

  // Every <a> tag inside the footer — used for the bulk link count and broken-link check
  readonly allLinks: Locator;

  constructor(page: Page) {
    this.page = page;

    this.footer = page.locator('footer');

    // Compliance links are scoped to <footer> so we never accidentally match body content
    this.responsibleGamblingLink = this.footer.getByRole('link', { name: 'Responsible Gambling', exact: true });
    this.termsLink               = this.footer.getByRole('link', { name: 'Terms and Conditions',        exact: true }).first();
    this.privacyLink             = this.footer.getByRole('link', { name: 'Privacy and Cookies Policy', exact: true }).first();

    // Filter to the <p> that contains "GDC Media Limited" — that is the copyright paragraph
    this.legalText = this.footer.locator('p').filter({ hasText: 'GDC Media Limited' });

    this.allLinks = this.footer.locator('a');
  }

  // Navigate to the homepage — the footer is the same on every gambling.com page
  async goto() {
    await this.page.goto('https://www.gambling.com');
  }

  // Scroll the footer into the viewport so visibility assertions work reliably
  async scrollToFooter() {
    await this.footer.scrollIntoViewIfNeeded();
  }

  // TODO (follow-up PR): Add regulatory logo locators and landing-page liveness checks.
  //
  // Each geographic variant of the footer carries its own set of regulatory/responsible-gambling
  // logos. These are image links (<a><img></a>) and are intentionally NOT tested in this PR.
  // They will be covered in a dedicated follow-up PR with per-geo assertions and HTTP 200 checks
  // on each logo's destination URL.
  //
  // Logos confirmed present per geo (explored 2026-04-28):
  //   Global  — Gamcare (gamcare.org.uk), Gambling Care (gamblingcare.ie),
  //              Extern Problem Gambling (problemgambling.ie), GPWA
  //   US      — NCP Gambling (ncpgambling.org), 800 Gambler (800gambler.org), GPWA
  //   UK      — Gamstop (gamstop.co.uk), Gamcare, GambleAware (gambleaware.org), GPWA
  //   DE      — Spiel nicht bis zur Glücksspielsucht (spielen-mit-verantwortung.de), GPWA
  //   GR      — Keoea / ΚΕΘΕΑ (kethea.gr), EEEP / Greek Gaming Commission
  //              (gamingcommission.gov.gr), GambleAware, GPWA
  //
  // GPWA Approved Portal (certify.gpwa.org/verify/gambling.com) is the only logo present
  // on every geo and should be the first assertion written in the follow-up PR.
  //
  // Note: DE has no country flag/geo selector in its footer — all other geos do.
  // Locator pattern for logo links: footer.locator('a:has(img)')

  // Returns any compliance link inside the footer by its display text.
  // Used by geo tests where the link label differs by language — e.g. "Responsible Gambling"
  // in English becomes "Verantwortungsvolles Spielen" in German. Passing the text as an
  // argument means the same test code works for every language without branching.
  // exact:true prevents partial matches (e.g. "Terms" matching "Rewards Terms").
  // .first() is a safety net for cases where the same label appears more than once in the footer.
  complianceLink(text: string): Locator {
    return this.footer.getByRole('link', { name: text, exact: true }).first();
  }
}
