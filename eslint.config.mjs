import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

/** Playwright plugin rules: start lenient on legacy tests; tighten over time in follow-up PRs. */
const playwrightRuleTuning = {
    // Large refactors to adopt web-first assertions across the suite — track in optimize / audit doc.
    'playwright/prefer-web-first-assertions': 'off',
    // `networkidle` is discouraged but still used sparingly for SPA settle; prefer explicit signals when possible.
    'playwright/no-networkidle': 'warn',
    'playwright/expect-expect': 'warn',
    'playwright/no-conditional-in-test': 'warn',
    'playwright/no-conditional-expect': 'warn',
    'playwright/no-wait-for-timeout': 'warn',
    'playwright/no-force-option': 'warn',
    'playwright/no-skipped-test': 'warn',
    'playwright/prefer-locator': 'warn',
    'playwright/no-useless-not': 'warn',
    'playwright/prefer-to-have-count': 'warn',
};

export default tseslint.config(
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'test-results/**',
            'playwright-report/**',
            'playwright/.cache/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['tests/**/*.ts'],
        ...playwright.configs['flat/recommended'],
        rules: {
            ...(playwright.configs['flat/recommended'].rules ?? {}),
            ...playwrightRuleTuning,
        },
    },
);
