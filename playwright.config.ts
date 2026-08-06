import { defineConfig, devices } from '@playwright/test';
import { iphone15Pro, galaxyS25 } from './tests/mobile/devices';

// Specs that sign into the single shared E2E account (testpot209). They MUST NOT run split across
// the parallel CI shard containers: each container signs in independently and the file-based auth
// lock (os.tmpdir) can't coordinate across containers, so concurrent sign-ins invalidate each
// other's Supabase session ("session was lost — marketing gate shown"). CI runs them instead in a
// single unsharded job (see .github/workflows/run-spec.yml): the sharded matrix sets
// SKIP_SHARED_AUTH_SPECS=1 to exclude them here, and the dedicated job runs them with workers=1.
const SHARED_AUTH_SPECS = [
  '**/profile.spec.ts',
  '**/tournaments.spec.ts',
  '**/auth.spec.ts',
  '**/ktag/ktag-udc.spec.ts',
];
const extraIgnore = process.env.SKIP_SHARED_AUTH_SPECS ? SHARED_AUTH_SPECS : [];

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
      testIgnore: ['**/visual/**', '**/mobile/**', ...extraIgnore],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: ['**/visual/**', '**/mobile/**', '**/ktag/**', ...extraIgnore],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: ['**/visual/**', '**/mobile/**', '**/ktag/**', ...extraIgnore],
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
