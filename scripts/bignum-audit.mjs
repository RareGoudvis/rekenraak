// Big-number audit: does every exercise still fit its cell at the top of its own max list?
// The 1e9 line (numberRanges.ts) grows the max pickers of the arithmetic and getalbegrip
// families to 1 000 000 000, and a 13-character number is where fixed-px columns, centred
// labels and absolutely placed digits break. vitest cannot see that (jsdom has no layout),
// so this walks the real app like the visual gate does and measures every cell.
//
//   npm run bignum:audit                               # starts its own vite on --port (5194)
//   npm run bignum:audit -- --url http://localhost:5173/
//   npm run bignum:audit -- --only splitsen,plaatswaarde-tabel --seeds 1234
//   npm run bignum:audit -- --defaults                 # same leaves at their defaults (triage)
//
// Per leaf whose type declares `maxPresets`: the max key set to the top of the FORCED list
// (maxPresetsFor(…, force=true), so the grown lists are reached while BIG_NUMBERS_ENABLED is
// still off), plus the STRESS variants below, × widths {4,2,1} × solutions × seeds {1234,7}.
// The min-width clamp stays ON: it measures what a teacher gets after the packer widened
// the block. A cell FAILS on: `.cell-hoverflow-warn`, scaled-inner scrollWidth overflow,
// any content element > 1px outside the cell rect, "undefined"/"NaN" in its text, a
// console/page error, or the error-boundary text. Overlapping text inside one exercise is
// REPORTED, not failed. Not part of the pre-commit hook.
//
// Output (default ~/Downloads/bignum-audit/<timestamp>/): result.json, report.md,
// contact-sheet.html + contact-sheet.png (failing and overlapping cells), one PNG per such cell.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { walkLeaves } from './lib/leafWalk.mjs';
import { ERROR_BOUNDARY_TEXT } from './lib/visualCompare.mjs';

const ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (name) => argv.includes(`--${name}`);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const EXTERNAL_URL = arg('url', '');
const PORT = Number(arg('port', 5194));
// --seed n is accepted like the other harnesses; --seeds a,b runs several.
const SEEDS = arg('seeds', arg('seed', '1234,7')).split(',').map(Number);
const WIDTHS = arg('widths', '4,2,1').split(',').map(Number);
const ONLY = arg('only', '').split(',').filter(Boolean);
const DEFAULTS = has('defaults');
const NO_STRESS = has('no-stress');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = arg('out', join(homedir(), 'Downloads', 'bignum-audit', stamp));
mkdirSync(OUT, { recursive: true });

// Settings that widen an exercise the most, per sidebar leaf. Merged over the leaf's own
// defaults, THEN the max key is set to the forced top for those merged settings (×/:
// 'andere' only has a max list once the mode is set).
const STRESS = {
    'hr-std-optellen-nat': [{ tag: 'terms3', c: { termCount: 3 } }, { tag: 'terms4', c: { termCount: 4 } }],
    'hr-std-aftrekken-nat': [{ tag: 'terms3', c: { termCount: 3 } }, { tag: 'terms4', c: { termCount: 4 } }],
    'hr-std-vermenigvuldigen-nat': [{ tag: 'andere', c: { multiplicationMode: 'andere' } }],
    'hr-std-delen-nat': [{ tag: 'andere', c: { multiplicationMode: 'andere' } }],
    'hr-std-gemengd-nat': [
        { tag: 'ops4', c: { variants: ['+', '-', 'x', ':'] } },
        { tag: 'ops4-terms4', c: { variants: ['+', '-', 'x', ':'], termCount: 4 } },
    ],
    'cijferen-optellen-nat': [{ tag: 'terms4', c: { numberOfTerms: 4 } }, { tag: 'schatting', c: { withEstimation: true } }],
    'cijferen-aftrekken-nat': [{ tag: 'schatting', c: { withEstimation: true } }],
    'cijferen-vermenigvuldigen-nat': [{ tag: 'schatting', c: { withEstimation: true } }],
    'cijferen-delen-nat': [{ tag: 'schatting', c: { withEstimation: true } }, { tag: 'rest', c: { withRemainder: true } }],
    'splitsen-benen': [{ tag: 'beide', c: { benenVariants: ['legs-letters', 'legs-numbers'] } }],
    'splitsen-plaatswaarden': [{ tag: 'beide', c: { mathForms: ['letters', 'expanded'], mathDirection: 'beide' } }],
    'afronden-nat-rooster': [{ tag: 'rooster12', c: { roosterSize: 12 } }],
    'afronden-nat-simpel': [{ tag: 'THE', c: { roundTargets: ['T', 'H', 'E'] } }],
    'vergelijken-getallen': [{ tag: 'dec2', c: { decimalPlaces: 2 } }],
    'vergelijken-kiezen': [{ tag: 'set6', c: { setSize: 6 } }, { tag: 'set6-dec2', c: { setSize: 6, decimalPlaces: 2 } }],
    'plaatswaarde-waarde': [{ tag: 'dec3', c: { decimalPlaces: 3 } }],
    'plaatswaarde-plaats': [{ tag: 'dec3', c: { decimalPlaces: 3 } }],
    'plaatswaarde-omcirkelen': [{ tag: 'dec3', c: { decimalPlaces: 3 } }],
    'plaatswaarde-tabel': [{ tag: 'dec3', c: { decimalPlaces: 3 } }],
};

