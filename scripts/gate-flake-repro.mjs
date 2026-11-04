// Deterministic repro of the visual gate's "[layout] repack loop broken" flake (BUGS.md
// "Layout / sheet"): walks the breuken leaves exactly like scripts/lib/leafWalk.mjs does,
// N times, and logs every [layout] warning with its cell, the measurer's snapshot at that
// moment and the document.fonts loading events around it, so a fix can be proven by
// "0 trips in N runs" instead of by one lucky gate pass.
//
//   node scripts/gate-flake-repro.mjs --url http://localhost:5331/ [--runs 10] [--all]
//        [--prewarm] [--no-shots] [--leaves a,b] [--seed 1234] [--widths 4,2,1] [--out dir] [--stop-after N]
//
// --all walks every sidebar leaf (the gate's own order) instead of only the breuken ones;
// --prewarm loads every declared FontFace and awaits document.fonts.ready before the walk.
// Without --url it starts a private dev server (scripts/lib/devServer.mjs). Exit 1 = a trip.

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { startDevServer } from './lib/devServer.mjs';
import { HEIGHT_DELTA_FLAG_PX } from './lib/visualCompare.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const RUNS = Number(arg('runs', 10));
const SEED = Number(arg('seed', 1234));
const WIDTHS = arg('widths', '4,2,1').split(',').map(Number);
const ALL = has('all');
const PREWARM = has('prewarm');
// The gate screenshots every cell between its settle and the next cell; --no-shots drops that step.
const SHOTS = !has('no-shots');
const STOP_AFTER = Number(arg('stop-after', 0));
// breuken-veelhoek first: it is the cell the flake was first reported on.
const LEAVES = arg('leaves', 'breuken-veelhoek,breuken-kleuren,breuken-herkennen,breuken-hoeveelheid,breuken-lijnstuk').split(',');
const OUT = arg('out', join(homedir(), 'Downloads', 'gate-flake', 'repro', new Date().toISOString().replace(/[:.]/g, '-')));
mkdirSync(join(OUT, 'shots'), { recursive: true });

const baselinePath = join(ROOT, 'scripts', 'visual-baseline.json');
const baseline = existsSync(baselinePath) ? JSON.parse(readFileSync(baselinePath, 'utf8')).rows : {};

let server = null;
const url = arg('url', '') || (server = await startDevServer()).url;

// Runs in the page before the app: records font loads and every [layout] warning with the
// cell the walk is in and the measurer's snapshot taken synchronously inside the warn.
function instrument() {
    window.__fontEvents = [];
    window.__layoutEvents = [];
    window.__cellLog = [];
    window.__cell = null;
    const faces = (e) => [...(e.fontfaces ?? [])].map((f) => [f.family, f.weight, f.style, f.unicodeRange]);
    // A loadingdone that only re-reports FontFace objects seen loaded before changes no glyph width.
    const seen = new WeakSet();
    const fresh = (e) => [...(e.fontfaces ?? [])].filter((f) => !seen.has(f)).length;
    for (const type of ['loading', 'loadingdone', 'loadingerror']) {
        document.fonts.addEventListener(type, (e) => {
            const n = type === 'loadingdone' ? fresh(e) : null;
            if (type === 'loadingdone') for (const f of e.fontfaces ?? []) seen.add(f);
            window.__fontEvents.push({ t: performance.now(), type, cell: window.__cell, faces: faces(e), freshFaces: n, inSet: [...(e.fontfaces ?? [])].filter((f) => document.fonts.has(f)).length, setSize: document.fonts.size, styleSheets: document.styleSheets.length });
        });
    }
    const warn = console.warn.bind(console);
    console.warn = (...a) => {
        const msg = a.map(String).join(' ');
        if (msg.includes('[layout]')) {
            let measured = null;
            try { measured = window.__rekenraak?.measured?.() ?? null; } catch { /* hook gone */ }
            window.__layoutEvents.push({ t: performance.now(), cell: window.__cell, msg, measured });
        }
        warn(...a);
    };
}

const isTrip = (e) => e.msg.includes('repack loop broken');

