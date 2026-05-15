# Visual Regression Tests

## Purpose

Snapshot-based visual regression using Playwright's `toHaveScreenshot`. Each test captures a full-page PNG and diffs it pixel-for-pixel against a committed baseline. Failures surface unintended layout shifts, CSS regressions, and rendering changes before they reach production.

## How to Run Locally

Baselines must be captured and compared inside the same Docker image used by CI. Running on a host OS (Windows, macOS) produces different rendering and will not match Linux CI baselines.

**Capture baselines:**
```bash
# bash / macOS / Linux
docker run --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.59.1-noble \
  npx playwright test --project=visual-chromium-desktop --update-snapshots

# PowerShell (Windows)
docker run --rm -v ${PWD}:/work -w /work mcr.microsoft.com/playwright:v1.59.1-noble `
  npx playwright test --project=visual-chromium-desktop --update-snapshots

# cmd (Windows)
docker run --rm -v %cd%:/work -w /work mcr.microsoft.com/playwright:v1.59.1-noble ^
  npx playwright test --project=visual-chromium-desktop --update-snapshots
```

**Run comparison (no update):**
```bash
# bash / macOS / Linux
docker run --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.59.1-noble \
  npx playwright test --project=visual-chromium-desktop --project=visual-webkit-desktop \
    --project=visual-chromium-android --project=visual-webkit-ios

# PowerShell (Windows) — replace \ with ` for line continuation
# cmd (Windows) — replace \ with ^ for line continuation
```

## Cross-OS Note

Playwright's screenshot renderer produces different pixel output on Windows, macOS, and Linux due to font hinting, antialiasing, and GPU compositing differences. Baselines committed to this repo must be generated on Linux (`mcr.microsoft.com/playwright:v1.59.1-noble`) to match what GitHub Actions produces. Never commit baselines captured on a host OS.

## Sprint 1 Scope (PR-26 — Foundation)

This PR establishes the infrastructure only:

- 4 visual projects added to `playwright.config.ts` (desktop + mobile, Chromium + WebKit)
- CI workflow at `.github/workflows/visual-regression.yml`
- `tests/visual/_smoke.spec.ts` — a single trivial smoke test (root homepage) to validate the pipeline end-to-end

**PR-B (Sprint 1 continuation):** first real coverage — root, UK, US, DE on Chromium desktop (4 tests, Linux baselines committed).

**Sprints 2–4:** broader expansion per the Confluence plan — 22 geos, WebKit desktop, mobile viewports (Pixel 7, iPhone 15), and top 10 high-traffic URLs.

## Reference

Internal plan and baseline strategy documented in Confluence: `09_visual_regression_plan`