// ---------------------------------------------------------------- viewer names

// typeId -> the Viewer identifier its EXERCISE_UI row names, so the report groups by the
// file an agent has to open (several typeIds share MathBlockRenderer / CijferViewer).
function viewerByType() {
    const text = readFileSync(join(ROOT, 'src', 'config', 'exerciseUI.tsx'), 'utf8');
    const map = {};
    for (const m of text.matchAll(/^\s*'([\w-]+)':\s*\{([^}]*)\}/gm)) {
        const v = m[2].match(/Viewer:\s*(\w+)/)?.[1];
        if (v) map[m[1]] = v;
    }
    return map;
}
const VIEWERS = viewerByType();

// ---------------------------------------------------------------- dev server

let server = null;
function killServer() {
    if (!server || server.killed) return;
    try {
        if (process.platform === 'win32') execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: 'ignore' });
        else process.kill(-server.pid, 'SIGKILL');
    } catch { /* already gone */ }
    server = null;
}
process.on('exit', killServer);
process.on('SIGINT', () => { killServer(); process.exit(130); });
process.on('uncaughtException', (e) => { killServer(); console.error(e); process.exit(1); });

async function startServer() {
    const log = [];
    const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'],
        { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', d => log.push(String(d)));
    server.stderr.on('data', d => log.push(String(d)));
    const url = `http://localhost:${PORT}/`;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        try { if ((await fetch(url)).status === 200) return url; } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 500));
    }
    writeFileSync(join(OUT, 'vite.log'), log.join(''));
    killServer();
    throw new Error(`dev server did not answer on ${url} within 60s — see ${join(OUT, 'vite.log')}`);
}

// ---------------------------------------------------------------- per-leaf cells

async function overrideFor(leaf, page) {
    const top = async (constraints) => page.evaluate(({ typeId, c }) => {
        const r = window.__rekenraak.maxPresetsFor(typeId, c, true);
        return r && r.presets.length ? { key: r.key, top: Math.max(...r.presets) } : null;
    }, { typeId: leaf.typeId, c: constraints });

    const own = leaf.defaultConstraints ?? {};
    const base = await top(own);
    const stress = NO_STRESS || DEFAULTS ? [] : (STRESS[leaf.id] ?? []);
    // A leaf only enters the audit when its type has a max list somewhere (base or stressed).
    const cells = [];
    if (base) cells.push({ tag: DEFAULTS ? 'default' : 'top', constraints: DEFAULTS ? {} : { [base.key]: base.top } });
    for (const s of stress) {
        const merged = { ...own, ...s.c };
        const t = await top(merged);
        if (t) cells.push({ tag: s.tag, constraints: { ...s.c, [t.key]: t.top } });
    }
    return cells;
}

