import { devices } from '@playwright/test';

/** Custom descriptor — Pixel 9 is not in Playwright's built-in device registry yet. */
export const pixel9 = {
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  viewport: { width: 412, height: 916 },
  deviceScaleFactor: 2.625,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium' as const,
};

export const iphone15Pro = devices['iPhone 15 Pro'];
