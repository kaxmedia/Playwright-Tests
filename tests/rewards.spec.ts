import { test, expect } from '../fixtures/test';

// ─── Rewards landing page (/rewards) — basic smoke only ───────────────────────
//
// Logged out, /rewards is the Rewards marketing page. Live-verified 2026-10-23 (two loads,
// identical, no errors): "Earn chips. Win real stuff." hero and a Merch Packs row of 5 cards,
// each showing a chip price, a level and an item list ("250 chips · Level 1. Cosmo Cadet Pack ·
// Item List : …").
//
// Deliberately NOT covered: redeeming, purchasing, the spin wheel, or any navigation flow —
// that part of Rewards is still being rebuilt and those flows aren't verified yet. Card counts
// and pack names aren't pinned either, so content edits don't break this.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Rewards — landing page smoke', () => {
    test.beforeEach(async ({ page }) => {
        const res = await page.goto('/rewards', { waitUntil: 'domcontentloaded' });
        expect(res?.status(), '/rewards did not load').toBe(200);
    });

    test('@smoke @regression page loads with the Rewards title and hero heading', async ({ page }) => {
        // 15s, not the 5s default: under heavy parallel load Firefox/WebKit briefly reported an
        // empty title on this large page (a sequential re-run passed 12/12).
        await expect(page).toHaveTitle(/gambling\.com rewards/i, { timeout: 15000 });
        await expect(page.locator('h1').first()).toBeVisible();
    });

    test('@smoke @regression merch pack cards each show a chip price, a level and an item list', async ({ page }) => {
        const cards = page.locator('article.iuj-merch-card');
        await expect(cards.first()).toBeVisible({ timeout: 15000 });

        const count = await cards.count();
        expect(count, 'no merch pack cards').toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            await expect(card, `card ${i + 1}: chip price`).toContainText(/\d[\d,]*\s*chips/i);
            await expect(card, `card ${i + 1}: level`).toContainText(/level\s*\d+/i);
            await expect(card, `card ${i + 1}: item list`).toContainText(/item list/i);
        }
    });
});
