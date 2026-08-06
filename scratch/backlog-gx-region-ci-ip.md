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
  don't flip, and the tab nav ("Profile details" link) never becomes visible while
  the page sits in its GX loading skeleton. As of 2026-08-06 the ENTIRE
  authenticated `profile.spec.ts` "Profile Section" describe is CI-skipped in one
  `beforeEach` (isolated run #1074 showed `:87` failing first and serial-mode
  cascading the rest to "did not run" — per-test skips were whack-a-mole). Content
  exists and passes from a real/local IP (live-verified 2026-08-06, chrome).
- **Sub Category pages** — operator counts differed from the real-user view,
  requiring an operator-count guard.
- **Tournaments** — a geo/region prompt ("region popup") appeared for the CI
  IP that a mapped-region user would not hit the same way, contributing to the
  dismiss-flow bug fixed in PR #150.
- **US Sportsbooks operator list (Firefox only)** — absent for Firefox in CI on
  BOTH `betting-sites.spec.ts` and `comparison-page.spec.ts`; see the distinct
  "Firefox-fingerprint variant" section below.

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

Mitigation added 2026-08-06: skip the US Sportsbooks operator-list tests for Firefox
in CI — `tests/helpers/oplistSuite.ts` `skipFirefoxCi` (scoped to the US config in
`tests/betting-sites.spec.ts`), and the same firefox+CI+US `beforeEach` skip on the
`US Sportsbooks` describe in `tests/comparison-page.spec.ts` (run #31095392427).

**Why the distinction matters for the eventual fix:** a mapped-region egress IP
(the durable fix below) may *not* by itself resolve this one, because the trigger
includes the browser fingerprint, not just the resolved region. When the infra
work happens, confirm whether the personalization/bot layer treats Firefox
differently independent of IP — otherwise this skip may need to stay even after
the region IP is fixed.

## Variant: External-dependency flakiness (NOT geo/IP gating) — footer

Distinct from all of the above — not about the CI IP's region at all. `footer.spec.ts`'s
"regulatory logos … landing pages return 200" tests fetch the EXTERNAL regulator/government landing
pages the footer logos link to (GamCare, GambleAware, gambling commissions, etc.). Those are
third-party sites gambling.com does not control; when they are slow/unresponsive from the CI
datacenter the request times out and the test reds. Footer flip-flopped success→failure→success on
2026-08-05/06 (e.g. failure #31087826403 at 09:08 = 4× `apiRequestContext.get: Timeout 15000ms
exceeded` on the US/UK/DE/GR regulatory logos; the 10:58 run passed with no code change).

Mitigation added 2026-08-06: the regulatory-logo reachability check is now best-effort
(`fetchLandingStatus` — 30 s timeout + one retry; a timeout/network error is non-fatal). Logo
presence + correct href stay HARD assertions and a real 404/5xx still fails, so a genuinely broken
regulator link is still caught — only third-party latency stops reding the suite.

**Not part of the mapped-region-IP work** — a region egress IP won't change third-party uptime.
Listed here only so the infra team has the full CI-flakiness picture in one place.

## Variant: Cloudflare bot-challenge (NOT geo/region content gating) — news #31095414565

`news-page.spec.ts` "page has no failed network requests" failed intermittently in CI on a
`https://www.gambling.com/cdn-cgi/challenge-platform/…` request — Cloudflare's bot-challenge
platform, injected ONLY for bot-flagged IPs (the CI datacenter). A real visitor never triggers it
(the page passed 2 h earlier). It's Cloudflare's infrastructure, not the site's own resources.

Mitigation added 2026-08-06: the failed-request check now excludes all `/cdn-cgi/` URLs (Cloudflare
infra — RUM beacons + the challenge platform), not just `/cdn-cgi/rum`. A genuinely broken
first-party request still fails the test.

**⚠️ NOT expected to be resolved by the planned mapped-region-IP fix — track as a SEPARATE
follow-up.** The trigger is Cloudflare BOT DETECTION (fingerprinting a datacenter / automation
origin), not region content. A mapped-region egress IP changes the resolved *region*, but a
hosting/datacenter IP can still be bot-challenged regardless of its geo — so the region fix very
likely does NOT clear this. Do not assume it's covered: once the region-IP infrastructure lands,
explicitly **re-verify against the actual egress IP** whether `cdn-cgi/challenge-platform` still
fires from CI, and if it does pursue a separate fix (e.g. a Cloudflare allowlist / WAF bypass for
the CI egress IP, or keep the `/cdn-cgi/` exclusion).

## Recommended durable fix

Give CI a **mapped-region egress IP** so its geo resolution matches a real
user in a supported region. Options, in rough order of preference:

1. Route CI traffic through a proxy / egress with an IP in a mapped region.
2. Run the CI workers from (or NAT them through) a mapped-region location.

Either approach removes the root cause of the geo/region-content items above and lets those
test-side guards/skips be revisited once CI sees the real-user view. **It does NOT cover the
Cloudflare bot-challenge item (news) — that keys on the origin being a datacenter/automation
client, not on its resolved region, so it needs a separate follow-up (see its section). The
Firefox-fingerprint operator-list variant is the same family and should also be re-verified against
the real egress IP rather than assumed fixed.**

## Notes

- The test-side mitigations (CI-skips, operator-count guard, hardened
  region-prompt dismiss) are working around the symptom, not fixing it.
- Once CI has a mapped-region IP, those workarounds should be reviewed —
  several may no longer be needed.
- **Exception — Cloudflare bot-challenge (news):** NOT expected to be resolved by the
  mapped-region-IP fix (it's bot detection, not region content). Keep it as a separate follow-up —
  re-verify against the actual egress IP once the infra lands; do not close it on the assumption
  the region fix covered it.