// Runs in the page after the cell settled: every fit measurement plus the overlap report.
async function probe(page) {
    return page.evaluate(() => {
        const cell = document.querySelector('[data-block-id]');
        if (!cell) return { probeError: 'no cell' };
        cell.scrollIntoView({ block: 'start' });
        const inner = cell.querySelector('[data-scaled-inner]');
        const cr = cell.getBoundingClientRect();
        const round = (n) => Math.round(n * 10) / 10;
        const describe = (el) => {
            const cls = typeof el.className === 'string' ? el.className : el.getAttribute?.('class') ?? '';
            const txt = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
            return `${el.tagName.toLowerCase()}${cls ? `.${cls.trim().split(/\s+/).join('.')}` : ''}${txt ? ` "${txt}"` : ''}`;
        };

        const warn = cell.querySelector('.cell-hoverflow-warn');
        const innerOverflowPx = inner ? inner.scrollWidth - inner.clientWidth : 0;

        // Visible part of an element: its rect cut by every ancestor (inside the inner) that
        // clips. An svg clips by default, so a label inside an svg can only escape as far
        // as the svg itself does.
        const clipOf = new Map();
        const visibleRect = (el) => {
            const r = el.getBoundingClientRect();
            const clip = clipOf.get(el.parentElement) ?? { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity };
            const box = { l: Math.max(r.left, clip.l), t: Math.max(r.top, clip.t), r: Math.min(r.right, clip.r), b: Math.min(r.bottom, clip.b) };
            const cs = getComputedStyle(el);
            let own = clip;
            if (cs.overflowX !== 'visible') own = { ...own, l: Math.max(own.l, r.left), r: Math.min(own.r, r.right) };
            if (cs.overflowY !== 'visible') own = { ...own, t: Math.max(own.t, r.top), b: Math.min(own.b, r.bottom) };
            clipOf.set(el, own);
            const hidden = cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0;
            return { box, hidden, empty: r.width === 0 && r.height === 0 };
        };

        const outside = [];
        let worst = 0, worstDir = '';
        const offenders = new Set();
        if (inner) {
            for (const el of inner.querySelectorAll('*')) {
                const { box, hidden, empty } = visibleRect(el);
                if (hidden || empty || box.r <= box.l || box.b <= box.t) continue;
                const over = { left: cr.left - box.l, right: box.r - cr.right, top: cr.top - box.t, bottom: box.b - cr.bottom };
                const [dir, px] = Object.entries(over).sort((a, b) => b[1] - a[1])[0];
                if (px <= 1) continue;
                offenders.add(el);
                if (px > worst) { worst = px; worstDir = dir; }
                // Outermost offenders only: a wide grid drags every child with it.
                if (!offenders.has(el.parentElement)) outside.push({ el: describe(el), dir, px: round(px) });
            }
        }

        // Text boxes, grouped per exercise (a grid item of a .print-row), for the overlap report.
        const groupOf = (node) => {
            let el = node.parentElement;
            while (el && el !== inner) {
                if (el.parentElement?.classList.contains('print-row')) return el;
                if (el.classList?.contains('print-row')) return el;
                el = el.parentElement;
            }
            return inner;
        };
        const boxes = [];
        if (inner) {
            const walker = document.createTreeWalker(inner, NodeFilter.SHOW_TEXT);
            for (let n = walker.nextNode(); n; n = walker.nextNode()) {
                if (!n.textContent.trim()) continue;
                const parent = n.parentElement;
                const cs = getComputedStyle(parent);
                if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
                const inSvg = parent instanceof SVGElement;
                const rects = inSvg ? [parent.getBoundingClientRect()] : (() => {
                    const range = document.createRange(); range.selectNodeContents(n);
                    return [...range.getClientRects()];
                })();
                for (const r of rects) if (r.width > 0 && r.height > 0) boxes.push({ n, g: groupOf(n), r, text: n.textContent.trim().slice(0, 24) });
            }
        }
        const overlaps = [];
        for (let i = 0; i < boxes.length && overlaps.length < 10; i++) {
            for (let j = i + 1; j < boxes.length && overlaps.length < 10; j++) {
                const a = boxes[i], b = boxes[j];
                if (a.n === b.n || a.g !== b.g) continue;
                const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
                const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
                if (w > 2 && h > 2) overlaps.push({ a: a.text, b: b.text, w: round(w), h: round(h) });
            }
        }

        return {
            effWidth: Number(cell.dataset.width) || null,
            cellWidthPx: round(cr.width),
            hoverflowWarn: warn ? warn.innerText.split('\n')[0] : null,
            innerOverflowPx,
            outsidePx: round(worst),
            outsideDir: worstDir,
            outside: outside.slice(0, 5),
            outsideCount: offenders.size,
            overlaps,
            // Read back so the verdict can prove the forced max reached the block unfloored.
            blockConstraints: window.__rekenraak.getState().blocks[0]?.constraints ?? null,
        };
    });
}

