// Font baseline: screenshot + measure every sidebar leaf, before and after a font-size
// sweep, so the sweep can be checked for regressions instead of trusted on sight.
//
// The walk itself lives in scripts/lib/leafWalk.mjs — shared with scripts/visual-gate.mjs.
// It walks window.__rekenraak.leaves (every APP_STRUCTURE leaf reachable from the sidebar,
// placeholders already excluded — see flattenLeaves() in src/config/appstructure.ts) and,
// for each leaf x width x solutions {off, on}, adds the block exactly the way a sidebar
// click does, sets the width tier, seeds the RNG so both a `before/` and an `after/` run
// produce identical numbers, then records height, intrinsic width, text and a screenshot.
//
// Usage (dev server must already be running):
//   npm run dev
//   node scripts/font-baseline.mjs --out C:/Users/ruben/Downloads/font-check/before
//   node scripts/font-baseline.mjs --out C:/Users/ruben/Downloads/font-check/after --seed 1234
//
// Writes <out>/index.json (one row per leaf x width x solutions) and one PNG per row named
// <leafId>-w<width>-s<0|1>.png. A leaf that throws is recorded with its error and skipped —
// the run does not abort, since one bad leaf must not hide the other ~400 results.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { walkLeaves } from './lib/leafWalk.mjs';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const URL = arg('url', 'http://localhost:5173/');
const OUT = arg('out', join('.', 'font-baseline-out'));
const WIDTHS = arg('widths', '4,2').split(',').map(Number);
const SEED = Number(arg('seed', 1234));
// --only leafId,leafId — restricts the walk for a quick smoke run; omitted = every leaf.
const ONLY = arg('only', '').split(',').filter(Boolean);

const t0 = Date.now();
const { rows, leaves } = await walkLeaves({ url: URL, out: OUT, widths: WIDTHS, seed: SEED, only: ONLY });
console.log(`${leaves.length} leaves, widths [${WIDTHS.join(',')}], seed ${SEED}`);

writeFileSync(join(OUT, 'index.json'), JSON.stringify({ url: URL, seed: SEED, widths: WIDTHS, leafCount: leaves.length, rows }, null, 2));

const skipped = rows.filter(r => r.error);
const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${rows.length} rows (${rows.length - skipped.length} ok, ${skipped.length} skipped) in ${elapsedS}s -> ${OUT}`);
if (skipped.length) {
    console.log('Skipped:');
    for (const s of skipped) console.log(`  ${s.leafId} w${s.width} s${s.solutions}: ${s.error}`);
}
