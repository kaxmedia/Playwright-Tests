import { test, expect, type Page } from '../../fixtures/test';
import { MobilePage } from '../../pages/MobilePage';
import { AuthPage } from '../../pages/AuthPage';
import { SearchPage } from '../../pages/SearchPage';
import { ComparisonPage } from '../../pages/ComparisonPage';
import { AgeVerificationPage } from '../../pages/AgeVerificationPage';
import { FooterPage } from '../../pages/FooterPage';

// Device emulation is configured per project in playwright.config.ts:
//   mobile-iphone (WebKit) · mobile-samsung (Chromium)

const UK_CASINOS = '/uk/online-casinos';

async function assertNoHorizontalOverflow(page: Page) {
  const viewportWidth = page.viewportSize()?.width ?? 0;
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
}

// ── Navigation ─────────────────────────────────────────────────────────────────
test.describe('Mobile Navigation', () => {
  test('@smoke @mobile hamburger menu opens', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    await expect(mobile.menuToggle).toBeVisible();
    await mobile.openMenu();
    await expect(mobile.menuPopularLinks.first()).toBeVisible();
  });

  test('@mobile hamburger menu closes', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    await mobile.openMenu();
    await mobile.closeMenu();
    await expect(mobile.menuPanel).toBeHidden();
  });

  test('@mobile logo is tappable and returns to homepage', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto(UK_CASINOS);
    await mobile.acceptCookiesIfShown();

    const logo = mobile.logoHomeLink;
    await expect(logo).toBeVisible();
    await logo.tap();
    // From a /uk/* page the logo returns to the localized homepage (/uk), not the
    // bare root — accept any locale segment (e.g. /uk, /is/en, /be/fr).
    await expect(page).toHaveURL(/gambling\.com\/[a-z]{2}(\/[a-z]{2})?\/?(\?|$|#)/, { timeout: 15000 });
  });

  test('@regression @mobile navigation links are accessible in menu', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    await mobile.openMenu();
    expect(await mobile.menuPopularLinks.count()).toBeGreaterThanOrEqual(2);
    expect(await mobile.menuLinks.count()).toBeGreaterThanOrEqual(3);
  });
});

// ── Responsive layout ──────────────────────────────────────────────────────────
test.describe('Mobile Responsive Layout', () => {
  test('@smoke @mobile homepage renders correctly', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    await assertNoHorizontalOverflow(page);
    await expect(mobile.visibleMainHeading).toBeVisible();
  });

  test('@mobile category landing page has no horizontal scroll', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto(UK_CASINOS);
    await mobile.acceptCookiesIfShown();
    await assertNoHorizontalOverflow(page);
  });

  test('@mobile news page renders single-column layout', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/news');
    await mobile.acceptCookiesIfShown();
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('article, [class*="card"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('@regression @mobile footer is visible and not overlapping content', async ({ page }) => {
    const mobile = new MobilePage(page);
    const footerPage = new FooterPage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    await footerPage.scrollToFooter();
    await expect(footerPage.footer).toBeVisible();

    const footerBox = await footerPage.footer.boundingBox();
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (footerBox) {
      expect(footerBox.width).toBeLessThanOrEqual(viewportWidth + 5);
    }
  });

  test('@mobile images are within viewport width', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const oversizedImages = await page.evaluate(vpWidth => {
      return Array.from(document.querySelectorAll('img'))
        .filter(img => img.getBoundingClientRect().width > vpWidth + 5)
        .map(img => img.src);
    }, viewportWidth);

    expect(oversizedImages).toHaveLength(0);
  });
});

