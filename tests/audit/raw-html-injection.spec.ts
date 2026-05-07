import { mkdirSync, writeFileSync } from 'fs';
import { test, expect, type Page } from '@playwright/test';
import { AGE_VERIFICATION_GEOS } from '../../pages/AgeVerificationPage';

// ─── Global header layout audit — Sitemap Crawler ─────────────────────────────
//
// Primary check (default): the **site chrome** (header containing `img.global-nav-logo`) must sit flush
// with the top of the viewport — detects “unstuck” nav / stray blocks above the bar (e.g. white gap).
//
// Optional `RAW_HTML_CHECKS=all` adds legacy heuristics (body borders, <font>, tables, etc.).
//
// Results: test-results/raw-html-audit.json (full data),
// test-results/raw-html-audit-issues.txt (URLs + bullet findings; empty/clean run = “no issues”).
//
// Run (Chrome):
//   npx playwright test tests/audit/raw-html-injection.spec.ts --project=chrome --reporter=line
//
// RAW_HTML_MAX_TOTAL — optional cap (round-robin across geos). Omit or 0 = all URLs in each geo pool (~max coverage).
// RAW_HTML_MAX_PER_GEO — optional: trim each geo’s URL list before sampling (e.g. smoke runs).
// RAW_HTML_TEST_TIMEOUT_MS — optional test timeout in ms. Omit or 0 = no test timeout (monthly long runs).
// RAW_HTML_CHECKS — `nav` (default) or `all` for extra paste/injection heuristics.
// RAW_HTML_NAV_TOP_MAX_PX — max allowed gap above global header (default 12).
// ─────────────────────────────────────────────────────────────────────────────

// Use the site-wide index (robots.txt); plain sitemap.xml omits geo locales like /uk/
const SITEMAP_INDEX = 'https://www.gambling.com/sitemap-index.xml';

// Only check URLs that contain one of these geo slugs
const TARGET_GEOS = ['/uk/', '/ie/', '/de/', '/es/', '/nl/'];

// Global chrome (`img.global-nav-logo` shell) must be within this many px of viewport top (scroll locked at y=0)
const _navTopParsed =
    process.env.RAW_HTML_NAV_TOP_MAX_PX !== undefined && process.env.RAW_HTML_NAV_TOP_MAX_PX !== ''
        ? Number.parseInt(process.env.RAW_HTML_NAV_TOP_MAX_PX, 10)
        : NaN;
const NAV_TOP_MAX_PX =
    Number.isFinite(_navTopParsed) && _navTopParsed >= 0 ? _navTopParsed : 12;

/** `nav` = only unstuck global header check. `all` = include legacy DOM/paste heuristics. */
const RAW_HTML_CHECKS = process.env.RAW_HTML_CHECKS === 'all' ? 'all' : 'nav';

const _maxTotalParsed =
    process.env.RAW_HTML_MAX_TOTAL !== undefined && process.env.RAW_HTML_MAX_TOTAL !== ''
        ? Number.parseInt(process.env.RAW_HTML_MAX_TOTAL, 10)
        : NaN;
/** Undefined = no cap (every URL in each geo’s sitemap pool). Number ≤ 0 also means no cap. */
let MAX_TOTAL_SAMPLE: number | undefined;
if (!Number.isFinite(_maxTotalParsed)) {
    MAX_TOTAL_SAMPLE = undefined;
} else if (_maxTotalParsed <= 0) {
    MAX_TOTAL_SAMPLE = undefined;
} else {
    MAX_TOTAL_SAMPLE = _maxTotalParsed;
}

// Optional: cap each geo’s pool before cross-geo sampling (leave unset for full lists per geo)
const _maxPerGeo =
    process.env.RAW_HTML_MAX_PER_GEO !== undefined && process.env.RAW_HTML_MAX_PER_GEO !== ''
        ? Number.parseInt(process.env.RAW_HTML_MAX_PER_GEO, 10)
        : NaN;
const MAX_PAGES_PER_GEO: number | undefined = Number.isFinite(_maxPerGeo) ? _maxPerGeo : undefined;

// Concurrency — how many pages to check in parallel
const WORKERS = 4;