async function walkOnce(run) {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
        await page.addInitScript(instrument);
        // The gate's own bookkeeping (leafWalk.mjs): node-side console capture reset per cell,
        // so a warning delivered late lands in whichever cell is current, exactly as there.
        let cellErrors = [];
        page.on('console', (m) => {
            if (m.type() === 'error') cellErrors.push(m.text());
            else if (m.type() === 'warning' && m.text().includes('repack loop broken')) cellErrors.push(m.text());
        });
        page.on('pageerror', (e) => cellErrors.push(String(e)));
        // SYNC: the boot below and the per-cell evaluate are scripts/lib/leafWalk.mjs's walk
        // verbatim (tour skip, clear-and-wait, seed, add, width, solutions, settle, retry once).
        await page.goto(url);
        await page.waitForFunction(() => !!window.__rekenraak);
        await page.evaluate(() => { try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ } });
        await page.reload();
        await page.waitForFunction(() => !!window.__rekenraak);
        if (PREWARM) {
            await page.evaluate(async () => {
                await Promise.allSettled([...document.fonts].map((f) => f.load()));
                await document.fonts.ready;
            });
        }
        let leaves = await page.evaluate(() => window.__rekenraak.leaves.map((l) => ({ id: l.id, typeId: l.typeId, label: l.label, defaultConstraints: l.defaultConstraints })));
        if (!ALL) leaves = LEAVES.map((id) => leaves.find((l) => l.id === id)).filter(Boolean);

        const cells = [];
        for (const leaf of leaves) {
            for (const width of WIDTHS) {
                for (const solutions of [0, 1]) {
                    const key = `${leaf.id}-w${width}-s${solutions}`;
                    let measured, tripped = 0;
                    cellErrors = [];
                    for (let attempt = 0; attempt < 2; attempt++) {
                        if (attempt) { await page.waitForTimeout(1700); cellErrors = []; }
                        const before = await page.evaluate(({ key, attempt }) => {
                            window.__cell = attempt ? `${key}#retry` : key;
                            window.__cellLog.push({ t: performance.now(), cell: window.__cell });
                            return window.__layoutEvents.filter((e) => e.msg.includes('repack loop broken')).length;
                        }, { key, attempt });
                        measured = await page.evaluate(async ({ leaf, width, solutions, seed }) => {
                            const r = window.__rekenraak;
                            const frame = () => new Promise((res) => requestAnimationFrame(res));
                            const emptyNow = () => {
                                const m = r.measured?.();
                                return !document.querySelector('[data-block-id]')
                                    && (!m || (Object.keys(m.cells).length === 0 && Object.keys(m.intrinsic).length === 0));
                            };
                            r.clearBlocks();
                            const t0c = performance.now();
                            while (!emptyNow() && performance.now() - t0c < 3000) await frame();
                            r.seed(seed);
                            r.addBlockFromType(leaf.typeId, leaf.label, leaf.defaultConstraints, { leafId: leaf.id });
                            const block = r.getState().blocks[0];
                            if (!block) return { error: 'no block produced' };
                            const snap = () => JSON.stringify({
                                z: [...document.querySelectorAll('[data-scaled-inner]')].map((el) => el.style.zoom),
                                m: r.measured?.(),
                            });
                            const settle = async () => {
                                let prev = snap(), stable = 0;
                                const t0 = performance.now();
                                while (stable < 2 && performance.now() - t0 < 3000) {
                                    await frame();
                                    const cur = snap();
                                    stable = cur === prev ? stable + 1 : 0;
                                    prev = cur;
                                }
                            };
                            r.updateBlockSettings(block.id, { widthUnits: width });
                            r.getState().setShowSolutions(!!solutions);
                            await settle();
                            const cell = document.querySelector(`[data-block-id="${block.id}"]`);
                            if (!cell) return { error: 'cell not found after render' };
                            return { cellHeightPx: cell.offsetHeight, settled: r.measured?.() };
                        }, { leaf, width, solutions, seed: SEED });
                        const after = await page.evaluate(() => window.__layoutEvents.filter((e) => e.msg.includes('repack loop broken')).length);
                        if (after > before) tripped++;
                        // The gate's retry decision reads the node-side list, not the page's.
                        if (!cellErrors.some((e) => e.includes('repack loop broken'))) break;
                    }
                    if (SHOTS && !measured.error) {
                        await page.evaluate((key) => { window.__cell = `${key}#shot`; window.__cellLog.push({ t: performance.now(), cell: window.__cell }); }, key);
                        try { await page.locator('[data-block-id]').first().screenshot({ path: join(OUT, 'shots', `${key}.png`) }); } catch { /* off-screen */ }
                    }
                    const gateTrip = cellErrors.some((e) => e.includes('repack loop broken'));
                    const base = baseline[key]?.cellHeightPx;
                    const dh = measured.cellHeightPx != null && base != null ? measured.cellHeightPx - base : null;
                    cells.push({
                        key, tripped, cellHeightPx: measured.cellHeightPx ?? null, baselinePx: base ?? null, dh,
                        heightFlag: dh != null && Math.abs(dh) > HEIGHT_DELTA_FLAG_PX, gateTrip, error: measured.error, settled: measured.settled,
                    });
                }
            }
        }
        const logs = await page.evaluate(() => ({ fonts: window.__fontEvents, layout: window.__layoutEvents, cellLog: window.__cellLog }));
        return { run, cells, ...logs };
    } finally {
        await browser.close();
    }
}

