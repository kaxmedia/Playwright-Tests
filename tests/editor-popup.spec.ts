import { test, expect } from '../fixtures/test';

test('a page with no editor popup continues as normal', async ({ page }) => {
  await page.setContent('<button id="go">Go</button>');
  await page.locator('#go').click();
  await expect(page.locator('div.__ADORIC__')).toHaveCount(0);
});

test('an empty Adoric placeholder plus a real popup does not stop the test', async ({ page }) => {
  await page.setContent(`
    <button id="go">Go</button>
    <div class="__ADORIC__1 __ADORIC__"></div>
    <div class="__ADORIC__1 __ADORIC__" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4)">
      310% Willkommenspaket bis zu
      <button class="closeLightboxButton" onclick="this.parentElement.remove()">Close</button>
    </div>
  `);
  await page.locator('#go').click();
  await expect(page.locator('div.__ADORIC__').filter({ hasText: 'Willkommenspaket' })).toHaveCount(0);
});

test('an editor popup is closed so the test can continue', async ({ page }) => {
  await page.setContent(`
    <button id="go">Go</button>
    <div class="__ADORIC__" style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.4)">
      <button class="closeLightboxButton" onclick="this.parentElement.remove()">Close</button>
    </div>
  `);
  await page.locator('#go').click();
  await expect(page.locator('div.__ADORIC__')).toBeHidden();
});
