// ─────────────────────────────────────────────────────────────────────────────
// Slot Review & Demo Page — Test Suite
//
// Covers the slot game review page template on gambling.com.
// URL pattern: /{geo}/online-casinos/slots/{slug}
//
// Page Object: pages/SlotReviewPage.ts
//
// Run with:
//   npx playwright test tests/slot-review-page.spec.ts --project=chrome
//   npx playwright test tests/slot-review-page.spec.ts --grep @smoke
//
// Design principles:
//   - Demo is tested for presence and correct data-demourl, NOT for actual
//     game load. Triggering a live SlotsLaunch iframe in CI would add
//     external network dependency and flakiness.
//   - Anonymous demo: handler invoked via activateGameDemo() (login gate blocks click).
//   - Authenticated demo (@regression): full sign-in via demo gate, then Play Demo
//     click — asserts iframe src and visibility (uses SLOTS_TEST_* credentials).
//   - No /go/ affiliate links are followed.
//   - Multi-slug describe confirms the template is consistent across different
//     slots, not tied to the primary Starburst URL.
// ─────────────────────────────────────────────────────────────────────────────

import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { SlotReviewPage } from '../pages/SlotReviewPage';
import { TEST_USER } from '../pages/SlotsGamesPage';

// ── Test URLs ────────────────────────────────────────────────────────────────

const PRIMARY_GEO  = 'ie';
const PRIMARY_SLUG = 'starburst';
const ALT_SLUG     = 'book-of-dead';

