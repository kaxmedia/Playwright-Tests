# Playwright test codebase — audit (Option C)

Short, static review of the **gambling-tests** Playwright repo: layout, risks, duplication patterns, and sensible next steps. This is not a substitute for CI runs or a full manual pass of every spec against production.

---

## Methodology

- Inventory of `tests/`, `pages/`, `fixtures/`, and `playwright.config.ts`.
- Pattern scan (e.g. `waitForTimeout`, `beforeEach`, sign-in usage, hard-coded hosts).
- Consistency with common Playwright practice (POM, `baseURL`, timeouts).
- No automated duplicate-detection tool was run for this document; recommend adding one later (see “Next phases”).
- **ESLint** is now configured — see [Linting](#linting) below.

---

## Linting

- **Run**: `npm run lint` (and `npm run lint:fix` for safe auto-fixes).
- **Config**: `eslint.config.mjs` — flat config with `@eslint/js`, `typescript-eslint` recommended rules, and **`eslint-plugin-playwright`** scoped to `tests/**/*.ts`.
- **Pragmatic defaults**: `playwright/prefer-web-first-assertions` is **off** for now (large migration); several other Playwright rules are **warnings** so `eslint` exits 0 while surfacing debt. Tighten rules in follow-up PRs.
- **Small cleanups** applied so lint passes with **zero errors**: removed unused variables / dead `const` in a few specs and `UKCasinoPage.ts`.

---

## Inventory (approximate)

| Area | Count / notes |
|------|------------------|
| Spec files (`tests/*.spec.ts`) | 14 |
| Page objects (`pages/*.ts`) | 13 |
| Fixtures | `fixtures/cookieBanner.ts` |
| Feature-specific test docs | `docs/testing-profile.md` (profile / prod quirks) |
| Total lines (specs + pages only) | ~6.7k (rough `wc` aggregate) |

Largest surface areas by line volume tend to be **auth**, **profile**, **casino category landing**, **comparison**, **footer**, and **slots** specs/POMs — sensible targets for phased refactors.

---

## Configuration (`playwright.config.ts`)

- **`baseURL`**: `https://www.gambling.com` — good; prefer relative URLs in tests where possible.
- **`fullyParallel: false`**, **`workers: 1`**: Stable for flaky prod E2E and shared session assumptions; **slower in CI**. Document why if this stays long-term.
- **`timeout: 60000`**, **`navigationTimeout: 90000`**: Reasonable for heavy pages.
- **`retries: 2` in CI**: Good default.
- **Projects**: `chrome`, `firefox`, `webkit` — confirm CI actually runs all three or trim to what you maintain.

---

## Strengths

- **Page Object Model** is used consistently; specs mostly orchestrate, pages hold locators and navigation helpers.
- **Profile** work includes a focused **`docs/testing-profile.md`** for prod DOM and follow-ups — good precedent for other complex areas.
- **Mixed coverage**: smoke-style checks plus deeper regressions in places (e.g. profile persistence).

---

## Findings

### Medium priority

1. **`waitForTimeout` usage** appears across multiple specs and some page objects (`auth`, `profile`, `slots-games-widget`, `casino-category-landing`, casino pages, `age-verification`, etc.). These are easy sources of **flake** (too short) or **slowness** (too long). Prefer `expect.poll`, `waitForLoadState`, `waitForResponse` (when a stable API exists), or explicit UI readiness. ESLint surfaces many as **warnings** (`playwright/no-wait-for-timeout`).
2. **Auth flows**: `tests/profile.spec.ts` defines **`signInAsTestUser`** locally; `tests/auth.spec.ts` owns broader sign-in coverage. Risk of **divergence** if sign-in UX or env vars change; a small shared **`fixtures/auth.ts`** (or similar) could hold one “happy path prod sign-in” used by profile and any other logged-in suites.
3. **Hard-coded `gambling.com` URLs** in some POMs (e.g. profile absolute tab URLs) vs **relative** navigation elsewhere — intentional for profile is fine; elsewhere, centralize if the same paths repeat in many files (notably large URL lists in comparison-related code).

### Lower priority

4. **Placeholder / low-use locators**: e.g. profile POM documents some locators reserved for future tests — fine if called out; prune if they stay unused for a long time.
5. **`test.beforeEach` duplication** across files is normal; only refactor when the same 5+ lines repeat in multiple specs with identical behavior.

---

## Duplication and consistency (high level)

- **Not observed**: wholesale duplicated spec files or twin POMs for the same page.
- **Observed**: repeated **patterns** (sleeps, sign-in, “load page → dismiss cookie/modal”) — address with **fixtures and helpers** rather than merging unrelated specs.
- **Naming**: mix of `*Page.ts` and domain names — consistent enough; optional style guide: `FooPage` + `foo.spec.ts` pairs.

---

## Recommended next phases

Aligned with earlier discussion:

| Phase | Description |
|-------|-------------|
| **A — Automation** | ESLint + `eslint-plugin-playwright` are in place; add **`tsc --noEmit`** in CI and optional **jscpd** (or similar) on `tests/` + `pages/` with a threshold. Optionally **`npm run lint -- --max-warnings 0`** once warnings are cleared. |
| **B — Targeted refactor** | Replace highest-churn `waitForTimeout` clusters; extract shared auth fixture; consider raising `workers` only for isolated projects once tests are hermetic. |
| **Deeper review** | Rotate **one feature area per PR** (auth, profile, comparison, …) with trace-on-failure for hard cases. |

---

## Related documents

- [Profile / prod testing notes](./testing-profile.md)

---

## Changelog

| Date | Notes |
|------|--------|
| Initial | Option C baseline audit created on `optimize` branch. |
| Follow-up | ESLint + `eslint-plugin-playwright` added; audit updated; small unused-var cleanups for a clean `npm run lint`. |
