// Trigger shots: render each known-bug trigger case (leaf + constraints + grade + seed) as a
// real worksheet cell, in the font-baseline output shape, so `npm run font:compare` can diff a
// pre-fix run against a post-fix run and give the owner a contact sheet of flagged rows only.
//
// Usage (dev server must already be running):
//   npm run dev -- --port 5190 --strictPort
//   node scripts/trigger-shots.mjs --url http://localhost:5190/ --out ~/Downloads/limit-fix-check/before
//   ... fix ..., then the same into .../after, then:
//   node scripts/font-compare.mjs --before .../before --after .../after --out .../compare
//
// Cases: --cases <json> (default scripts/limit-trigger-cases.json), an array of
// { bugId, leafId, typeId, constraints, grade: null|1..6, seed, note }. --only L1,L3 filters by bugId.
// Cell keys are `<bugId>-<caseIdx>-w<w>-s<0|1>` (caseIdx = position in the case file, so it stays
// stable under --only). A case that hangs or throws becomes `error` rows; the run carries on.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { walkLeaves } from './lib/leafWalk.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const URL = arg('url', 'http://localhost:5173/');
const OUT = arg('out', join('.', 'trigger-shots-out'));
const CASES = arg('cases', 'scripts/limit-trigger-cases.json');
const WIDTHS = arg('widths', '4,2').split(',').map(Number);
const SOLUTIONS = arg('solutions', '0,1').split(',').map(Number);
const ONLY = arg('only', '').split(',').filter(Boolean);
// Generous: a hung generator never returns, a slow one still finishes 4 cells well inside this.
const CASE_TIMEOUT_MS = Number(arg('timeout', 60000));

const cases = JSON.parse(readFileSync(CASES, 'utf8'));
mkdirSync(OUT, { recursive: true });

const rows = [];
for (let idx = 0; idx < cases.length; idx++) {
    const c = cases[idx];
    if (ONLY.length && !ONLY.includes(c.bugId)) continue;
    const cellId = `${c.bugId}-${idx}`;
    const path = `${c.bugId} #${idx} ${c.leafId}${c.grade ? ` (lj ${c.grade})` : ''}${c.note ? ` - ${c.note}` : ''}`;
    const base = { leafId: cellId, realLeafId: c.leafId, path, typeId: c.typeId, bugId: c.bugId, grade: c.grade ?? null, caseConstraints: c.constraints ?? {} };
    const mine = [];
    let browser;
    let timer;
    let failure = null;

    const walk = walkLeaves({
        url: URL, out: OUT, widths: WIDTHS, seed: c.seed ?? 1234, only: [c.leafId],
        solutionsList: SOLUTIONS,
        log: () => {},
        onBrowser: (b) => { browser = b; },
        // Variant constraints merge over the leaf's own defaults, like a sidebar click + config tweak.
        overrideFor: (leaf) => (leaf.typeId === c.typeId ? [{ tag: cellId, constraints: c.constraints ?? {}, grade: c.grade ?? null }] : []),
        prepare: (page, v) => page.evaluate((g) => window.__rekenraak.getState().setSelectedGrade(g), v?.grade ?? null),
        keyFor: (_leaf, _v, w, s) => `${cellId}-w${w}-s${s}`,
        deselect: true,
        onRow: (r) => mine.push(r),
    }).catch((e) => { failure ??= String(e).split('\n')[0]; });

    const timeout = new Promise((res) => { timer = setTimeout(() => { failure = `timeout after ${CASE_TIMEOUT_MS} ms (hang?)`; res(); }, CASE_TIMEOUT_MS); });
    await Promise.race([walk, timeout]);
    clearTimeout(timer);
    if (failure) { try { await browser?.close(); } catch { /* already gone */ } }

    for (const w of WIDTHS) for (const s of SOLUTIONS) {
        const got = mine.find((r) => r.width === w && r.solutions === s);
        if (got) {
            // font-compare keys rows by leafId, so the cell id replaces the real leaf id.
            rows.push({ ...got, ...base, tag: undefined, variant: undefined, constraints: undefined });
        } else {
            const error = failure ?? 'leaf not found for this typeId';
            rows.push({ ...base, width: w, solutions: s, error });
            console.log(`! ${cellId}-w${w}-s${s}: ${error}`);
        }
    }
    console.log(`${cellId} ${failure || !mine.length ? 'FAILED' : 'ok'}`);
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify({ url: URL, widths: WIDTHS, caseFile: CASES, caseCount: cases.length, rows }, null, 2));
const bad = rows.filter((r) => r.error);
console.log(`\n${rows.length} rows (${rows.length - bad.length} ok, ${bad.length} errored) -> ${OUT}`);
