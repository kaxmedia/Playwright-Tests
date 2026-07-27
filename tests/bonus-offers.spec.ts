// ─────────────────────────────────────────────────────────────────────────────
// Bonus / Offers Pages — gambling.com
//
// Casino bonus listing pages across key markets. Reuses ComparisonPage + shared
// oplist suite helpers (same card template as comparison / betting suites).
//
// Run with:
//   npx playwright test tests/bonus-offers.spec.ts --project=chrome
//   npx playwright test tests/bonus-offers.spec.ts --grep @regression
//   npx playwright test tests/bonus-offers.spec.ts --grep @audit
// ─────────────────────────────────────────────────────────────────────────────

import { type ComparisonPageConfig } from '../pages/ComparisonPage';
import { blockVwoExperiments } from './helpers/vwo';
import {
  registerOplistGeoSuite,
  registerOplistHttpAudit,
  registerOplistSubPageSuite,
  type OplistSubPageConfig,
} from './helpers/oplistSuite';

const bonusPages: ComparisonPageConfig[] = [
  {
    name: 'UK Casino Bonuses',
    url: 'https://www.gambling.com/uk/online-casinos/bonus',
    category: 'casino',
    expectedCardCountMin: 10,
    hasRating: true,
    hasBadge: true,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  {
    name: 'IE Casino Bonuses',
    url: 'https://www.gambling.com/ie/online-casinos/bonus',
    category: 'casino',
    expectedCardCountMin: 10,
    hasRating: true,
    hasBadge: false,
    ageLimit: '18+',
    hasLazyRating: true,
  },
  {
    name: 'US Casino Bonuses',
    url: 'https://www.gambling.com/us/online-casinos/bonus',
    category: 'casino',
    expectedCardCountMin: 5,
    hasRating: true,
    hasBadge: false,
    ageLimit: '21+',
    hasLazyRating: true,
  },
  // CA EN casino bonus hub (`/ca/online-casinos/bonus`) was removed (301 → toplist).
];

const bonusSubPages: OplistSubPageConfig[] = [
  {
    name: 'UK Free Spins No Deposit',
    url: 'https://www.gambling.com/uk/online-casinos/bonus/free-spins-no-deposit',
    expectedCardCountMin: 5,
  },
  {
    name: 'IE Free Spins No Deposit',
    url: 'https://www.gambling.com/ie/online-casinos/bonus/free-spins-no-deposit',
    expectedCardCountMin: 5,
  },
  {
    name: 'IE No Deposit Bonus',
    url: 'https://www.gambling.com/ie/online-casinos/no-deposit-bonus',
    expectedCardCountMin: 5,
  },
];

// NOTE: blockVwoExperiments strips VWO A/B scripts. T2 card-count skip is a
// separate CI-IP personalization issue (not VWO) — see oplistSuite skip reason.
registerOplistGeoSuite({
  suiteLabel: 'Bonus Pages',
  pages: bonusPages,
  skipCardCount: true,
  beforeEachExtra: blockVwoExperiments,
});

registerOplistSubPageSuite({
  suiteLabel: 'Bonus Sub-Page',
  subPages: bonusSubPages,
  skipCardCount: true,
  beforeEachExtra: blockVwoExperiments,
});

registerOplistHttpAudit('Bonus Pages — Multi-URL HTTP 200 check @audit', [
  ...bonusPages.map(({ name, url }) => ({ name, url })),
  ...bonusSubPages.map(({ name, url }) => ({ name, url })),
]);
