// Width matrix: how narrow can every exercise type actually go?
//
// The LAYOUT tiers in src/config/blockLayout.ts were measured once, on the old 6-unit
// grid, and never revisited — 31 of ~59 types were pinned to full width. Viewers read
// their cell width from BlockWidthContext and SHRINK rather than overflow, so "does it
// fit" cannot be answered by looking: it needs the two numbers this harness reads back.
//
//   overflow = scrollWidth / clientWidth of the ScaledBlock inner div (> 1 = it clips)
//   zoom     = the auto-fit zoom ScaledBlock applied (< 1 = it shrank to fit)
//
// A type is allowed at a width when overflow <= 1.005 AND zoom >= 0.85: fitting by
// shrinking to 60% is not fitting. Measurement rules out the impossible; the screenshots
// (and the editorial veto list in blockLayout.ts) rule out the illegible.
//
// Usage (dev server must be running):
//   npm run dev
//   node scripts/width-matrix.mjs                 # default 1600px viewport
//   node scripts/width-matrix.mjs --width 1000    # sheetZoom < 1, to prove invariance
//
// Writes scripts/width-matrix.result.json + .csv and one screenshot per cell to
// ~/Downloads/width-matrix/.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const URL = arg('url', 'http://localhost:5173/');
const VIEWPORT_W = Number(arg('width', 1600));
const SHOTS = arg('shots', join(homedir(), 'Downloads', 'width-matrix'));
const SUFFIX = (VIEWPORT_W === 1600 ? '' : `.w${VIEWPORT_W}`) + (arg('only', '') ? '.only' : '');
const WIDTHS = [4, 2, 1];
// --only a,b,c runs a subset; its results go to a separate file so the full run stays intact.
const ONLY = arg('only', '').split(',').filter(Boolean);

mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: VIEWPORT_W, height: 1100 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('  [console.error]', m.text()); });
await page.goto(URL);
await page.waitForFunction(() => !!window.__rekenraak);

// The tour overlay and the banners sit over the sheet; the screenshots are per cell, so
// they do not obscure anything, but the tour steals focus on a fresh profile.
await page.evaluate(() => { try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ } });
await page.reload();
await page.waitForFunction(() => !!window.__rekenraak);

// Measuring the tiers with the tier clamp on would only measure the clamp.
await page.evaluate(() => window.__rekenraak.setIgnoreMinWidth(true));

const typeIds = (await page.evaluate(() => window.__rekenraak.typeIds)).filter(t => ONLY.length === 0 || ONLY.includes(t));
const rows = [];

for (const typeId of typeIds) {
    for (const width of WIDTHS) {
        for (const mode of ['default', 'single']) {
            const measured = await page.evaluate(async ({ typeId, width, mode }) => {
                const r = window.__rekenraak;
                r.clearBlocks();
                r.addBlockFromType(typeId, typeId);
                const block = r.getState().blocks[0];
                if (!block) return null;
                const defaultCount = block.numberOfExercises;
                // Count FIRST and on its own: only a count-only update trims the already
                // generated exercises, and an untrimmed array would render ten items in a
                // block that says one — which is exactly what h(default) - h(1) measures.
                if (mode === 'single') r.updateBlockSettings(block.id, { numberOfExercises: 1 });
                r.updateBlockSettings(block.id, { widthUnits: width });
                // Two frames: one for React to commit, one for the measure→repack pass.
                await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
                await new Promise((res) => setTimeout(res, 60));

                const cell = document.querySelector(`[data-block-id="${block.id}"]`);
                if (!cell) return { missing: true, defaultCount };
                // ScaledBlock's inner div carries the auto-fit zoom as an INLINE style, so
                // that is how it is found without adding a test hook to a shared component.
                // Its scrollWidth vs clientWidth is what "does the content fit" means.
                const inner = Array.from(cell.querySelectorAll('.print-block > div'))
                    .find(d => d.style.zoom !== '') ?? cell.querySelector('.print-block');
                const cs = getComputedStyle(inner);
                return {
                    defaultCount,
                    count: r.getState().blocks[0].numberOfExercises,
                    overflow: inner.clientWidth > 0 ? inner.scrollWidth / inner.clientWidth : 0,
                    scrollWidth: inner.scrollWidth,
                    clientWidth: inner.clientWidth,
                    zoom: Number(cs.zoom) || 1,
                    cellHeight: cell.offsetHeight,
                };
            }, { typeId, width, mode });

            if (!measured) { console.log(`! ${typeId} produced no block`); continue; }
            const name = `${typeId}-w${width}-n${mode === 'single' ? 1 : measured.defaultCount}`;
            const cell = page.locator(`[data-block-id]`).first();
            try { await cell.screenshot({ path: join(SHOTS, `${name}.png`) }); } catch { /* off-screen */ }

            rows.push({
                typeId, width, mode,
                count: measured.count ?? null,
                overflow: Number((measured.overflow ?? 0).toFixed(4)),
                zoom: Number((measured.zoom ?? 1).toFixed(4)),
                scrollWidth: measured.scrollWidth ?? null,
                clientWidth: measured.clientWidth ?? null,
                cellHeight: measured.cellHeight ?? null,
            });
            process.stdout.write(`${typeId} w${width} ${mode}: overflow ${rows.at(-1).overflow} zoom ${rows.at(-1).zoom} h ${rows.at(-1).cellHeight}\n`);
        }
    }
}

const OK = (r) => r.overflow <= 1.005 && r.zoom >= 0.85;
const summary = {};
for (const typeId of typeIds) {
    const at = (w, mode) => rows.find(r => r.typeId === typeId && r.width === w && r.mode === mode);
    const passes = (w, mode) => { const r = at(w, mode); return !!r && OK(r); };
    // Narrowest width that works with a FULL block of exercises; minWidthSingle covers the
    // types that only fit when there is a single exercise with nothing beside it.
    const minWidth = WIDTHS.filter(w => passes(w, 'default')).sort((a, b) => a - b)[0] ?? 4;
    const minSingle = WIDTHS.filter(w => passes(w, 'single')).sort((a, b) => a - b)[0] ?? 4;
    const hDefault = at(4, 'default')?.cellHeight ?? 0;
    const hSingle = at(4, 'single')?.cellHeight ?? 0;
    const n = at(4, 'default')?.count ?? 1;
    // rowUnits from the slope between the two counts, in 24px units. First-paint fallback
    // only (measure-then-pack overrides it), so 2 decimals is plenty.
    const rowUnits = n > 1 ? Number(((hDefault - hSingle) / (n - 1) / 24).toFixed(2)) : null;
    summary[typeId] = { minWidth, minWidthSingle: minSingle < minWidth ? minSingle : undefined, rowUnits, count: n, hDefault, hSingle };
}

writeFileSync(join(HERE, `width-matrix.result${SUFFIX}.json`), JSON.stringify({ viewport: VIEWPORT_W, rule: 'overflow <= 1.005 && zoom >= 0.85', summary, rows }, null, 2));
writeFileSync(
    join(HERE, `width-matrix.result${SUFFIX}.csv`),
    ['typeId,width,mode,count,overflow,zoom,scrollWidth,clientWidth,cellHeight']
        .concat(rows.map(r => [r.typeId, r.width, r.mode, r.count, r.overflow, r.zoom, r.scrollWidth, r.clientWidth, r.cellHeight].join(',')))
        .join('\n'),
);
console.log(`\n${rows.length} cells measured; screenshots in ${SHOTS}`);
await browser.close();
