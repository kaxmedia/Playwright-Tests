import { test as base, expect } from 'playwright/test';
import { registerRegionPromptHandler } from './regionPrompt';

export const test = base.extend<{}, { _acceptRegionPrompt: void }>({
  _acceptRegionPrompt: [
    async ({ page }, use) => {
      await registerRegionPromptHandler(page);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
export type { Locator, Page, Request } from 'playwright/test';