// Test runner timeout: unset or 0 = no cap (long monthly run). Set RAW_HTML_TEST_TIMEOUT_MS e.g. 14400000 (4h) if you need a ceiling.
const _auditTimeoutEnv = process.env.RAW_HTML_TEST_TIMEOUT_MS;
const _auditTimeoutParsed =
    _auditTimeoutEnv !== undefined && _auditTimeoutEnv !== ''
        ? Number.parseInt(_auditTimeoutEnv, 10)
        : NaN;
const AUDIT_TEST_TIMEOUT_MS = Number.isFinite(_auditTimeoutParsed) && _auditTimeoutParsed > 0
    ? _auditTimeoutParsed
    : 0;

// ─── Types ────────────────────────────────────────────────────────────────────
interface PageResult {
    url: string;
    geo: string;
    issues: string[];
    navTopPx: number;
    error?: string;
}

// ─── Fetch all URLs from sitemap ──────────────────────────────────────────────
async function fetchSitemapUrls(page: Page): Promise<string[]> {
    console.log(`\nFetching sitemap index: ${SITEMAP_INDEX}`);

    // Try sitemap index first — it may contain child sitemaps
    const indexResp = await page.request.get(SITEMAP_INDEX);
    if (!indexResp.ok()) {
        throw new Error(`Failed to fetch sitemap index: ${indexResp.status()}`);
    }

    const indexText = await indexResp.text();
    const allUrls: string[] = [];

    // Check if it's a sitemap index (contains <sitemapindex>)
    if (indexText.includes('<sitemapindex')) {
        // Extract child sitemap URLs
        const childSitemaps = [...indexText.matchAll(/<loc>(.*?)<\/loc>/gi)]
            .map(m => m[1].trim())
            .filter(u => u.endsWith('.xml'));

        console.log(`Found ${childSitemaps.length} child sitemaps`);

        // Fetch each child sitemap
        for (const childUrl of childSitemaps) {
            try {
                const childResp = await page.request.get(childUrl);
                if (!childResp.ok()) continue;
                const childText = await childResp.text();
                const urls = [...childText.matchAll(/<loc>(.*?)<\/loc>/gi)]
                    .map(m => m[1].trim())
                    .filter(u => !u.endsWith('.xml')); // exclude nested sitemaps
                allUrls.push(...urls);
                let label = childUrl;
                try {
                    label = new URL(childUrl).pathname || childUrl;
                } catch { /* keep full URL */ }
                console.log(`  ${label} — ${urls.length} URLs`);
            } catch {
                console.warn(`  Failed to fetch child sitemap: ${childUrl}`);
            }
        }
    } else {
        // It's a plain sitemap — extract URLs directly
        const urls = [...indexText.matchAll(/<loc>(.*?)<\/loc>/gi)]
            .map(m => m[1].trim())
            .filter(u => !u.endsWith('.xml'));
        allUrls.push(...urls);
        console.log(`Plain sitemap — ${urls.length} URLs`);
    }

    return allUrls;
}

