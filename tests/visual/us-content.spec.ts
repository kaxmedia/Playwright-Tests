import { test, expect } from '../../fixtures/test';

const MASKS = [
  'div.cky-banner-bottom',
];

// Both sections used to CSS-pin the element's height to defeat a ±1px sub-pixel HEIGHT jitter in
// toHaveScreenshot's own natural-size check (confirmed live: chromium-desktop responsible-gambling
// flips between 207/208px, best-gambling-sites between 411/412px, etc). That helped but didn't
// fully fix it -- the ±1px turned out to be a rounding artifact of the capture step itself, not
// just the natural content height, so it still occasionally flips even with a fixed CSS height
// (confirmed again live, 2026-09-25: run #405 captured a freshly re-pinned 207px block as 207 in
// one attempt against a freshly-committed 208px baseline from the very same pin).
//
// Fixed properly here: capture via page.screenshot({ clip }) with an explicit, absolute pixel
// rectangle instead of asking toHaveScreenshot to compare the element's own reported bounding box.
// clip forces the output image to exactly the given width/height regardless of any layout
// rounding, so there's no "natural size" left to disagree about.
const SECTIONS = [
  // best-gambling-sites has real, discrete content (the operator table), so a genuine change (e.g.
  // an operator swap) should still be caught -- the tight 0.04 ratio still catches real content
  // changes (which shift height by far more than 1-2px). clipHeights are the same values used by
  // the old CSS pin (2px below each project's real natural height).
  {
    name: 'best-gambling-sites', heading: 'Best Gambling Sites in the US', maxDiffPixelRatio: 0.04,
    clipHeights: {
      'visual-chromium-desktop': 410,
      'visual-webkit-desktop': 410,
      'visual-chromium-android': 482,
      'visual-webkit-ios': 479,
    } as Record<string, number>,
  },
  // responsible-gambling is a block of static legal prose with no dynamic content.
  {
    name: 'responsible-gambling', heading: 'Responsible Gambling', maxDiffPixelRatio: 0.10,
    clipHeights: {
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
    const box = await cb.boundingBox();
    if (!box) throw new Error(`No bounding box for ${section.name} on ${testInfo.project.name}`);
    const clipHeight = section.clipHeights[testInfo.project.name];
    if (!clipHeight) throw new Error(`No clipHeight configured for ${section.name} on ${testInfo.project.name}`);
    // toMatchSnapshot auto-appends the project/platform to the snapshot filename by default, the
    // same as toHaveScreenshot does -- confirmed live, 2026-09-25, after an earlier pass here
    // wrongly assumed otherwise and appended it explicitly, producing a doubled suffix in the
    // actual committed filename. Reverted to the plain name.
    const buffer = await page.screenshot({
      clip: { x: box.x, y: box.y, width: box.width, height: clipHeight },
      mask: MASKS.map(s => page.locator(s)),
    });
    expect(buffer).toMatchSnapshot(`us-${section.name}.png`, {
      threshold: 0,
      maxDiffPixelRatio: section.maxDiffPixelRatio,
    });
  });
}