const fmtFaces = (faces) => faces.map(([fam, w, s, ur]) => `${fam} ${w}${s === 'normal' ? '' : ` ${s}`} [${ur.length > 40 ? `${ur.slice(0, 40)}…` : ur}]`).join('; ');

const results = [];
let totalTrips = 0;
try {
    for (let run = 1; run <= RUNS; run++) {
        const t = Date.now();
        const r = await walkOnce(run);
        results.push(r);
        const trips = r.layout.filter(isTrip);
        totalTrips += trips.length;
        // What visual-gate.mjs would flag: a breaker warning left in the row, or a height off baseline.
        const flagged = r.cells.filter((c) => c.heightFlag || c.gateTrip);
        const fontsDone = r.fonts.filter((f) => f.type === 'loadingdone');
        console.log(`run ${run}: ${trips.length} trip(s)${trips.length ? ` in ${trips.map((e) => e.cell).join(', ')}` : ''}; `
            + `${flagged.length} gate-flagged cell(s)${flagged.length ? ` ${flagged.map((c) => `${c.key} Δ${c.dh}${c.gateTrip ? ' (warning in row)' : ''}`).join(', ')}` : ''}; `
            + `${fontsDone.length} loadingdone [${((Date.now() - t) / 1000).toFixed(1)}s]`);
        for (const e of trips) console.log(`    ${e.cell}: ${e.msg}`);
        writeFileSync(join(OUT, 'runs.json'), JSON.stringify(results, null, 1));
        if (STOP_AFTER && totalTrips >= STOP_AFTER) break;
    }
} finally {
    server?.stop();
}

// One timeline per run: cell starts, font events and [layout] lines in page time.
const lines = [`# gate-flake repro: ${results.length} run(s), ${totalTrips} trip(s), ${ALL ? 'all leaves' : LEAVES.join(',')}${PREWARM ? ', prewarm' : ''}, seed ${SEED}, widths ${WIDTHS.join(',')}`, ''];
for (const r of results) {
    const trips = r.layout.filter(isTrip);
    lines.push(`## run ${r.run}: ${trips.length} trip(s), ${r.fonts.filter((f) => f.type === 'loadingdone').length} loadingdone event(s)`);
    const ev = [
        ...(trips.length ? r.cellLog.map((c) => ({ t: c.t, s: `cell   ${c.cell}` })) : []),
        ...r.fonts.map((f) => ({ t: f.t, s: `font   ${f.type} [during ${f.cell}]${f.freshFaces != null ? ` fresh=${f.freshFaces}/${f.faces.length} inSet=${f.inSet} set=${f.setSize} sheets=${f.styleSheets}` : ''} ${fmtFaces(f.faces)}` })),
        ...r.layout.map((e) => ({ t: e.t, s: `LAYOUT [${e.cell}] ${e.msg}${isTrip(e) ? `\n           intrinsic@trip ${JSON.stringify(e.measured?.intrinsic ?? null)}\n           cells@trip ${JSON.stringify(e.measured?.cells ?? null)}` : ''}` })),
    ].sort((a, b) => a.t - b.t);
    for (const e of ev) lines.push(`  ${e.t.toFixed(0).padStart(7)}ms ${e.s}`);
    for (const c of r.cells.filter((c) => c.tripped || c.heightFlag || c.gateTrip)) {
        lines.push(`  -> ${c.key}: tripped ${c.tripped}x, gate-flag ${c.heightFlag || c.gateTrip}, height ${c.cellHeightPx} vs baseline ${c.baselinePx}, settled intrinsic ${JSON.stringify(c.settled?.intrinsic ?? null)}`);
    }
    lines.push('');
}
const byCell = {};
for (const r of results) for (const e of r.layout.filter(isTrip)) byCell[e.cell] = (byCell[e.cell] ?? 0) + 1;
lines.push('## trips per cell', ...Object.entries(byCell).map(([k, n]) => `- ${k}: ${n}`));
writeFileSync(join(OUT, 'timeline.md'), lines.join('\n'));
console.log(`\n${totalTrips} trip(s) in ${results.length} run(s); per cell: ${JSON.stringify(byCell)}`);
console.log(`timeline: ${join(OUT, 'timeline.md')}`);
process.exit(totalTrips ? 1 : 0);