// ─── Group URLs by target geo (optional per-geo trim) ─────────────────────────
function collectUrlsByGeo(urls: string[]): Record<string, string[]> {
    const byGeo: Record<string, string[]> = {};

    for (const geo of TARGET_GEOS) {
        const geoKey = geo.replace(/\//g, '');
        let list = urls
            .filter(u => u.includes(geo))
            .filter(u => !u.includes('#')); // skip anchor links
        if (MAX_PAGES_PER_GEO !== undefined) {
            list = list.slice(0, MAX_PAGES_PER_GEO);
        }
        byGeo[geoKey] = list;
    }

    return byGeo;
}

/** Round-robin across geos so each locale gets a fair share when capped (e.g. 2500 total → ~500 per geo). */
function sampleUrlsAcrossGeos(
    byGeo: Record<string, string[]>,
    maxTotal: number | undefined
): Array<{ url: string; geo: string }> {
    const geoKeys = TARGET_GEOS.map(g => g.replace(/\//g, ''));

    if (maxTotal === undefined) {
        return geoKeys.flatMap(geo => (byGeo[geo] ?? []).map(url => ({ url, geo })));
    }

    const picks: Array<{ url: string; geo: string }> = [];
    let round = 0;
    while (picks.length < maxTotal) {
        let addedThisRound = false;
        for (const geo of geoKeys) {
            if (picks.length >= maxTotal) break;
            const arr = byGeo[geo] ?? [];
            if (round < arr.length) {
                picks.push({ url: arr[round], geo });
                addedThisRound = true;
            }
        }
        if (!addedThisRound) break;
        round++;
    }
    return picks;
}

/** CookieYes + NL/ES micromodal age gate (same copy as `AgeVerificationPage`). */
async function dismissCookieAndAgeGate(page: Page, geo: string): Promise<void> {
    await page.getByRole('button', { name: /accept all/i }).click({ timeout: 4000 }).catch(() => { });

    if (geo === 'nl') {
        await page
            .getByRole('button', { name: AGE_VERIFICATION_GEOS.nl.acceptBtnText })
            .click({ timeout: 10000 })
            .catch(() => { });
        await page.locator('#age-validation').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => { });
    } else if (geo === 'es') {
        await page
            .getByRole('button', { name: AGE_VERIFICATION_GEOS.es.acceptBtnText })
            .click({ timeout: 10000 })
            .catch(() => { });
        await page.locator('#age-validation').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => { });
    }
}

// ─── Check global header flush + optional legacy heuristics ───────────────────
async function checkPage(page: Page, url: string, geo: string): Promise<PageResult> {
    const issues: string[] = [];
    let navTopPx = -1;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await dismissCookieAndAgeGate(page, geo);

        const result = await page.evaluate(
            ({ threshold, mode }: { threshold: number; mode: string }) => {
                window.scrollTo(0, 0);

                /** Outer site chrome: wrap that contains the visible global logo (not the first arbitrary `<nav>`). */
                function primaryGlobalChrome(): HTMLElement | null {
                    const logos = Array.from(document.querySelectorAll('img.global-nav-logo'));
                    for (const img of logos) {
                        const r = img.getBoundingClientRect();
                        if (r.width < 2 || r.height < 2) continue;
                        const shell =
                            img.closest('header') ??
                            img.closest('[class*="global-nav"]') ??
                            img.closest('nav');
                        if (shell) return shell as HTMLElement;
                    }
                    const topHeader = document.body?.querySelector(':scope > header');
                    if (topHeader) return topHeader as HTMLElement;
                    const anyHeader = document.querySelector('header');
                    return anyHeader as HTMLElement | null;
                }

                const issues: string[] = [];
                let navTopPx = -1;

                const chrome = primaryGlobalChrome();
                if (chrome) {
                    navTopPx = chrome.getBoundingClientRect().top;
                    if (navTopPx > threshold) {
                        issues.push(
                            `Global site header is not flush with the top of the viewport (chrome top ≈ ${navTopPx.toFixed(1)}px; max allowed ${threshold}px) — unstuck nav / stray block above the bar`
                        );
                    }
                }

                if (mode !== 'all') {
                    return { issues, navTopPx };
                }

                const nav =
                    chrome ??
                    document.querySelector(
                        'nav, header, [class*="global-nav"], [class*="site-header"]'
                    );

                const bodyStyle = document.body?.getAttribute('style') ?? '';
                const bodyBorder = document.body?.getAttribute('border');
                if (bodyStyle.includes('border') || bodyBorder !== null) {
                    issues.push(`Border on <body>: style="${bodyStyle}" border="${bodyBorder}"`);
                }

                const bodyStyleTrim = bodyStyle.trim();
                const onlyOverflowHidden =
                    bodyStyleTrim.length > 0 &&
                    /^overflow:\s*hidden\s*(!important)?\s*;?\s*$/i.test(bodyStyleTrim);
                if (bodyStyleTrim.length > 0 && !onlyOverflowHidden) {
                    issues.push(`Unexpected inline style on <body>: "${bodyStyle}"`);
                }

                const raw = document.documentElement.innerHTML;
                const bodyCount = (raw.match(/<body/gi) ?? []).length;
                const htmlCount = (raw.match(/<html/gi) ?? []).length;
                if (bodyCount > 1) issues.push(`Duplicate <body> tag (found ${bodyCount})`);
                if (htmlCount > 1) issues.push(`Duplicate <html> tag (found ${htmlCount})`);

                const borderedTables = document.querySelectorAll('table[border], table[style*="border"]');
                if (borderedTables.length > 0) {
                    issues.push(`${borderedTables.length} table(s) with border attribute — possible raw HTML paste`);
                }

                if (nav) {
                    let el = nav.previousElementSibling;
                    const stray: string[] = [];
                    while (el && stray.length < 5) {
                        const tag = el.tagName.toLowerCase();
                        const style = el.getAttribute('style') ?? '';
                        const hasBorder = el.hasAttribute('border');
                        const isEmpty = (el.textContent?.trim() ?? '') === '';
                        if (
                            style.length > 0 ||
                            hasBorder ||
                            tag === 'iframe' ||
                            tag === 'font' ||
                            tag === 'center' ||
                            tag === 'marquee' ||
                            (tag === 'div' && isEmpty && style.length > 0)
                        ) {
                            stray.push(`<${tag} style="${style.slice(0, 80)}">`);
                        }
                        el = el.previousElementSibling;
                    }
                    if (stray.length > 0) {
                        issues.push(`Stray element(s) before nav: ${stray.join(', ')}`);
                    }
                }

                const wordLikeStyle = Array.from(document.querySelectorAll('style')).some(el =>
                    /mso-|MsoNormal|font-family:\s*"?Times New Roman|table\s+Mso/i.test(
                        el.textContent ?? ''
                    )
                );
                if (wordLikeStyle) {
                    issues.push('<style> block contains Word/HTML paste markers (mso-, Times New Roman, etc.)');
                }

                const fontTags = document.querySelectorAll('font');
                if (fontTags.length > 0) {
                    issues.push(`${fontTags.length} deprecated <font> tag(s) found`);
                }

                return { issues, navTopPx };
            },
            { threshold: NAV_TOP_MAX_PX, mode: RAW_HTML_CHECKS }
        );

        navTopPx = result.navTopPx;
        issues.push(...result.issues);

    } catch (err: any) {
        return { url, geo, issues: [], navTopPx: -1, error: err.message ?? String(err) };
    }

    return { url, geo, issues, navTopPx };
}

