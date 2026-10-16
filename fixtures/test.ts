import { test as base, expect } from 'playwright/test';
import { registerEditorPopupHandler } from './editorPopup';
import { registerRegionPromptHandler } from './regionPrompt';
import { registerStreakBonusPopupHandler } from './streakBonusPopup';

export const test = base.extend<{}, { _acceptRegionPrompt: void; _dismissStreakBonusPopup: void; _dismissEditorPopup: void }>({
    _acceptRegionPrompt: [
          async ({ page }, use) => {
                  await registerRegionPromptHandler(page);
                  await use();
          },
      { auto: true },
        ],
    _dismissStreakBonusPopup: [
          async ({ page }, use) => {
                  await registerStreakBonusPopupHandler(page);
                  await use();
          },
      { auto: true },
        ],
    _dismissEditorPopup: [
          async ({ page }, use) => {
                  await registerEditorPopupHandler(page);
                  await use();
          },
      { auto: true },
        ],
});

export { expect };
export type { Locator, Page, Request } from 'playwright/test';
