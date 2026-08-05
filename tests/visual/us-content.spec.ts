import { test, expect } from '../../fixtures/test';

const MASKS = [
  'div.cky-banner-bottom',
];

const SECTIONS = [
  // best-gambling-sites has real, discrete content (the operator table) — keep the tight default
  // so a genuine change (e.g. an operator swap) is still caught.
  { name: 'best-gambling-sites',   heading: 'Best Gambling Sites in the US', maxDiffPixelRatio: 0.04 },
  // responsible-gambling is a block of static legal prose with no dynamic content. Its failures are
  // a ±1px sub-pixel HEIGHT jitter between otherwise-identical renders (e.g. chromium-desktop 209↔208,
  // webkit-ios 362↔363) — a DIMENSION mismatch that hard-fails before pixels are ever compared, so no
  // maxDiffPixelRatio can absorb it. Pin the block to a fixed per-project height (~2px below the
  // natural height, cropping the jittery bottom edge) so the captured size is deterministic; the
  // 0.10 ratio then covers the genuine residual text-antialiasing noise on this text-dense block.
  {
    name: 'responsible-gambling', heading: 'Responsible Gambling', maxDiffPixelRatio: 0.10,
    pinHeights: {
      'visual-chromium-desktop': 207,
      'visual-webkit-desktop': 207,
      'visual-chromium-android': 360,
      'visual-webkit-ios': 360,
    } as Record<string, number>,
  },
];

for (const section of SECTIONS) {
  test(`@visual gambling.com /us ${section.name} renders deterministically`, async ({ page }, testInfo) => {
    await page.goto('/us/', { waitUntil: 'load' });
    await page.addStyleTag({
      content: '*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; }',
    });
    const cb = page.locator(
      `div.content-block-with-header-component:has(h2:has-text("${section.heading}"))`
    );
    await cb.scrollIntoViewIfNeeded();
    await cb.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
    // Pin the block height (responsible-gambling only) to defeat the ±1px sub-pixel jitter — see note above.
    const pin = section.pinHeights?.[testInfo.project.name];
    if (pin) {
      await cb.evaluate((el, h) => {
        (el as HTMLElement).style.height = `${h}px`;
        (el as HTMLElement).style.maxHeight = `${h}px`;
        (el as HTMLElement).style.overflow = 'hidden';
      }, pin);
    }
    await expect(cb).toHaveScreenshot(`us-${section.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: section.maxDiffPixelRatio,
      timeout: 30000,
      mask: MASKS.map(s => page.locator(s)),
    });
  });
}