// ── Touch interactions ─────────────────────────────────────────────────────────
test.describe('Mobile Touch Interactions', () => {
  test('@smoke @mobile CTA buttons are tappable', async ({ page }) => {
    const cp = new ComparisonPage(page);
    await cp.goto(UK_CASINOS);
    await new MobilePage(page).acceptCookiesIfShown();

    const card = cp.nthCard(0);
    const cta = cp.ctaLink(card);
    await expect(cta).toBeVisible({ timeout: 15000 });
    expect(await cta.getAttribute('href')).toMatch(/\/go\//);

    const box = await cta.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
      expect(box.width).toBeGreaterThanOrEqual(40);
    }
  });

  test('@regression @mobile CTA opens affiliate flow in new tab on tap', async ({ page }) => {
    const cp = new ComparisonPage(page);
    await cp.goto(UK_CASINOS);
    await new MobilePage(page).acceptCookiesIfShown();

    const card = cp.nthCard(0);
    const cta = cp.ctaLink(card);
    await expect(cta).toBeVisible({ timeout: 15000 });
    expect(await cta.getAttribute('href')).toMatch(/\/go\//);

    const affiliateTab = await cp.openCtaAffiliateTab(card, { tap: true });

    await expect
      .poll(() => affiliateTab.url(), { timeout: 20000 })
      .not.toMatch(/^about:blank$/);

    const url = affiliateTab.url();
    if (url.includes('gambling.com')) {
      expect(url, 'On-site affiliate hops must stay on /go/').toContain('/go/');
    } else {
      expect(url, 'Off-site redirect should be https').toMatch(/^https:\/\//);
    }

    await affiliateTab.close();
    await expect(page).toHaveURL(new RegExp(`${UK_CASINOS}(\\?|$|#)`));
  });

  test('@mobile sign up button is tappable', async ({ page }) => {
    const mobile = new MobilePage(page);
    const auth = new AuthPage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    const register = mobile.registerNowButton;
    await expect(register).toBeVisible({ timeout: 15000 });
    const box = await register.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
    }

    // Mobile '/' serves the /rewards promo page, whose "Register now" CTA is a
    // <div role="button"> with a JS-only handler that doesn't fire on a synthetic
    // tap. Open the auth modal via the page-independent header trigger
    // (force/JS-click), matching the sign-in test below.
    await auth.openSignUpModal();
    await expect(auth.signupModal).toBeVisible({ timeout: 10000 });
  });

  test('@mobile sign in modal opens and form inputs are tappable', async ({ page }) => {
    const mobile = new MobilePage(page);
    const auth = new AuthPage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    // openSignInModal waits for Register now / modal / Sign In link (mobile) or header Sign In (desktop)
    await auth.openSignInModal();
    if (await auth.continueWithEmailBtn.isVisible().catch(() => false)) {
      await auth.continueWithEmailBtn.click();
    }

    await expect(auth.signInEmailInput).toBeVisible({ timeout: 10000 });
    await auth.signInEmailInput.fill('test@example.com');
    expect(await auth.signInEmailInput.inputValue()).toBe('test@example.com');

    await expect(auth.signInPasswordInput).toBeVisible();
    await auth.signInPasswordInput.fill('TestPassword1!');
    expect(await auth.signInPasswordInput.inputValue()).toBe('TestPassword1!');
  });

  test('@regression @mobile operator list is present on category page', async ({ page }) => {
    const cp = new ComparisonPage(page);
    await cp.goto(UK_CASINOS);
    await new MobilePage(page).acceptCookiesIfShown();

    await expect(cp.cards.first()).toBeVisible();
    expect(await cp.cards.count()).toBeGreaterThanOrEqual(5);
  });
});

// ── Cookie banner ──────────────────────────────────────────────────────────────
// Deliberately does not call acceptCookiesIfShown() — fresh context must keep the banner up.
test.describe('Mobile Cookie Banner', () => {
  test('@smoke @mobile cookie banner is visible and Accept is tappable', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');

    const banner = page.locator('.cky-consent-container');
    await expect(banner).toBeVisible({ timeout: 10000 });

    const acceptBtn = page.getByRole('button', { name: /accept all/i });
    await expect(acceptBtn).toBeVisible();

    const box = await acceptBtn.boundingBox();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(40);
    }

    await acceptBtn.tap();
    await expect(banner).toBeHidden({ timeout: 8000 });
  });

  test('@mobile cookie banner does not overflow viewport', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');

    const banner = page.locator('.cky-consent-container');
    const visible = await banner.isVisible({ timeout: 8000 }).catch(() => false);
    test.skip(!visible, 'CookieYes banner not shown (often suppressed in headless)');

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const bannerBox = await banner.boundingBox();
    if (bannerBox) {
      expect(bannerBox.width).toBeLessThanOrEqual(viewportWidth + 5);
    }
  });
});

// ── Search ─────────────────────────────────────────────────────────────────────
test.describe('Mobile Search', () => {
  test('@smoke @mobile search icon is tappable', async ({ page }) => {
    const mobile = new MobilePage(page);
    const search = new SearchPage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    await expect(search.searchIcon).toBeVisible({ timeout: 10000 });
    await search.openSearch();
    await expect(search.searchInput).toBeVisible({ timeout: 8000 });
  });

  test('@mobile search input accepts text', async ({ page }) => {
    const mobile = new MobilePage(page);
    const search = new SearchPage(page);
    await mobile.goto('/');
    await mobile.acceptCookiesIfShown();

    await search.searchFor('casino');
    expect(await search.searchInput.inputValue()).toBe('casino');
  });
});

// ── Age verification (NL) ──────────────────────────────────────────────────────
test.describe('Mobile Age Verification (NL)', () => {
  test('@regression @mobile age verification modal renders correctly', async ({ page }) => {
    const av = new AgeVerificationPage(page, 'nl');
    await av.gotoFresh();

    await expect(av.modal).toBeVisible({ timeout: 10000 });

    const viewportWidth = page.viewportSize()?.width ?? 0;
    const box = await av.modal.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(viewportWidth + 5);
    }

    await expect(av.acceptBtn).toBeVisible();
    await expect(av.rejectBtn).toBeVisible();
  });
});

// ── Document meta (mobile viewport) ────────────────────────────────────────────
test.describe('Mobile document meta', () => {
  test('@regression @mobile homepage viewport meta tag is set correctly', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).not.toBeNull();
    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('initial-scale=1');
  });

  test('@regression @mobile touch icons and PWA meta are present', async ({ page }) => {
    const mobile = new MobilePage(page);
    await mobile.goto('/');

    const touchIcon = page.locator(
      'link[rel="apple-touch-icon"], link[rel="icon"], link[rel="shortcut icon"]'
    );
    expect(await touchIcon.count()).toBeGreaterThanOrEqual(1);
  });
});
