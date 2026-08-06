// ─────────────────────────────────────────────────────────────────────────────
// Betting Sites Category Pages — gambling.com
//
// Sports oplists reuse ComparisonPage. Main geo configs are derived from
// `comparisonPages` (single source of truth). Sub-pages stay local.
//
// Run with:
//   npx playwright test tests/betting-sites.spec.ts --project=chrome
//   npx playwright test tests/betting-sites.spec.ts --grep @regression
//   npx playwright test tests/betting-sites.spec.ts --grep @audit
// ─────────────────────────────────────────────────────────────────────────────

import { comparisonPages } from '../pages/ComparisonPage';
import {
  registerOplistGeoSuite,
  registerOplistHttpAudit,
  registerOplistSubPageSuite,
  type OplistSubPageConfig,
} from './helpers/oplistSuite';

/** Sports comparison URLs covered by this suite (must exist in comparisonPages). */
const BETTING_URLS = new Set([
  'https://www.gambling.com/uk/betting-sites',
  'https://www.gambling.com/ie/betting-sites',
  'https://www.gambling.com/de/sportwetten',
  'https://www.gambling.com/us/sportsbooks',
  'https://www.gambling.com/nz/betting-sites',
]);

const bettingPages = comparisonPages.filter(
  (c) => c.category === 'sports' && BETTING_URLS.has(c.url),
);

if (bettingPages.length !== BETTING_URLS.size) {
  throw new Error(
    `betting-sites: expected ${BETTING_URLS.size} sports configs from comparisonPages, got ${bettingPages.length}`,
  );
}

const bettingSubPages: OplistSubPageConfig[] = [
  {
    name: 'UK Free Bets',
    url: 'https://www.gambling.com/uk/betting-sites/free-bets',
    expectedCardCountMin: 5,
  },
  {
    name: 'UK Betting Apps',
    url: 'https://www.gambling.com/uk/betting-sites/apps',
    expectedCardCountMin: 5,
  },
];

registerOplistGeoSuite({
  suiteLabel: 'Betting Sites',
  pages: bettingPages,
  // #925: US Sportsbooks operator list fails to render for Firefox from the CI datacenter IP
  // (firefox-fingerprint personalization variant, not geo). Scoped to US — the only geo that
  // exhibited it (all 11 firefox failures in run #925 were US Sportsbooks); chrome/webkit and a
  // real/local IP are unaffected. Other geos load fine on firefox-CI, so they are NOT skipped.
  skipFirefoxCi: (config) => config.url === 'https://www.gambling.com/us/sportsbooks',
});

registerOplistSubPageSuite({
  suiteLabel: 'Betting Sub-Page',
  subPages: bettingSubPages,
});

registerOplistHttpAudit('Betting Sites — Multi-URL HTTP 200 check @audit', [
  ...bettingPages.map(({ name, url }) => ({ name, url })),
  ...bettingSubPages.map(({ name, url }) => ({ name, url })),
]);
