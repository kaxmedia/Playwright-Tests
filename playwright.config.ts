import { defineConfig, devices } from '@playwright/test';
import { iphone15Pro, galaxyS25 } from './tests/mobile/devices';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 3 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://www.gambling.com',
    screenshot: 'only-on-failure',
    video: 'off',
    trace: 'on-first-retry',
    navigationTimeout: 90000,
  },
  projects: [
    {
      name: 'chrome',
      testIgnore: ['**/visual/**', '**/mobile/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: ['**/visual/**', '**/mobile/**', '**/ktag/**'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: ['**/visual/**', '**/mobile/**', '**/ktag/**'],
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile functional suite — device emulation per project (WebKit vs Chromium)
    {
      name: 'mobile-iphone',
      testMatch: '**/mobile/**/*.spec.ts',
      timeout: 90000,
      use: {
        ...iphone15Pro,
        screenshot: 'only-on-failure',
        video: 'off',
        trace: 'on-first-retry',
      },
    },
    {
      name: 'mobile-samsung',
      testMatch: '**/mobile/**/*.spec.ts',
      timeout: 90000,
      use: {
        ...galaxyS25,
        screenshot: 'only-on-failure',
        video: 'off',
        trace: 'on-first-retry',
      },
    },
    // ── Visual regression projects ────────────────────────────────────────────
    // Scoped to ./tests/visual so they never run the functional suite.
    {
      name: 'visual-chromium-desktop',
      testDir: './tests/visual',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual-webkit-desktop',
      testDir: './tests/visual',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'visual-chromium-android',
      testDir: './tests/visual',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'visual-webkit-ios',
      testDir: './tests/visual',
      use: { ...devices['iPhone 15'] },
    },
  ],
});