// ---------------------------------------------------------------- run

const t0 = Date.now();
const url = EXTERNAL_URL || await startServer();
const allRows = [];
try {
    for (const seed of SEEDS) {
        const out = join(OUT, `seed-${seed}`);
        let n = 0;
        const { rows } = await walkLeaves({
            url, out, widths: WIDTHS, seed, only: ONLY, screenshots: false, deselect: true,
            log: (s) => console.log(s),
            onRow: () => { if (++n % 50 === 0) console.log(`[bignum-audit] seed ${seed}: ${n} cells…`); },
            overrideFor, probe: (page, { key }) => probeAndShoot(page, out, `seed-${seed}`, key),
        });
        for (const r of rows) allRows.push({ ...r, seed });
    }
} finally {
    killServer();
}

// Screenshot only what a human has to look at: the cell plus whatever sticks out of it.
async function probeAndShoot(page, out, subdir, key) {
    const p = await probe(page);
    const bad = p.hoverflowWarn || p.innerOverflowPx > 1 || p.outsidePx > 1 || p.overlaps?.length;
    if (!bad) return p;
    const shot = `${key}.png`;
    try {
        const clip = await page.evaluate(() => {
            const cell = document.querySelector('[data-block-id]');
            const inner = cell.querySelector('[data-scaled-inner]') ?? cell;
            let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
            for (const el of [cell, ...inner.querySelectorAll('*')]) {
                const x = el.getBoundingClientRect();
                if (x.width === 0 && x.height === 0) continue;
                l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom);
            }
            const vw = window.innerWidth, vh = window.innerHeight;
            const x0 = Math.max(0, l - 12), y0 = Math.max(0, t - 12);
            return { x: x0, y: y0, width: Math.min(vw, r + 12) - x0, height: Math.min(vh, b + 12) - y0 };
        });
        if (clip.width > 0 && clip.height > 0) await page.screenshot({ path: join(out, shot), clip });
        return { ...p, shot: `${subdir}/${shot}` };
    } catch (e) {
        return { ...p, shotError: String(e).split('\n')[0] };
    }
}

// ---------------------------------------------------------------- verdict