// ─── Main audit test ───────────────────────────────────────────────────────────
test.describe('Global header layout — Full Sitemap Audit', () => {

    // 0 = disabled (default). Set RAW_HTML_TEST_TIMEOUT_MS for a hard ceiling.
    test.setTimeout(AUDIT_TEST_TIMEOUT_MS);

    test('@audit crawl all geo URLs — global header flush (unstuck nav)', async ({ page, browser }) => {
        // ── Step 1: Fetch all URLs from sitemap ──────────────────────────────────
        const allUrls = await fetchSitemapUrls(page);
        console.log(`\nTotal URLs in sitemap: ${allUrls.length}`);

        // ── Step 2: Group by geo, then sample across geos (default: full pools = max coverage) ─
        const byGeo = collectUrlsByGeo(allUrls);
        const availablePerGeo = Object.values(byGeo).reduce((sum, urls) => sum + urls.length, 0);
        const allPageUrls = sampleUrlsAcrossGeos(byGeo, MAX_TOTAL_SAMPLE);
        const totalToCheck = allPageUrls.length;

        console.log('\nURLs available per geo (after optional RAW_HTML_MAX_PER_GEO):');
        for (const [geo, urls] of Object.entries(byGeo)) {
            console.log(`  /${geo}/  — ${urls.length} in sitemap pool`);
        }
        console.log(`\nAvailable across target geos: ${availablePerGeo}`);
        if (MAX_TOTAL_SAMPLE !== undefined) {
            console.log(
                `Sampling up to ${MAX_TOTAL_SAMPLE} URLs (round-robin across geos). ` +
                    'Unset RAW_HTML_MAX_TOTAL or use 0 for full pooled crawl.'
            );
        } else {
            console.log('No RAW_HTML_MAX_TOTAL cap — checking every URL in each geo pool (max coverage).');
        }
        console.log(`\nTotal pages to check: ${totalToCheck}`);

        if (totalToCheck === 0) {
            console.warn('No URLs found matching target geos. Check sitemap structure.');
            return;
        }

        // ── Step 3: Check pages using multiple browser contexts for speed ─────────
        const results: PageResult[] = [];
        let checked = 0;

        // Open WORKERS browser contexts to parallelise
        const contexts = await Promise.all(
            Array.from({ length: WORKERS }, () => browser.newContext())
        );
        const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));

        // Distribute work across pages
        const batches: Array<typeof allPageUrls> = Array.from({ length: WORKERS }, () => []);
        allPageUrls.forEach((item, i) => batches[i % WORKERS].push(item));

        const workerResults = await Promise.all(
            batches.map(async (batch, workerIdx) => {
                const workerPage = pages[workerIdx];
                const workerResults: PageResult[] = [];
                for (const { url, geo } of batch) {
                    const result = await checkPage(workerPage, url, geo);
                    checked++;
                    if (result.issues.length > 0) {
                        console.log(`❌ [${checked}/${totalToCheck}] ${url}`);
                        result.issues.forEach(i => console.log(`   • ${i}`));
                    } else if (result.error) {
                        console.log(`⚠️  [${checked}/${totalToCheck}] ERROR: ${url} — ${result.error}`);
                    } else {
                        console.log(`✅ [${checked}/${totalToCheck}] ${url}`);
                    }
                    workerResults.push(result);
                }
                return workerResults;
            })
        );

        results.push(...workerResults.flat());

        // Clean up contexts
        await Promise.all(contexts.map(ctx => ctx.close()));

        // ── Step 4: Build report ──────────────────────────────────────────────────
        const affected = results.filter(r => r.issues.length > 0);
        const errored = results.filter(r => r.error);

        // Group affected by geo
        const affectedByGeo: Record<string, PageResult[]> = {};
        for (const result of affected) {
            if (!affectedByGeo[result.geo]) affectedByGeo[result.geo] = [];
            affectedByGeo[result.geo].push(result);
        }

        // Console summary
        console.log('\n══════════════════════════════════════════════════════');
        console.log('AUDIT SUMMARY');
        console.log('══════════════════════════════════════════════════════');
        console.log(`Total pages checked : ${results.length}`);
        console.log(`Pages with issues   : ${affected.length}`);
        console.log(`Pages with errors   : ${errored.length}`);
        console.log(`Clean pages         : ${results.length - affected.length - errored.length}`);

        if (affected.length > 0) {
            console.log('\n── AFFECTED PAGES BY GEO ──────────────────────────────');
            for (const [geo, pages] of Object.entries(affectedByGeo)) {
                console.log(`\n  /${geo}/ — ${pages.length} affected`);
                pages.forEach(p => {
                    console.log(`    ${p.url}`);
                    p.issues.forEach(i => console.log(`      • ${i}`));
                });
            }

            console.log('\n── LINKS WITH ISSUES (copy) ───────────────────────────');
            for (const p of affected) {
                console.log(p.url);
                p.issues.forEach(i => console.log(`  • ${i}`));
                console.log('');
            }
        }

        // Save JSON report
        const reportPath = 'test-results/raw-html-audit.json';
        const issuesListPath = 'test-results/raw-html-audit-issues.txt';
        mkdirSync('test-results', { recursive: true });
        writeFileSync(reportPath, JSON.stringify({
            generatedAt: new Date().toISOString(),
            totalChecked: results.length,
            totalAffected: affected.length,
            totalErrored: errored.length,
            affected: affected.map(({ url, geo, issues }) => ({ url, geo, issues })),
            affectedByGeo,
            errors: errored,
        }, null, 2));
        console.log(`\nFull report saved to: ${reportPath}`);

        const issuesLines: string[] = [
            '# Global header layout audit — URLs with detected issues',
            `# Generated: ${new Date().toISOString()}`,
            `# Pages with issues: ${affected.length}`,
            '',
        ];
        if (affected.length === 0) {
            issuesLines.push('(none — no issues detected)', '');
        } else {
            for (const p of affected) {
                issuesLines.push(p.url);
                for (const i of p.issues) {
                    issuesLines.push(`  • ${i}`);
                }
                issuesLines.push('');
            }
        }
        if (errored.length > 0) {
            issuesLines.push('# ── Load / navigation errors ──', '');
            for (const e of errored) {
                issuesLines.push(`${e.url}`);
                issuesLines.push(`  ⚠ ${e.error ?? 'unknown error'}`);
                issuesLines.push('');
            }
        }
        writeFileSync(issuesListPath, issuesLines.join('\n'));
        console.log(`Issue list (URLs + findings): ${issuesListPath}`);

        // Fail test if any pages affected — list all in the error message
        if (affected.length > 0) {
            const summary = Object.entries(affectedByGeo)
                .map(([geo, pages]) =>
                    `/${geo}/ (${pages.length} pages):\n` +
                    pages.map(p => `  ${p.url}\n  ${p.issues.join('\n  ')}`).join('\n\n')
                ).join('\n\n');

            expect(
                affected.length,
                `\n\n${affected.length} page(s) with global header layout issues:\n\n${summary}\n`
            ).toBe(0);
        }
    });

});