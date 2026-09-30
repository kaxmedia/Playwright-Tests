import type { Page } from '@playwright/test';

const registeredPages = new WeakSet<Page>();

/** Resolve to true once the modal is gone; never throws. */
async function waitGone(modal: ReturnType<Page['locator']>, timeout: number): Promise<boolean> {
  return modal.waitFor({ state: 'hidden', timeout }).then(() => true).catch(() => false);
}

/**
 * Accept the micromodal age gate (`#age-validation`) used on /nl and /es.
 * Mirrors the defensive dismiss pattern in `regionPrompt.ts`: try the confirm
 * button, then Escape / DOM click — never hang the suite on a sticky overlay.
 *
 * Accept copy is localised (NL “Ik ben 24…”, ES “Sí, tengo más de 18…”).
 */
async function dismissAgeVerificationModal(modal: ReturnType<Page['locator']>): Promise<void> {
  const page = modal.page();

  const accept = modal
    .getByRole('button', {
      name: /ik ben 24 jaar of ouder|sí, tengo más de 18 años/i,
    })
    .or(
      page.getByRole('button', {
        name: /ik ben 24 jaar of ouder|sí, tengo más de 18 años/i,
      }),
    )
    .first();

  if (await accept.isVisible().catch(() => false)) {
    await accept.click({ timeout: 3_000 }).catch(() => {});
    if (await waitGone(modal, 2_000)) return;
  }

  await page.keyboard.press('Escape').catch(() => {});
  if (await waitGone(modal, 1_500)) return;

  await modal
    .evaluate((root) => {
      const btn = [...root.querySelectorAll('button')].find((b) =>
        /ik ben 24|tengo más de 18|sí,/i.test(b.textContent || ''),
      );
      btn?.click();
    })
    .catch(() => {});
  await waitGone(modal, 1_500);
}

/**
 * Auto-accept the NL/ES age gate whenever it blocks an action.
 *
 * The modal appears on a variable delay after load, so a one-shot
 * `isVisible()` check after `goto()` races it. `addLocatorHandler` runs before
 * every Playwright action (same approach as `registerRegionPromptHandler`).
 *
 * Do NOT register this globally — `tests/age-verification.spec.ts` needs the
 * gate present to assert accept/reject behaviour.
 */
export async function registerAgeVerificationHandler(page: Page): Promise<void> {
  if (registeredPages.has(page)) return;
  registeredPages.add(page);

  const modal = page.locator('#age-validation');
  await page.addLocatorHandler(
    modal,
    async () => {
      await dismissAgeVerificationModal(modal);
    },
    { noWaitAfter: true },
  );
}