const BAD_TEXT = /\bundefined\b|\bNaN\b/;
const results = allRows.map((r) => {
    const fails = [];
    if (r.error) fails.push({ kind: 'error', detail: r.error });
    if (r.consoleErrors?.length) fails.push({ kind: 'console', detail: r.consoleErrors[0].slice(0, 200) });
    if (r.text?.includes(ERROR_BOUNDARY_TEXT)) fails.push({ kind: 'boundary', detail: ERROR_BOUNDARY_TEXT });
    if (r.text && BAD_TEXT.test(r.text)) fails.push({ kind: 'text', detail: r.text.match(new RegExp(`.{0,30}(${BAD_TEXT.source}).{0,30}`))?.[0] ?? 'undefined/NaN' });
    if (r.hoverflowWarn) fails.push({ kind: 'hoverflow', px: Number(r.hoverflowWarn.match(/(\d+)px/)?.[1]) || null, detail: r.hoverflowWarn });
    if (r.innerOverflowPx > 1) fails.push({ kind: 'inner-scroll', px: r.innerOverflowPx });
    // The forced max must be what the block holds; anything else means the harness measured a smaller sheet.
    for (const [k, v] of Object.entries(r.constraints ?? {})) {
        if (/^(maxGetal|maxRange|maxNumber)$/.test(k) && r.blockConstraints && r.blockConstraints[k] !== v) fails.push({ kind: 'harness', detail: `${k} is ${r.blockConstraints[k]}, expected ${v}` });
    }
    if (r.outsidePx > 1) fails.push({ kind: 'outside', px: r.outsidePx, detail: `${r.outsideDir}; ${r.outside?.map(o => `${o.el} ${o.dir} ${o.px}px`).join(' | ')}` });
    return {
        viewer: VIEWERS[r.typeId] ?? r.typeId,
        leafId: r.leafId, variant: r.variant, typeId: r.typeId, width: r.width, effWidth: r.effWidth,
        solutions: r.solutions, seed: r.seed, constraints: r.constraints,
        cellHeightPx: r.cellHeightPx, cellWidthPx: r.cellWidthPx,
        fails, overlaps: r.overlaps ?? [], shot: r.shot,
        text: r.text?.slice(0, 400),
    };
});

const failing = results.filter(r => r.fails.length);
const overlapping = results.filter(r => r.overlaps.length);
const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);

writeFileSync(join(OUT, 'result.json'), JSON.stringify({
    url, seeds: SEEDS, widths: WIDTHS, defaults: DEFAULTS, elapsedS: Number(elapsedS),
    cells: results.length, failing: failing.length, overlapping: overlapping.length, results,
}, null, 1));

