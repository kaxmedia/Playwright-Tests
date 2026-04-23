// PAGE OBJECT MODEL (POM) — what is it and why do we use it?
//
// Think of this file as a "remote control" for the gambling.com homepage.
// Instead of every test file knowing HOW to find the logo or the nav menu,
// we put all of that knowledge here in one place.
//
// The benefit: if the website changes (e.g. the logo gets a new alt text),
// you fix it here once — and all your tests automatically stay working.
// Without POM, you'd have to hunt down and fix every single test file.

import { type Page, type Locator } from '@playwright/test';

export class HomePage {

  // The Playwright "page" object — this is the browser tab we're controlling
  readonly page: Page;

  // --- LOCATORS ---
  // A locator is like a pointer to a specific element on the page.
  // We define them all here so tests never need to know the HTML details.

  // The gambling.com logo image in the header
  readonly logo: Locator;

  // The "Reviews" link in the main navigation menu
  readonly reviewsNavLink: Locator;

  // The main heading (the big <h1> title at the top of the page)
  readonly mainHeading: Locator;

  // The URL of this page — one place to update if it ever changes
  readonly url = 'https://www.gambling.com';

  constructor(page: Page) {
    this.page = page;
    // The site uses 'global-nav-logo' class only on the navigation bar logo.
    // A second logo image exists inside the login modal, so we use this class
    // to target the correct one without ambiguity.
    this.logo          = page.locator('img.global-nav-logo');
    this.reviewsNavLink = page.getByRole('link', { name: 'Reviews' }).first();
    this.mainHeading   = page.getByRole('heading', { level: 1 });
  }

  // --- ACTIONS ---
  // Methods that do something on the page, like navigating to it.
  // Tests call these instead of writing raw Playwright commands.

  async goto() {
    await this.page.goto(this.url);
  }

}
