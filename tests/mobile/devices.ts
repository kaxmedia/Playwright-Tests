import { devices } from '@playwright/test';

/** Custom descriptor – Samsung Galaxy S25 (not in Playwright registry) */
export const galaxyS25 = {
  userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  viewport: { width: 360, height: 780 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  defaultBrowserType: 'chromium' as const,
};

/** iPhone 15 Pro – uses Playwright built-in registry */
export const iphone15Pro = devices['iPhone 15 Pro'];