// Report grouped by viewer: the file the next agent opens. Cells that fail the same way at
// the same effective width collapse into one row (a w1 block the packer widened to 4 is the
// w4 cell again), so the list reads as work items, not as 1000 cells.
const cellName = (r) => `${r.leafId}${r.variant && r.variant !== 'top' && r.variant !== 'default' ? `~${r.variant}` : ''}`;
const sig = (r) => [
    ...r.fails.map(f => `${f.kind}${f.px != null ? ` ${Math.round(f.px)}px` : ''}${f.kind === 'outside' ? ` ${f.detail.split(';')[0]}` : ''}${['text', 'console', 'error', 'boundary', 'harness'].includes(f.kind) ? `: ${f.detail.slice(0, 90)}` : ''}`),
    ...(r.overlaps.length ? [`overlap ×${r.overlaps.length}`] : []),
].join(', ');
function groupRows(list) {
    const groups = new Map();
    for (const r of list) {
        const k = `${r.viewer}|${cellName(r)}|${r.effWidth}|${r.solutions}|${sig(r)}`;
        const g = groups.get(k) ?? { ...r, name: cellName(r), sig: sig(r), widths: new Set(), seeds: new Set() };
        g.widths.add(r.width); g.seeds.add(r.seed);
        if (!g.shot && r.shot) g.shot = r.shot;
        groups.set(k, g);
    }
    return [...groups.values()].sort((a, b) => a.viewer.localeCompare(b.viewer) || a.name.localeCompare(b.name) || b.effWidth - a.effWidth || a.solutions - b.solutions);
}
const failGroups = groupRows(failing);
const overlapOnly = groupRows(overlapping.filter(r => !r.fails.length));
const byViewer = new Map();
for (const g of failGroups) byViewer.set(g.viewer, [...(byViewer.get(g.viewer) ?? []), g]);
const wLabel = (g) => `${[...g.widths].sort((a, b) => b - a).join(',')} → ${g.effWidth ?? '?'}`;
const row = (g) => `| ${g.name} | ${wLabel(g)} | ${g.solutions} | ${[...g.seeds].join(',')} | ${g.sig.replace(/\|/g, '\\|')} |`;
const md = [
    '# Big-number audit', '',
    `${results.length} cells, ${failing.length} failing, ${overlapping.length} with overlapping text, ${elapsedS}s, seeds [${SEEDS.join(',')}], widths [${WIDTHS.join(',')}]${DEFAULTS ? ', leaf DEFAULTS (not the ceiling)' : ''}`,
    '', '`w a,b → eff`: the widths asked for, and the width the packer gave the block (min-width clamp on). Detail per cell: result.json.', '',
    ...[...byViewer.entries()].sort().flatMap(([viewer, list]) => [
        `## ${viewer}`, '',
        '| leaf | w → eff | sol | seeds | failure (px over) |',
        '|---|---|---|---|---|',
        ...list.map(row),
        '',
    ]),
    '## Overlapping text only (reported, not failed)', '',
    '| leaf | w → eff | sol | seeds | overlap |',
    '|---|---|---|---|---|',
    ...overlapOnly.map(g => `| ${g.name} | ${wLabel(g)} | ${g.solutions} | ${[...g.seeds].join(',')} | ${g.overlaps.slice(0, 3).map(o => `"${o.a}" × "${o.b}" (${o.w}×${o.h}px)`).join('; ').replace(/\|/g, '\\|')} |`),
].join('\n');
writeFileSync(join(OUT, 'report.md'), md);

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const card = (g) => `<div class="card ${g.fails.length ? 'fail' : 'warn'}"><h3>${esc(g.name)} — w${esc(wLabel(g))}, opl. ${g.solutions ? 'aan' : 'uit'}, seed ${[...g.seeds].join('/')}</h3>
<div class="why">${esc(g.sig)}${g.overlaps.length ? `<br><i>${esc(g.overlaps.slice(0, 2).map(o => `"${o.a}"×"${o.b}"`).join('; '))}</i>` : ''}</div>
${g.shot ? `<img src="${esc(g.shot)}">` : '<div class="noshot">(no screenshot)</div>'}</div>`;
const sheet = `<!doctype html><html><head><meta charset="utf-8"><title>Big-number audit</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f4f2;margin:0;padding:16px;color:#222}h1{font-size:16px}h2{font-size:14px;margin:20px 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px}
.card{background:#fff;border:1px solid #ddd;border-left:4px solid #b91c1c;border-radius:6px;padding:8px}.card.warn{border-left-color:#d97706}
.card h3{margin:0 0 4px;font-size:12px}.why{font-size:11px;color:#444;margin-bottom:6px}img{max-width:100%;border:1px solid #ccc}.noshot{font-size:11px;color:#999}</style></head><body>
<h1>${failing.length} failing, ${overlapping.length} overlapping of ${results.length} cells${DEFAULTS ? ' (leaf defaults)' : ''}</h1>
${[...byViewer.entries()].sort().map(([viewer, list]) => `<h2>${esc(viewer)}</h2><div class="grid">${list.map(card).join('\n')}</div>`).join('\n')}
<h2>Overlapping text only</h2><div class="grid">${overlapOnly.map(card).join('\n')}</div>
</body></html>`;
const sheetPath = join(OUT, 'contact-sheet.html');
writeFileSync(sheetPath, sheet);

if (failing.length || overlapping.length) {
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
        await page.goto(`file:///${sheetPath.replace(/\\/g, '/')}`);
        await page.screenshot({ path: join(OUT, 'contact-sheet.png'), fullPage: true });
    } catch (e) {
        console.error(`[bignum-audit] contact-sheet.png failed: ${e}`);
    } finally {
        await browser.close();
    }
}

console.log(`[bignum-audit] ${results.length} cells, ${failing.length} failing, ${overlapping.length} with overlapping text (${elapsedS}s)`);
for (const [viewer, list] of [...byViewer.entries()].sort()) {
    const leaves = [...new Set(list.map(g => g.name))];
    console.log(`  ${viewer}: ${leaves.slice(0, 8).join(', ')}${leaves.length > 8 ? ', …' : ''}`);
}
console.log(`  report: ${join(OUT, 'report.md')}`);
console.log(`  contact sheet: ${sheetPath}`);
process.exit(failing.length ? 1 : 0);
