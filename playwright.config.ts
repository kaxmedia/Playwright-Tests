import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'https://www.gambling.com',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',  // was 'on-first-retry'
    navigationTimeout: 90000,
  },
  projects: [
    {
      name: 'chrome',
      testIgnore: ['**/visual/**'],
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
    {
      name: 'firefox',
      testIgnore: ['**/visual/**'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: ['**/visual/**'],
      use: { ...devices['Desktop Safari'] },
    },
    // ── Visual regression projects ────────────────────────────────────────────
    // Scoped to ./tests/visual so they never run the functional suite.
    {
      name: 'visual-chromium-desktop',
      testDir: './tests/visual',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
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
