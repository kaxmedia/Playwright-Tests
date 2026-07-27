import { expect, type Locator, type Page } from '@playwright/test';
import { test } from '../../fixtures/test';

/** Minimal surface shared by UK / IE / DE casino category landing POMs. */
export interface CasinoLandingPageLike {
  page: Page;
  pageTitle: Locator;
  logo: Locator;
  mainNav: Locator;
  geoSwitcher: Locator;
  operatorLogos: Locator;
  operatorRatings: Locator;
  operatorCTAs: Locator;
  anchorMenu: Locator;
  anchorLinks: Locator;
  faqSection: Locator;
  faqItems: Locator;
  footer: Locator;
  getOperatorCount(): Promise<number>;
  goto(): Promise<void>;
}

export interface CasinoLandingSmokeOptions {
  describeTitle: string;
  expectedUrl: string | RegExp;
  /** Substring that must appear in CTA hrefs (e.g. `/go/ie/` or `/go/`). */
  goHrefContains: string;
  /** When false, skips the rating-row assertion (e.g. DE). */
  hasRatings?: boolean;
  /** When false, skips the geo-switcher assertion (e.g. DE has no UK-style header control). */
  hasGeoSwitcher?: boolean;
  createPage: (page: Page) => CasinoLandingPageLike;
}

/**
 * Shared fundamentals + oplist + FAQ + footer smoke for geo casino category landings.
 * Geo-specific cases (currency, compare modal, DE quirks) stay in the caller file.
 */
export function registerCasinoLandingSmoke(options: CasinoLandingSmokeOptions): void {
  const {
    describeTitle,
    expectedUrl,
    goHrefContains,
    hasRatings = true,
    hasGeoSwitcher = true,
    createPage,
  } = options;

  test.describe(describeTitle, () => {
    let landing: CasinoLandingPageLike;

    test.beforeEach(async ({ page }) => {
      landing = createPage(page);
      await landing.goto();
    });

    test('@regression page loads with a non-empty title', async ({ page }) => {
      await expect(page).toHaveURL(expectedUrl);
      const title = await page.title();
      expect(title).not.toBe('');
      expect(title.toLowerCase()).not.toContain('404');
      expect(title.toLowerCase()).not.toContain('error');
    });

    test('@regression H1 is visible and non-empty', async () => {
      await expect(landing.pageTitle).toBeVisible();
      expect((await landing.pageTitle.innerText()).trim()).not.toBe('');
    });

    test('@regression logo is visible', async () => {
      await expect(landing.logo).toBeVisible();
    });

    test('@regression main navigation is visible', async () => {
      await expect(landing.mainNav).toBeVisible();
    });

    if (hasGeoSwitcher) {
      test('@regression geo switcher is visible', async () => {
        await expect(landing.geoSwitcher).toBeVisible();
      });
    }

    test('@regression operator list renders at least 5 rows', async () => {
      expect(await landing.getOperatorCount()).toBeGreaterThanOrEqual(5);
    });

    test('@regression each operator row has a visible logo', async () => {
      const logos = landing.operatorLogos;
      const count = await logos.count();
      expect(count).toBeGreaterThanOrEqual(5);
      const limit = Math.min(count, 10);
      for (let i = 0; i < limit; i++) {
        await expect(logos.nth(i)).toBeVisible();
        expect(await logos.nth(i).getAttribute('src')).toBeTruthy();
      }
    });

    if (hasRatings) {
      test('@regression each operator row has a visible rating', async () => {
        const ratings = landing.operatorRatings;
        expect(await ratings.count()).toBeGreaterThanOrEqual(5);
      });
    }

    test('@regression operator CTAs are visible and have valid /go/ hrefs', async () => {
      const ctas = landing.operatorCTAs;
      const count = await ctas.count();
      expect(count).toBeGreaterThanOrEqual(5);
      const limit = Math.min(count, 10);
      for (let i = 0; i < limit; i++) {
        const cta = ctas.nth(i);
        const href = await cta.evaluate((el: HTMLAnchorElement) => el.href);
        expect(href).toContain(goHrefContains);
        expect(href).not.toBe('');
        if (i < 3) {
          await cta.evaluate((el: HTMLElement) => el.scrollIntoView({ block: 'center' }));
          await expect(cta).toBeVisible({ timeout: 8000 });
        }
      }
    });

    test('@regression operator CTAs do not use dead # hrefs', async () => {
      const ctas = landing.operatorCTAs;
      const limit = Math.min(await ctas.count(), 10);
      for (let i = 0; i < limit; i++) {
        expect(await ctas.nth(i).getAttribute('href')).not.toBe('#');
      }
    });

    test('@regression anchor menu is visible', async () => {
      await expect(landing.anchorMenu).toBeVisible();
    });

    test('@regression anchor menu has at least 3 links', async () => {
      expect(await landing.anchorLinks.count()).toBeGreaterThanOrEqual(3);
    });

    test('@regression FAQ section is present', async () => {
      await expect(landing.faqSection).toBeVisible();
    });

    test('@regression FAQ has at least 2 items', async () => {
      expect(await landing.faqItems.count()).toBeGreaterThanOrEqual(2);
    });

    test('@regression footer is visible', async () => {
      await landing.footer.scrollIntoViewIfNeeded();
      await expect(landing.footer).toBeVisible();
    });
  });
}
