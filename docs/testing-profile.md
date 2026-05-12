# Profile area — Playwright E2E notes

End-to-end coverage for logged-in profile tabs lives in `tests/profile.spec.ts`, with locators in `pages/ProfilePage.ts`. Tests run against **production** (`gambling.com`) using the shared test account (password via `E2E_TEST_PASSWORD` or repo default).

## Running

```bash
npx playwright test tests/profile.spec.ts --project=chrome
```

## Locator strategy (today)

- **Profile shell**: `main` that contains the profile sidebar link “Profile Details”, so cookie banners and other `main`-like regions are not targeted by mistake.
- **Marketing**: Rows are resolved by visible copy and per-row checkboxes (not global `nth()`), because Betting/Casino rows nest copy differently.
- **Additional Details — frequency radios**: Scoped by the visible question lines **“How often do you place bets?”** and **“How often do you use casinos?”**, then the **closest ancestor that contains `input[type="radio"]`** (not only the paragraph’s immediate parent). Handles Vue layouts where the question and radios are siblings under a shared wrapper.
- **Profile read-only fields**: Label → first following `p` / `div` / `span` sibling (not arbitrary wildcard siblings).

## Waits and flakiness

- **Sign-in**: Uses `Promise.race` between avatar visible and modal error text — no fixed sleep before checking credentials.
- **Password change**: Success is asserted via **polling** for toast or inline success — not a fixed delay only.
- **Marketing persistence**: Regressions still use **bounded sleeps** after toggles because there is no stable, documented client hook or response pattern in the test suite for “preference saved to server.” Reducing flake further likely needs one of the follow-ups below. Marketing row containers are narrowed by copy (`general news|betting offers|casino offers`) before taking the first checkbox wrapper so unrelated checkbox wrappers are less likely to win `.first()`.

---

## Follow-ups for product / frontend (testability)

These would shrink XPath/sibling hacks, improve accessibility, and allow network- or state-based waits instead of sleeps.

1. **`data-testid` on profile read view**  
   Stable selectors for “First Name”, “Nickname”, “Email”, “Phone” values (e.g. `data-testid="profile-display-first-name"`).

2. **Semantic grouping for Additional Details frequency sections**  
   Prefer `<fieldset>` + `<legend>` (or `role="radiogroup"` + accessible name) for betting vs casino frequency blocks so radiogroups are unambiguous without relying on paragraph text.

3. **Marketing preference save contract**  
   Either a visible non-blocking “Saved” state, `aria-live` confirmation, or a stable API URL/method the tests can `waitForResponse` on after toggle — so persistence tests do not rely on long fixed delays.

4. **Referral invalid-email message**  
   Already assertable via inline copy next to the field; keeping that message stable (or adding a `data-testid` on the error element) helps if layout changes.

---

## Related files

| File | Role |
|------|------|
| `tests/profile.spec.ts` | Scenarios (smoke, regression, negatives) |
| `pages/ProfilePage.ts` | URLs, locators, `ProfilePage` helpers |
| `pages/AuthPage.ts` | Sign-in / modal dismissal used in `beforeEach` |
