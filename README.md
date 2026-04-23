# gambling-tests

Automated end-to-end tests for [gambling.com](https://www.gambling.com), built with [Playwright](https://playwright.dev) and TypeScript. This project is maintained by the QA team at GDC Media Limited and is designed to be approachable for manual testers who are new to automation.

The tests run in a real Chrome browser, check that key parts of the site are visible and working, and can be run by anyone on the team with a few simple commands.

---

## Prerequisites

Make sure you have the following installed before you begin:

| Tool | Version | How to check |
|---|---|---|
| [Node.js](https://nodejs.org) | v18 or higher | Run `node --version` in your terminal |
| [Git](https://git-scm.com) | Any recent version | Run `git --version` in your terminal |
| Google Chrome | Any recent version | Must be installed on your machine |

> **Note:** Playwright uses your real Chrome installation to run tests (see [Known Issues](#known-issues--environment-notes) for why). Make sure Chrome is installed before running anything.

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/kaxmedia/Regression.git
cd Regression
```

### 2. Install dependencies

This downloads Playwright and everything else the project needs:

```bash
npm install
```

### 3. Install Playwright browsers

This downloads the browser engines Playwright uses for testing (Firefox, WebKit/Safari). Chrome is already on your machine so it does not need to be downloaded.

```bash
npx playwright install
```

You are now ready to run tests.

---

## How to Run Tests

All test commands are run from inside the project folder in your terminal.

| Command | What it does |
|---|---|
| `npm test` | Runs all tests silently in Chrome — no browser window opens. Use this for a quick pass/fail check. |
| `npm run test:headed` | Runs all tests with the Chrome window visible. Great for watching what Playwright is doing or debugging a failing test. |
| `npm run test:report` | Opens the last test run's HTML report in your browser. Shows a full breakdown of passed, failed, and skipped tests with screenshots. |

### Running a single test file

```bash
npx playwright test tests/homepage.spec.ts --project=chrome
```

### Running tests in a specific browser

```bash
npx playwright test --project=chrome    # Real Chrome (recommended)
npx playwright test --project=firefox   # Firefox
npx playwright test --project=webkit    # Safari
```

---

## Project Structure

```
gambling-tests/
│
├── pages/                        ← Page Object classes (one file per page)
│   └── HomePage.ts               ← Locators and actions for the homepage
│
├── tests/                        ← Test files (one file per page or feature)
│   └── homepage.spec.ts          ← Homepage smoke tests
│
├── playwright.config.ts          ← Playwright settings: browsers, timeout, reporter
├── tsconfig.json                 ← TypeScript settings
├── package.json                  ← Project info and npm script shortcuts
├── package-lock.json             ← Exact dependency versions (do not edit manually)
└── .gitignore                    ← Files excluded from Git (node_modules, reports, etc.)
```

### The `pages/` folder — Page Object Model

Each file in `pages/` represents one page of the website. It holds:
- The **URL** for that page
- All the **locators** (how to find buttons, headings, images, etc.)
- Any **actions** the user can perform on that page (e.g. clicking a button, filling a form)

The test files in `tests/` use these page objects instead of writing raw selectors directly. This means if the website changes, you only need to update the page object — not every single test.

---

## How to Add a New Test

Follow these steps to add a test for a new page. We'll use a fictional "Casino Reviews" page as the example.

### Step 1 — Create a page object in `pages/`

Create a new file: `pages/CasinoReviewsPage.ts`

```typescript
import { type Page, type Locator } from '@playwright/test';

export class CasinoReviewsPage {

  readonly page: Page;
  readonly pageHeading: Locator;
  readonly firstReviewCard: Locator;
  readonly url = 'https://www.gambling.com/reviews/casino';

  constructor(page: Page) {
    this.page = page;
    this.pageHeading    = page.getByRole('heading', { level: 1 });
    this.firstReviewCard = page.locator('.review-card').first();
  }

  async goto() {
    await this.page.goto(this.url);
  }

}
```

### Step 2 — Create a test file in `tests/`

Create a new file: `tests/casino-reviews.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { CasinoReviewsPage } from '../pages/CasinoReviewsPage';

test.describe('Casino Reviews page', () => {

  test('page has a visible heading', async ({ page }) => {
    const casinoPage = new CasinoReviewsPage(page);
    await casinoPage.goto();
    await expect(casinoPage.pageHeading).toBeVisible();
  });

  test('at least one review card is visible', async ({ page }) => {
    const casinoPage = new CasinoReviewsPage(page);
    await casinoPage.goto();
    await expect(casinoPage.firstReviewCard).toBeVisible();
  });

});
```

### Step 3 — Run your new test to check it works

```bash
npx playwright test tests/casino-reviews.spec.ts --project=chrome --headed
```

### Step 4 — Commit your work

```bash
git add pages/CasinoReviewsPage.ts tests/casino-reviews.spec.ts
git commit -m "Add smoke tests for casino reviews page"
git push
```

---

## Known Issues / Environment Notes

### Corporate network — real Chrome required

On GDC Media Limited's corporate network, Playwright's built-in Chromium browser cannot reach `gambling.com` reliably (connection timeouts occur). The project is configured to use your locally installed **real Chrome** instead, which routes through the correct network settings automatically.

This is set in `playwright.config.ts`:

```typescript
{
  name: 'chrome',
  use: { ...devices['Desktop Chrome'], channel: 'chrome' },
}
```

If you see timeout errors when running tests, first check that:
1. You can open `https://www.gambling.com` in your regular Chrome browser
2. You have Chrome installed (not just Chromium or another browser)

### Test timeout

The default timeout is set to **60 seconds** per test (double Playwright's default of 30s). This accounts for the additional latency from the corporate network proxy. This is configured in `playwright.config.ts`.

---

## Contributing

Please follow these simple rules when adding or changing tests:

- **One test file per page or feature.** Homepage tests go in `homepage.spec.ts`, search tests go in `search.spec.ts`, and so on.
- **Always use the Page Object Model.** Never put raw CSS selectors or URLs directly inside a test file. Add them to the relevant file in `pages/` first.
- **Write clear commit messages.** Say what the test covers, not just "add test". For example:
  - `Add smoke tests for casino reviews page`
  - `Fix logo locator after homepage redesign`
  - `Add search results test for keyword 'blackjack'`
- **Run the tests before pushing.** A quick `npm test` before `git push` makes sure you haven't accidentally broken an existing test.
- **Ask if unsure.** If you're not sure how to locate an element or structure a test, ask a teammate or check the [Playwright docs](https://playwright.dev/docs/intro).
