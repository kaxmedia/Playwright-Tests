import type { Page } from '@playwright/test';
import { AGE_VERIFICATION_GEOS, type GeoKey } from '../pages/AgeVerificationPage';

/**
 * Deterministically dismiss the geo age-verification gate (the `#age-validation` micromodal —
 * "Hoe oud bent u?" / "¿Eres mayor de edad?") on age-gated geos, BEFORE the caller captures.
 *
 * No-op — and no wasted wait — on geos without a gate (returns immediately when `geo` isn't in
 * AGE_VERIFICATION_GEOS). On gated geos (nl 24+, es 18+) it WAITS for the modal (it's a hard gate,
 * so it reliably appears), clicks ACCEPT, and waits for it to disappear before returning — so the
 * caller's screenshot can't race a still-visible or half-dismissed gate.
 *
 * Why explicit instead of addLocatorHandler: the opportunistic handler dismissed the gate reliably
 * on chromium but flakily on webkit-ios (left the modal in some captures). A hard gate must be
 * cleared deterministically, and the click needs a webkit fallback (normal → force → DOM .click()),
 * mirroring the streak-modal webkit fix.
 *
 * Deliberately opt-in per spec, NOT wired into the global fixtures/test auto-fixture: the dedicated
 * age-verification spec needs the gate to stay visible to assert on it.
 */
export async function dismissAgeGateForGeo(page: Page, geo: string): Promise<void> {
  if (!(geo in AGE_VERIFICATION_GEOS)) {
    return; // non-gated geo — nothing to dismiss, no wait incurred
  }
  const cfg = AGE_VERIFICATION_GEOS[geo as GeoKey];

  const modal = page.locator('#age-validation');
  // Hard gate — it reliably appears on a gated geo. If it somehow doesn't within the window,
  // fall through silently (nothing to dismiss) rather than fail the capture.
  const appeared = await modal
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!appeared) {
    return;
  }

  const acceptBtn = modal.getByRole('button', { name: cfg.acceptBtnText });

  // Webkit-hardened click: normal → force → raw DOM click. Webkit intermittently ignored the
  // normal click on this modal, leaving the gate up (same class of issue as the streak modal).
  try {
    await acceptBtn.click({ timeout: 3_000 });
  } catch {
    try {
      await acceptBtn.click({ timeout: 3_000, force: true });
    } catch {
      await acceptBtn.evaluate((el: HTMLElement) => el.click()).catch(() => {});
    }
  }

  // Block until the gate is actually gone, so the caller never captures a lingering/animating modal.
  await modal.waitFor({ state: 'hidden', timeout: 10_000 });
}
