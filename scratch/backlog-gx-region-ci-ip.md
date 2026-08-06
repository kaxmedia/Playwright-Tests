# Backlog: CI runs from an unmapped-region ("GX") datacenter IP — geo-gated content differs from real users

**Owner:** Site / Infra team
**Type:** Infrastructure (not a test/code change)
**Priority:** Medium — recurring source of false positives and test friction

## Summary

Playwright CI runs originate from a datacenter IP that geo-resolves to an
unmapped region (surfaced internally as "GX"). Because large parts of the
site are geo-gated, the page state CI sees does not match what a real user in
a mapped region sees. This has repeatedly produced false-positive test
failures and forced test-side workarounds rather than being fixed at the
source.

## Recurring symptom

Across multiple independent investigations this session, geo-gated content and
behaviour differed from a real user's experience solely because of the CI
origin IP:

- **Profile pages (authenticated)** — personalized content that only renders for
  mapped regions is absent: the Rewards tab stays in its loading skeleton
  (chip-count / challenges / spin-the-wheel), the marketing interest toggles
  don't flip, and — added 2026-08-06 — the profile tab-navigation test
  (`profile.spec.ts:97`, "each tab navigates to its correct URL") times out
  because the "Profile details" link never becomes visible while the page sits in
  its GX loading skeleton. All require CI-skip guards; the links/content exist and
  pass from a real/local IP (live-verified 2026-08-06, chrome).
- **Sub Category pages** — operator counts differed from the real-user view,
  requiring an operator-count guard.
- **Tournaments** — a geo/region prompt ("region popup") appeared for the CI
  IP that a mapped-region user would not hit the same way, contributing to the
  dismiss-flow bug fixed in PR #150.
- **Betting Sites → US Sportsbooks (Firefox only)** — operator list absent for
  Firefox in CI; see the distinct "Firefox-fingerprint variant" section below.

In each case the failure looked like a content/behaviour bug but traced back
to the same origin.

## Confirmed root cause

CI executes from a datacenter IP that geo-resolves to an unmapped region.
Geo-gated logic on the site keys off the visitor's resolved region, so CI
receives a different (and inconsistent) set of content, operators, and
region-prompt behaviour than a real user in a supported region. This is an
environment/origin issue, not a defect in the site or the tests.

## Variant: Firefox-fingerprint personalization (NOT pure IP geo-gating) — #925

Distinct from the IP/region gating above, but the same infra family: on **Betting
Sites → US Sportsbooks**, the operator list (`li.operator-item`) fails to render
**only for Firefox running from the CI datacenter IP**. Chrome and WebKit in the
same CI job load it fine, and Firefox loads it fine from a real/local IP
(verified 2026-08-06 — chrome + firefox both pass locally). So this is **not pure
IP geo-gating** — it appears to be a bot-detection / personalization variant that
keys on Firefox's fingerprint *in combination with* the datacenter origin.

Mitigation added 2026-08-06: skip the US Sportsbooks operator-list suite for
Firefox in CI (`tests/helpers/oplistSuite.ts` `skipFirefoxCi`, scoped to the US
config in `tests/betting-sites.spec.ts`).

**Why the distinction matters for the eventual fix:** a mapped-region egress IP
(the durable fix below) may *not* by itself resolve this one, because the trigger
includes the browser fingerprint, not just the resolved region. When the infra
work happens, confirm whether the personalization/bot layer treats Firefox
differently independent of IP — otherwise this skip may need to stay even after
the region IP is fixed.

## Recommended durable fix

Give CI a **mapped-region egress IP** so its geo resolution matches a real
user in a supported region. Options, in rough order of preference:

1. Route CI traffic through a proxy / egress with an IP in a mapped region.
2. Run the CI workers from (or NAT them through) a mapped-region location.

Either approach removes the root cause and lets the test-side guards/skips
added this session be revisited and simplified once CI sees the real-user view.

## Notes

- The test-side mitigations (CI-skips, operator-count guard, hardened
  region-prompt dismiss) are working around the symptom, not fixing it.
- Once CI has a mapped-region IP, those workarounds should be reviewed —
  several may no longer be needed.