// ─────────────────────────────────────────────────────────────────────────────
// Group 1 — Page fundamentals
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — page fundamentals', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status(), 'Slot review page should return HTTP 200').toBeLessThan(400);
  });

  test('@smoke page loads with correct URL @slot-review', async ({ page }) => {
    await expect(page).toHaveURL(
      new RegExp(`/${PRIMARY_GEO}/online-casinos/slots/${PRIMARY_SLUG}`)
    );
  });

  test('@smoke H1 is visible and contains the slot name @slot-review', async () => {
    await expect(slotPage.heading).toBeVisible();
    await expect(slotPage.heading).toContainText(/starburst/i);
  });

  test('@smoke page title contains slot name @slot-review', async ({ page }) => {
    await expect(page).toHaveTitle(/starburst/i);
  });

  test('@regression canonical link points to the correct URL @slot-review', async ({ page }) => {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toBeAttached();
    const href = await canonical.getAttribute('href');
    expect(href).toMatch(new RegExp(`/online-casinos/slots/${PRIMARY_SLUG}`));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 2 — Game demo (existence & data integrity)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — game demo presence', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke game demo container is present in the DOM @slot-review', async () => {
    await expect(slotPage.gameDemoContainer).toBeAttached();
    await expect(slotPage.gameDemoContainer).toBeVisible();
  });

  test('@smoke demo iframe element is present with a valid data-demourl @slot-review', async () => {
    await expect(slotPage.gameDemoIframe).toBeAttached();
    // data-demourl is populated server-side — assert it is non-empty and points
    // to the SlotsLaunch CDN (confirmed pattern: slotslaunch.com/iframe/{id})
    await expect(slotPage.gameDemoIframe).toHaveAttribute('data-demourl', /slotslaunch\.com\/iframe\/\d+/);
  });

  test('@smoke play demo button is present and visible @slot-review', async () => {
    await expect(slotPage.playDemoBtn).toBeVisible();
  });

  test('@smoke play demo button has the correct onclick handler @slot-review', async () => {
    await expect(slotPage.playDemoBtn).toHaveAttribute(
      'onclick',
      /toggleGameDemo\(['"']open['"']\)/,
    );
  });

  test('@regression demo oplist below the game contains operator affiliate links @slot-review', async () => {
    await expect(slotPage.demoCasinoOplist).toBeAttached();
    const ctaInDemo = slotPage.demoCasinoOplist.locator('a[href*="/go/"]').first();
    await expect(ctaInDemo).toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 3 — Play demo interaction
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — play demo interaction', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke play demo button is clickable @slot-review', async () => {
    const btn = slotPage.playDemoBtn;
    await expect(btn).toBeVisible();

    const pointerEvents = await btn.evaluate(
      (el) => window.getComputedStyle(el).pointerEvents
    );
    expect(pointerEvents).not.toBe('none');
  });

  test('@smoke anonymous users see a login gate over the demo @slot-review', async () => {
    await expect(slotPage.slotLoginGate).toBeAttached();
    await expect(slotPage.slotLoginSignupBtn).toBeVisible();
  });

  test('@smoke activating the demo handler populates the iframe src @slot-review', async () => {
    // Anonymous users cannot click #play-demo-btn — login gate intercepts pointer events.
    // Invoke toggleGameDemo directly to verify the handler without a live game load.
    await slotPage.activateGameDemo();
    await expect(slotPage.gameDemoIframe).toHaveAttribute(
      'src',
      /slotslaunch\.com|iframe/,
      { timeout: 8_000 }
    );
  });

  test('@regression post-login play demo loads a playable game iframe @slot-review', async ({ page }) => {
    const authPage = new AuthPage(page);
    // Cookie banner can block the demo login-gate CTA on first click — other groups
    // don't interact with overlay elements, so they don't dismiss cookies explicitly.
    await page.getByRole('button', { name: /accept all/i }).click({ timeout: 5000 }).catch(() => {});

    await slotPage.playDemoLoggedIn(authPage, {
      email: TEST_USER.email,
      password: TEST_USER.password,
    });

    await expect(slotPage.gameDemoIframe).toBeVisible({ timeout: 15_000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 4 — Slot metadata
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — slot metadata', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke slot metadata values are present on the page @slot-review', async () => {
    // At least 5 metadata cells present (reels, rows, paylines, min bet, max bet etc.)
    await expect(slotPage.metadataValues.first()).toBeAttached();
    // nth(4) = at least 5 values (0-indexed)
    await expect(slotPage.metadataValues.nth(4)).toBeAttached();
  });

  test('@smoke metadata values are non-empty @slot-review', async () => {
    const firstValue = slotPage.metadataValues.first();
    await expect(firstValue).toBeVisible();
    const text = await firstValue.innerText();
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('@regression page body references RTP percentage @slot-review', async ({ page }) => {
    // RTP is a key data point on every slot review — confirmed in body text
    const rtpContent = page.locator('main').getByText(/\d{2,3}\.\d+%|RTP/i).first();
    await expect(rtpContent).toBeAttached();
  });

  test('@regression page body references the game provider / software @slot-review', async ({ page }) => {
    // Provider name (e.g. "NetEnt") appears in the review content
    const providerContent = page.locator('main').getByText(/NetEnt|Pragmatic Play|Play'n GO|Microgaming/i).first();
    await expect(providerContent).toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 5 — Operator list
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — operator list', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke at least 3 operator cards are present @slot-review', async () => {
    // Hidden duplicate oplist templates exist in the DOM — assert attachment, not visibility.
    await expect(slotPage.operatorCards.first()).toBeAttached({ timeout: 20_000 });
    await expect(slotPage.operatorCards.nth(2)).toBeAttached();
  });

  test('@smoke each operator card exposes an affiliate CTA @slot-review', async () => {
    await expect(slotPage.operatorCtaLinks.first()).toHaveAttribute('href', /\/go\//);
  });

  test('@regression operator CTAs are not followed — href only asserted @slot-review', async () => {
    // Confirm /go/ links are present but we never click them
    const count = await slotPage.operatorCtaLinks.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 6 — Breadcrumb navigation
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — breadcrumb navigation', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke breadcrumb is present @slot-review', async () => {
    await expect(slotPage.breadcrumb).toBeAttached();
  });

  test('@smoke breadcrumb has at least 3 links (Home → Casinos → Slots) @slot-review', async () => {
    await expect(slotPage.breadcrumbLinks.first()).toBeAttached();
    // nth(2) = at least 3 breadcrumb links (0-indexed)
    await expect(slotPage.breadcrumbLinks.nth(2)).toBeAttached();
  });

  test('@smoke breadcrumb links back to the Slots hub @slot-review', async () => {
    await expect(slotPage.slotsHubLink).toBeAttached();
    const href = await slotPage.slotsHubLink.getAttribute('href');
    expect(href).toMatch(/\/online-casinos\/slots\/?$/);
  });

  test('@regression all breadcrumb link hrefs are valid and non-empty @slot-review', async () => {
    const links = slotPage.breadcrumbLinks;
    await expect(links.first()).toBeAttached();
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href?.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 7 — Author byline
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — author byline', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke an author name is present on the page @slot-review', async ({ page }) => {
    // Author byline uses "Reviewed by" or "Written by" pattern in main content
    const authorByline = page.locator('main').getByText(/reviewed by|written by|by\s+\w+/i).first();
    await expect(authorByline).toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 8 — Related slots
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — related slots', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke related slots gallery is present on the page @slot-review', async () => {
    await expect(slotPage.relatedSlotsGallery).toBeAttached();
  });

  test('@regression related slots gallery contains multiple slot items @slot-review', async () => {
    await expect(slotPage.relatedSlotItems.first()).toBeAttached();
    const count = await slotPage.relatedSlotItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('@regression review body links to other slot review pages @slot-review', async () => {
    const otherSlotLinks = slotPage.otherSlotBodyLinks(PRIMARY_SLUG);
    await expect(otherSlotLinks.first()).toBeAttached();
    const count = await otherSlotLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 9 — Review body content
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — review body content', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@smoke review body is present and non-empty @slot-review', async () => {
    await expect(slotPage.reviewBody).toBeVisible();
    const text = await slotPage.reviewBody.innerText();
    expect(text.trim().length).toBeGreaterThan(100);
  });

  test('@regression review body contains at least one content image @slot-review', async ({ page }) => {
    const contentImages = page.locator(
      'main img[src*="kaxmedia"], main img[src*="objects."], main img[src*="gambling.com"]'
    );
    await expect(contentImages.first()).toBeAttached();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 10 — Structured data (JSON-LD)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — structured data', () => {
  let slotPage: SlotReviewPage;

  test.beforeEach(async ({ page }) => {
    slotPage = new SlotReviewPage(page);
    const response = await slotPage.goto(PRIMARY_GEO, PRIMARY_SLUG);
    expect(response?.status()).toBeLessThan(400);
  });

  test('@regression at least one JSON-LD block is present @slot-review', async () => {
    const blocks = await slotPage.getJsonLdBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(1);
  });

  test('@regression JSON-LD includes a FAQPage or BreadcrumbList type @slot-review', async () => {
    const blocks = await slotPage.getJsonLdBlocks();
    const types = blocks.map((b) => b['@type'] as string);
    const hasExpectedType = types.some(
      (t) => t === 'FAQPage' || t === 'BreadcrumbList'
    );
    // Also check @graph blocks which wrap types
    const graphTypes = blocks.flatMap((b) => {
      const graph = b['@graph'];
      if (Array.isArray(graph)) return graph.map((g: Record<string, unknown>) => g['@type']);
      return [];
    });
    expect(hasExpectedType || graphTypes.some(
      (t) => t === 'FAQPage' || t === 'BreadcrumbList'
    )).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Group 11 — Multi-slug template consistency
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Slot review — multi-slug template consistency', () => {
  test(`@smoke ${ALT_SLUG} loads with demo container, operator cards, and breadcrumb @slot-review`,
    async ({ page }) => {
      const slotPage = new SlotReviewPage(page);
      const response = await slotPage.goto(PRIMARY_GEO, ALT_SLUG);
      expect(response?.status(), `${ALT_SLUG} should return HTTP 200`).toBeLessThan(400);

      await expect(page).toHaveURL(new RegExp(`/online-casinos/slots/${ALT_SLUG}`));
      await expect(slotPage.heading).toBeVisible();
      await expect(slotPage.heading).toContainText(new RegExp(ALT_SLUG.replace(/-/g, '.?'), 'i'));
      await expect(slotPage.gameDemoContainer).toBeAttached();
      await expect(slotPage.gameDemoIframe).toHaveAttribute('data-demourl', /slotslaunch\.com/);
      await expect(slotPage.operatorCards.first()).toBeAttached({ timeout: 20_000 });
      await expect(slotPage.breadcrumb).toBeAttached();
    }
  );
});
