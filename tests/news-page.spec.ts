import { test, expect } from '../fixtures/test';
import { NewsPage } from '../pages/NewsPage';
import { FirstPartyPageGuards, unexpectedPageErrors, unexpectedConsoleErrors } from './helpers/firstPartyPageGuards';

// ─── Shared setup ────────────────────────────────────────────────────────────
test.describe('Global News Page', () => {
  let newsPage: NewsPage;

  test.beforeEach(async ({ page }) => {
    newsPage = new NewsPage(page);
    await newsPage.goto();
  });

  // ─── 1. Page fundamentals ───────────────────────────────────────────────────
  test.describe('Page fundamentals', () => {

    test('@regression page loads and has correct title', async ({ page }) => {
      await expect(page).toHaveTitle(/news/i);
      await expect(page).not.toHaveTitle('');
    });

    test('@regression page URL is correct', async ({ page }) => {
      await expect(page).toHaveURL(/\/news/);
    });

    test('@regression logo is visible', async () => {
      await expect(newsPage.logo).toBeVisible({ timeout: 25_000 });
      await newsPage.logo.scrollIntoViewIfNeeded();
    });

    test('@regression main navigation is visible', async () => {
      await expect(newsPage.mainNav).toBeVisible();
    });

  });

  // ─── 2. News sections ───────────────────────────────────────────────────────
  test.describe('News sections', () => {

    test('@regression page contains expected category sections', async () => {
      // Section titles live in carousels; inactive slides are often `visibility: hidden`, so assert
      // copy in `<main>` instead of per-heading visibility.
      const main = newsPage.categoryLabelsInMain();
      await expect(main).toContainText('Casino News');
      await expect(main).toContainText('Horse Racing News');
      await expect(main).toContainText('Football News');
      await expect(main).toContainText('Entertainment News');
      await expect(main).toContainText('Politics News');
      await expect(main).toContainText('Betting News');
    });

    test('@regression at least 6 article cards are rendered', async () => {
      const count = await newsPage.getArticleCount();
      expect(count).toBeGreaterThanOrEqual(6);
    });

    test('@regression each article card has a title and image', async () => {
      const cards = newsPage.contentCards.filter({ hasNotText: '' });
      const count = await cards.count();

      let checked = 0;
      for (let i = 0; i < count && checked < 10; i++) {
        const card = cards.nth(i);
        if (!(await card.isVisible())) {
          continue; // carousel / inactive slide clones are attached but not shown
        }
        await card.scrollIntoViewIfNeeded();
        await expect(card).not.toHaveText('');
        const img = card.locator('img').first();
        await expect(img).toBeAttached();
        await expect(img).toHaveAttribute('src', /\S+/);
        checked++;
      }
      expect(checked).toBeGreaterThanOrEqual(1);
    });

    test('@regression article images do not have broken src', async () => {
      const imgs = newsPage.listingCardImages();
      const count = await imgs.count();
      const limit = Math.min(count, 10);

      for (let i = 0; i < limit; i++) {
        const src = await imgs.nth(i).getAttribute('src');
        expect(src).toBeTruthy();
        expect(src).not.toBe('');
      }
    });

  });

  // ─── 3. Article navigation ──────────────────────────────────────────────────
  test.describe('Article navigation', () => {

    test('@regression clicking an article navigates to an article page', async ({ page }) => {
      const firstArticleLink = newsPage.firstArticleCardLink();
      const href = await firstArticleLink.getAttribute('href');

      expect(href).toBeTruthy(); // link exists
      expect(href).not.toBe('#'); // not a dead link

      await firstArticleLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Should have navigated away from /news
      await expect(page).not.toHaveURL(/^https:\/\/www\.gambling\.com\/news\/?$/);
    });

    test('@regression section “All … News” hub links are present', async () => {
      const count = await newsPage.seeMoreButtons.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('@regression clicking an “All … News” link leaves the news index', async ({ page }) => {
      const firstHub = newsPage.seeMoreButtons.first();
      await expect(firstHub).toBeVisible();

      const href = await firstHub.getAttribute('href');
      expect(href).toBeTruthy();
      expect(href).not.toBe('#');

      await firstHub.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).not.toHaveURL(/^https:\/\/www\.gambling\.com\/news\/?$/);
    });

  });

  // ─── 4. Sidebar CTA ─────────────────────────────────────────────────────────
  test.describe('Sidebar CTA', () => {

    test('@regression "Create a Free Account" CTA is visible', async () => {
      await expect(newsPage.createAccountCTA).toBeVisible();
    });

    test('@regression email signup promo block wraps the account CTA', async () => {
      await expect(newsPage.emailSignupPromo).toBeVisible();
      await expect(newsPage.emailSignupPromo).toContainText(/free account/i);
    });

  });

  // ─── 5. Footer ──────────────────────────────────────────────────────────────
  test.describe('Footer', () => {

    test('@regression footer is visible', async () => {
      await newsPage.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(newsPage.footer).toBeVisible();
    });

    test('@regression footer contains links', async () => {
      const count = await newsPage.footerLinks.count();
      expect(count).toBeGreaterThan(5);
    });

    test('@regression footer links are not broken (no empty hrefs)', async () => {
      const links = newsPage.footerLinks;
      const count = await links.count();
      const limit = Math.min(count, 20);

      for (let i = 0; i < limit; i++) {
        const href = await links.nth(i).getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).not.toBe('#');
      }
    });

  });

  // ─── 6. Performance / resilience ────────────────────────────────────────────
  test.describe('Performance & resilience', () => {

    test('@regression page has no console errors on load', async ({ page }) => {
      const guards = new FirstPartyPageGuards(page);
      // Allowlist the long-standing third-party Microsoft Clarity CORS beacon
      // (k.clarity.ms/collect) — see KNOWN_PAGE_ERROR_ALLOWLIST / KNOWN_CONSOLE_ERROR_ALLOWLIST.
      // Filter both buckets since the CORS failure lands inconsistently across webkit/firefox.
      const clarity = ['clarity-collect-cors'];
      try {
        await newsPage.goto();
        expect(unexpectedPageErrors(guards.pageErrors, clarity)).toEqual([]);
        expect(unexpectedConsoleErrors(guards.firstPartyConsoleErrors, clarity)).toEqual([]);
      } finally {
        guards.detach();
      }
    });

    test('@regression page has no failed network requests', async ({ page }) => {
      const failed: string[] = [];
      page.on('requestfailed', req => failed.push(req.url()));

      await newsPage.goto();
      const critical = failed.filter(url => {
        try {
          const host = new URL(url).hostname.replace(/^www\./, '');
          if (host !== 'gambling.com') return false;
          // Cloudflare RUM beacons occasionally fail without affecting page UX
          if (url.includes('/cdn-cgi/rum')) return false;
          return true;
        } catch {
          return false;
        }
      });
      expect(critical).toHaveLength(0);
    });

  });

});
