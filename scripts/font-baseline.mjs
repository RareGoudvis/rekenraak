// Font baseline: screenshot + measure every sidebar leaf, before and after a font-size
// sweep, so the sweep can be checked for regressions instead of trusted on sight.
//
// Walks window.__rekenraak.leaves (every APP_STRUCTURE leaf reachable from the sidebar,
// placeholders already excluded — see flattenLeaves() in src/config/appstructure.ts) and,
// for each leaf x width {4, 2} x solutions {off, on}, adds the block exactly the way a
// sidebar click does (addBlockFromType(typeId, label, leaf.defaultConstraints)), sets the
// width tier, seeds the RNG so both a `before/` and an `after/` run produce identical
// numbers, then records the cell's rendered height, its intrinsic (min-content) width, its
// text, and a screenshot.
//
// Usage (dev server must already be running):
//   npm run dev
//   node scripts/font-baseline.mjs --out C:/Users/ruben/Downloads/font-check/before
//   node scripts/font-baseline.mjs --out C:/Users/ruben/Downloads/font-check/after --seed 1234
//
// Writes <out>/index.json (one row per leaf x width x solutions) and one PNG per row named
// <leafId>-w<width>-s<0|1>.png. A leaf that throws is recorded with its error and skipped —
// the run does not abort, since one bad leaf must not hide the other ~400 results.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });

await page.goto(URL);
await page.waitForFunction(() => !!window.__rekenraak);
// Fresh profile has no autosave, but skip the tour overlay defensively — it steals focus
// and sits over the sheet, which would otherwise obscure the very first cell measured.
await page.evaluate(() => { try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ } });
await page.reload();
await page.waitForFunction(() => !!window.__rekenraak);

let leaves = await page.evaluate(() => window.__rekenraak.leaves);
if (ONLY.length) leaves = leaves.filter(l => ONLY.includes(l.id) || ONLY.includes(l.typeId));
console.log(`${leaves.length} leaves, widths [${WIDTHS.join(',')}], seed ${SEED}`);

const rows = [];
const t0 = Date.now();

for (const leaf of leaves) {
    for (const width of WIDTHS) {
        for (const solutions of [0, 1]) {
            const key = `${leaf.id}-w${width}-s${solutions}`;
            try {
                const measured = await page.evaluate(async ({ leaf, width, solutions, seed }) => {
                    const r = window.__rekenraak;
                    r.seed(seed);
                    r.clearBlocks();
                    // Exactly what sidebar.tsx's addLeaf does on a real click: registry
                    // defaults + base snapshot (inside the store) + this leaf's override.
                    r.addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints);
                    const block = r.getState().blocks[0];
                    if (!block) return { error: 'no block produced' };
                    r.updateBlockSettings(block.id, { widthUnits: width });
                    r.getState().setShowSolutions(!!solutions);
                    // Two frames: one for React to commit the width/solutions change, one
                    // for the measure -> repack pass PageSheet triggers off it.
                    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));

                    const cell = document.querySelector(`[data-block-id="${block.id}"]`);
                    if (!cell) return { error: 'cell not found after render' };

                    // Same probe PageSheet.tsx runs internally (probeIntrinsicWidth) —
                    // replicated here because that measurement lives in React state, not
                    // on window, and swapping the inline width is cheap and non-destructive.
                    const inner = cell.querySelector('[data-scaled-inner]');
                    let intrinsicPx;
                    if (inner) {
                        const prev = inner.style.width;
                        inner.style.width = 'min-content';
                        const local = inner.scrollWidth;
                        inner.style.width = prev;
                        const scale = Number(inner.dataset.scale) || 1;
                        intrinsicPx = local > 0 ? local * scale : undefined;
                    }

                    return {
                        cellHeightPx: cell.offsetHeight,
                        intrinsicPx: intrinsicPx ?? null,
                        text: cell.innerText,
                    };
                }, { leaf, width, solutions, seed: SEED });

                if (measured.error) {
                    rows.push({ leafId: leaf.id, path: leaf.path, typeId: leaf.typeId, width, solutions, error: measured.error });
                    console.log(`! ${key}: ${measured.error}`);
                    continue;
                }

                const shot = `${key}.png`;
                const cellHandle = page.locator(`[data-block-id]`).first();
                try { await cellHandle.screenshot({ path: join(OUT, shot) }); } catch { /* off-screen, still record the numbers */ }

                rows.push({
                    leafId: leaf.id, path: leaf.path, typeId: leaf.typeId, width, solutions,
                    cellHeightPx: measured.cellHeightPx,
                    intrinsicPx: measured.intrinsicPx,
                    text: measured.text,
                    screenshot: shot,
                });
            } catch (err) {
                rows.push({ leafId: leaf.id, path: leaf.path, typeId: leaf.typeId, width, solutions, error: String(err) });
                console.log(`! ${key} threw: ${err}`);
            }
        }
    }
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify({ url: URL, seed: SEED, widths: WIDTHS, leafCount: leaves.length, rows }, null, 2));

const skipped = rows.filter(r => r.error);
const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n${rows.length} rows (${rows.length - skipped.length} ok, ${skipped.length} skipped) in ${elapsedS}s -> ${OUT}`);
if (skipped.length) {
    console.log('Skipped:');
    for (const s of skipped) console.log(`  ${s.leafId} w${s.width} s${s.solutions}: ${s.error}`);
}

await browser.close();
