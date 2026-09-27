// Full sweep: every exercise type × every setting the matrix test generates, in a real
// browser. generators.matrix.test.ts proves the generators survive every pairwise row of
// constraintSpace.ts; this renders those same rows (plus every sidebar leaf at its defaults
// and every type at the top of its max list) on the sheet and checks what a teacher sees.
//
//   npm run sweep                                    # starts its own vite on a free --port
//   npm run sweep -- --url http://localhost:5173/
//   npm run sweep -- --domain getallen,meet --out <dir> --resume
//   npm run sweep -- --only splitsen,klok-kloklezen --seeds 1234
//   npm run sweep -- --chunk 2/4 --out <dir> --resume
//   npm run sweep -- --report --out <dir>            # rebuild report + contact sheets only
//   npm run sweep -- --merge <dirA>,<dirB> --out <dir>  # one report over parallel runs' cells
//   npm run sweep -- --review-png --out <dir>        # + one PNG strip per type (solutions on, seed 1234)
//   npm run sweep -- --print                         # the print pass: one mixed sheet per domain → PDF
//
// Settings per typeId: each sidebar leaf at its defaults (as a sidebar click adds it), every
// pairwise row of constraintSpaceFor(typeId) over the registry defaults (the matrix's pass c,
// same helper, same cap), and the registry defaults with the max key at the top of
// maxPresetsFor(). Each × widths {4,2,1} × solutions {0,1} × seeds {1234,7}; min-width clamp
// ON (teacher view), selection cleared in the add's tick so the Inspector never touches the
// block before it is measured. Cell checks are bignum-audit's (scripts/lib/cellProbe.mjs).
//
// Output (--out, default ~/Downloads/full-sweep/<timestamp>/): cells.jsonl (one line per cell,
// what --resume reads), result.json, report.md (type → setting → failure), index.html + one
// contact sheet per type under sheets/, one screenshot per cell under shots/<typeId>/.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname, relative, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { createServer } from 'node:net';
import { walkLeaves } from './lib/leafWalk.mjs';
import { ERROR_BOUNDARY_TEXT } from './lib/visualCompare.mjs';
import { probeCell, shootCell } from './lib/cellProbe.mjs';

const ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = (name) => argv.includes(`--${name}`);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const EXTERNAL_URL = arg('url', '');
const PORT_ARG = arg('port', '');
const SEEDS = arg('seeds', arg('seed', '1234,7')).split(',').map(Number);
const WIDTHS = arg('widths', '4,2,1').split(',').map(Number);
const ONLY = arg('only', '').split(',').filter(Boolean);
// Substrings of the sidebar domain label, comma-separated ("getallen,meet").
const DOMAINS = arg('domain', '').toLowerCase().split(',').filter(Boolean);
const inDomain = (d) => !DOMAINS.length || DOMAINS.some(x => d.toLowerCase().includes(x));
const [CHUNK_I, CHUNK_N] = (arg('chunk', '1/1')).split('/').map(Number);
const RESUME = has('resume');
const REPORT_ONLY = has('report');
const REVIEW_PNG = has('review-png');
// --review-kind leaf,max: strips of only the one-click settings (sidebar defaults, max top) → review-<kinds>/.
const REVIEW_KINDS = arg('review-kind', '').split(',').filter(Boolean);
const PRINT = has('print');
// Output dirs of runs made in parallel (one process per domain); their cells.jsonl are joined
// into --out/cells.jsonl with the screenshot paths made relative to --out.
const MERGE = arg('merge', '').split(',').filter(Boolean).map(d => pathResolve(d));
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = pathResolve(arg('out', join(homedir(), 'Downloads', 'full-sweep', stamp)));
const JSONL = join(OUT, 'cells.jsonl');
const PLAN = join(OUT, 'plan.json');
mkdirSync(OUT, { recursive: true });

// SYNC: PAIRWISE_CAP in src/__tests__/generators.matrix.test.ts — the same rows the matrix runs.
const PAIRWISE_CAP = 200;
// Tall enough that a block of more than one A4 page still screenshots whole; the width keeps
// sheetZoom at 1 like every other harness.
const VIEWPORT = { width: 1600, height: 2600 };

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

const portFree = (port) => new Promise((res) => {
    const s = createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true)));
    s.listen(port, '127.0.0.1');
});
async function freePort() {
    if (PORT_ARG) return Number(PORT_ARG);
    // 5330+ stays clear of the dev server (5173), the gate (5299) and bignum-audit (5194).
    for (let p = 5330; p < 5400; p++) if (await portFree(p)) return p;
    throw new Error('no free port in 5330-5399');
}

async function startServer() {
    const port = await freePort();
    const log = [];
    const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    server = spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort'],
        { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', d => log.push(String(d)));
    server.stderr.on('data', d => log.push(String(d)));
    const url = `http://localhost:${port}/`;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        try { if ((await fetch(url)).status === 200) return url; } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 500));
    }
    writeFileSync(join(OUT, 'vite.log'), log.join(''));
    killServer();
    throw new Error(`dev server did not answer on ${url} within 60s — see ${join(OUT, 'vite.log')}`);
}

async function openApp(browser, url) {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.goto(url);
    await page.waitForFunction(() => !!window.__rekenraak);
    await page.evaluate(() => { try { localStorage.setItem('rekenraak_tour_seen_v1', '1'); } catch { /* ignore */ } });
    await page.reload();
    await page.waitForFunction(() => !!window.__rekenraak);
    return page;
}

// ---------------------------------------------------------------- the plan

// The leaves, and per typeId its pairwise rows and max top — built in the page from the
// app's own modules (Vite serves src/ as-is), so the rows are the matrix's rows exactly.
async function buildPlan(url) {
    const browser = await chromium.launch();
    try {
        const page = await openApp(browser, url);
        return await page.evaluate(async (cap) => {
            const r = window.__rekenraak;
            const [{ constraintSpaceFor }, { pairwise }, { REGISTRY }] = await Promise.all([
                import('/src/config/constraintSpace.ts'),
                import('/src/__tests__/helpers/pairwise.ts'),
                import('/src/config/exerciseRegistry.ts'),
            ]);
            const types = {};
            for (const [typeId, def] of Object.entries(REGISTRY)) {
                const top = r.maxPresetsFor(typeId, {});
                types[typeId] = {
                    exerciseField: def.exerciseField,
                    furniture: !!def.isFurniture,
                    pairwise: def.isFurniture ? [] : pairwise(constraintSpaceFor(typeId), cap),
                    max: top && top.presets.length ? { key: top.key, top: Math.max(...top.presets) } : null,
                };
            }
            const leaves = r.leaves.map(l => ({ id: l.id, typeId: l.typeId, label: l.label, path: l.path, defaultConstraints: l.defaultConstraints ?? {} }));
            return { leaves, types };
        }, PAIRWISE_CAP);
    } finally {
        await browser.close();
    }
}

const domainOf = (leaf) => leaf.path.split(' › ')[0];

// One "setting" = one row of a contact sheet: a leaf at its defaults, or a type-level case
// (pairwise row / max top) hung on the type's first leaf so leafWalk can walk it.
function settingsOf(plan) {
    const settings = [];
    const ownerDone = new Set();
    for (const leaf of plan.leaves) {
        const t = plan.types[leaf.typeId];
        const common = { leafId: leaf.id, typeId: leaf.typeId, domain: domainOf(leaf), furniture: !!t?.furniture, exerciseField: t?.exerciseField };
        settings.push({ ...common, kind: 'leaf', tag: 'default', constraints: {} });
        if (!t || ownerDone.has(leaf.typeId)) continue;
        ownerDone.add(leaf.typeId);
        t.pairwise.forEach((row, i) => settings.push({ ...common, kind: 'pair', tag: `pw${String(i + 1).padStart(3, '0')}`, constraints: row, replace: true }));
        if (t.max) settings.push({ ...common, kind: 'max', tag: 'max', constraints: { [t.max.key]: t.max.top }, replace: true });
    }
    const orphans = Object.keys(plan.types).filter(t => !ownerDone.has(t) && !plan.types[t].furniture);
    return { settings, orphans };
}

function selectSettings(all) {
    let list = all;
    if (DOMAINS.length) list = list.filter(s => inDomain(s.domain));
    if (ONLY.length) list = list.filter(s => ONLY.includes(s.typeId) || ONLY.includes(s.leafId));
    if (CHUNK_N > 1) {
        const size = Math.ceil(list.length / CHUNK_N);
        list = list.slice((CHUNK_I - 1) * size, CHUNK_I * size);
    }
    return list;
}

const keyOf = (s, width, solutions) => `${s.leafId}~${s.tag}-w${width}-s${solutions}`;

// ---------------------------------------------------------------- cells.jsonl

function readCells() {
    const byKey = new Map();
    if (!existsSync(JSONL)) return byKey;
    for (const line of readFileSync(JSONL, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        try { const r = JSON.parse(line); byKey.set(`${r.seed}|${r.key}`, r); } catch { /* torn last line after a crash */ }
    }
    return byKey;
}

// A browser that died takes every later cell with it: those rows are not results.
const CRASH = /Target (page, context or browser )?(has been )?closed|Browser has been closed|crashed|Protocol error/i;

// ---------------------------------------------------------------- the run

async function sweep(url, plan, settings) {
    const done = RESUME ? readCells() : new Map();
    if (!RESUME && existsSync(JSONL)) throw new Error(`${JSONL} exists — pass --resume to continue it, or a new --out`);
    const bySettingKey = new Map(settings.map(s => [`${s.leafId}~${s.tag}`, s]));
    const perLeaf = new Map();
    for (const s of settings) perLeaf.set(s.leafId, [...(perLeaf.get(s.leafId) ?? []), s]);
    const total = settings.length * WIDTHS.length * 2 * SEEDS.length;
    let count = [...done.keys()].filter(k => { const [seed, key] = k.split('|'); return SEEDS.includes(Number(seed)) && bySettingKey.has(key.replace(/-w\d+-s\d$/, '')); }).length;
    const t0 = Date.now(); let fresh = 0;
    console.log(`[sweep] ${settings.length} settings → ${total} cells (${count} already in ${JSONL})`);

    for (const seed of SEEDS) {
        for (let attempt = 0; attempt < 6; attempt++) {
            try {
                await walkLeaves({
                    url, out: OUT, widths: WIDTHS, seed, only: [...perLeaf.keys()], screenshots: false,
                    deselect: true, sidebarOpts: true, viewport: VIEWPORT,
                    skip: (key) => done.has(`${seed}|${key}`),
                    log: (s) => console.log(s),
                    overrideFor: (leaf) => (perLeaf.get(leaf.id) ?? []).map(s => ({ tag: s.tag, constraints: s.constraints, replace: !!s.replace })),
                    probe: (page, { key }) => probe(page, key, seed, bySettingKey.get(key.replace(/-w\d+-s\d$/, ''))),
                    onRow: (row) => {
                        if (row.error && CRASH.test(row.error)) throw new Error(`browser lost at ${row.leafId}: ${row.error}`);
                        const s = bySettingKey.get(`${row.leafId}~${row.variant}`);
                        const rec = compact(row, s, seed);
                        appendFileSync(JSONL, JSON.stringify(rec) + '\n');
                        done.set(`${seed}|${rec.key}`, rec);
                        count++; fresh++;
                        if (fresh % 100 === 0) {
                            const rate = fresh / ((Date.now() - t0) / 1000);
                            console.log(`[sweep] ${count}/${total} cells, ${rate.toFixed(1)}/s, ~${Math.round((total - count) / rate / 60)} min left`);
                        }
                    },
                });
                break;
            } catch (e) {
                console.error(`[sweep] seed ${seed}: walk aborted (${String(e).split('\n')[0]}), restarting where it stopped`);
                if (attempt === 5) throw e;
            }
        }
    }
    return (Date.now() - t0) / 1000;
}

async function probe(page, key, seed, s) {
    const p = await probeCell(page);
    const extra = await page.evaluate((field) => {
        const b = window.__rekenraak.getState().blocks[0];
        const warn = document.querySelector('.page-sheet-warn');
        const body = document.querySelector('.page-sheet-body');
        const cell = document.querySelector('[data-block-id]');
        const items = field && b ? b[field] : null;
        return {
            note: b?.generationNote ?? null,
            exCount: Array.isArray(items) ? items.length : null,
            wanted: b?.numberOfExercises ?? null,
            pages: document.querySelectorAll('.page-sheet').length,
            pageWarn: warn ? warn.innerText.split('\n')[0] : null,
            bodyH: body?.clientHeight ?? null,
            ownH: cell?.offsetHeight ?? null,
            instruction: b?.instructionText ?? null,
        };
    }, s?.exerciseField ?? null);
    const dir = join(OUT, 'shots', s?.typeId ?? 'unknown');
    mkdirSync(dir, { recursive: true });
    const file = `${key}-seed${seed}.png`;
    try {
        await shootCell(page, dir, file);
        return { ...p, ...extra, shot: `shots/${s?.typeId ?? 'unknown'}/${file}` };
    } catch (e) {
        return { ...p, ...extra, shotError: String(e).split('\n')[0] };
    }
}

// What cells.jsonl keeps per cell: the numbers the verdict needs, not the 100 KB DOM text.
function compact(row, s, seed) {
    const key = `${row.leafId}~${row.variant}-w${row.width}-s${row.solutions}`;
    return {
        key, seed, leafId: row.leafId, typeId: row.typeId, domain: s?.domain, kind: s?.kind, tag: row.variant,
        setting: s?.constraints ?? {}, furniture: !!s?.furniture,
        width: row.width, solutions: row.solutions, effWidth: row.effWidth ?? null,
        error: row.error ?? null, consoleErrors: row.consoleErrors ?? [],
        hoverflowWarn: row.hoverflowWarn ?? null, innerOverflowPx: row.innerOverflowPx ?? 0,
        outsidePx: row.outsidePx ?? 0, outsideDir: row.outsideDir ?? '', outside: row.outside ?? [],
        overlaps: row.overlaps ?? [], blockConstraints: s?.kind === 'max' ? pickMax(row.blockConstraints) : undefined,
        note: row.note ?? null, exCount: row.exCount ?? null, wanted: row.wanted ?? null,
        pages: row.pages ?? null, pageWarn: row.pageWarn ?? null, bodyH: row.bodyH ?? null, ownH: row.ownH ?? null,
        cellHeightPx: row.cellHeightPx ?? null, instruction: row.instruction ?? null,
        badText: badText(row.text), boundary: !!row.text?.includes(ERROR_BOUNDARY_TEXT),
        textLen: row.text?.length ?? 0,
        shot: row.shot ?? null, shotError: row.shotError ?? null,
    };
}
const pickMax = (c) => c ? Object.fromEntries(Object.entries(c).filter(([k]) => /^(maxGetal|maxRange|maxNumber|max)$/.test(k) || /max/i.test(k))) : null;
const BAD_TEXT = /\bundefined\b|\bNaN\b/;
const badText = (t) => (t && BAD_TEXT.test(t)) ? (t.match(new RegExp(`.{0,30}(${BAD_TEXT.source}).{0,30}`))?.[0] ?? 'undefined/NaN') : null;

// ---------------------------------------------------------------- verdict

// FAIL: what a teacher can see is broken. REPORT: worth a look, not necessarily wrong.
function verdict(r) {
    const fails = [], reports = [];
    if (r.error) fails.push({ kind: 'error', detail: r.error.slice(0, 200) });
    if (r.consoleErrors?.length) fails.push({ kind: 'console', detail: r.consoleErrors[0].slice(0, 200) });
    if (r.boundary) fails.push({ kind: 'boundary', detail: ERROR_BOUNDARY_TEXT });
    if (r.badText) fails.push({ kind: 'text', detail: r.badText });
    if (r.hoverflowWarn) fails.push({ kind: 'hoverflow', px: Number(r.hoverflowWarn.match(/(\d+)px/)?.[1]) || null, detail: r.hoverflowWarn });
    if (r.innerOverflowPx > 1) fails.push({ kind: 'inner-scroll', px: r.innerOverflowPx });
    if (r.outsidePx > 1) fails.push({ kind: 'outside', px: r.outsidePx, detail: `${r.outsideDir}; ${r.outside?.map(o => `${o.el} ${o.dir} ${o.px}px`).join(' | ')}` });
    if (r.kind === 'max' && r.blockConstraints) {
        for (const [k, v] of Object.entries(r.setting)) if (k in r.blockConstraints && r.blockConstraints[k] !== v) fails.push({ kind: 'harness', detail: `${k} is ${r.blockConstraints[k]}, expected ${v}` });
    }
    const tall = r.ownH != null && r.bodyH != null && r.ownH > r.bodyH + 2;
    if (r.pageWarn) {
        // A single block only overflows its page when it is taller than the page; anything else
        // is the packer and the paper disagreeing. A sidebar leaf's defaults at full width must fit
        // one page (the teacher has no wider option); a narrowed one may legitimately grow past it.
        if (!tall || (r.kind === 'leaf' && r.effWidth === 4)) fails.push({ kind: 'page-overflow', detail: r.pageWarn });
        else reports.push({ kind: 'tall', detail: `${r.ownH}px > page body ${r.bodyH}px` });
    } else if (tall) reports.push({ kind: 'tall', detail: `${r.ownH}px > page body ${r.bodyH}px (no banner)` });
    const empty = !r.furniture && !r.error && r.exCount === 0;
    if (empty && !r.note) fails.push({ kind: 'empty', detail: 'no exercises and no generation note' });
    if (r.note) reports.push({ kind: empty ? 'empty-noted' : 'note', detail: r.note.slice(0, 160) });
    if (r.overlaps?.length) reports.push({ kind: 'overlap', detail: r.overlaps.slice(0, 3).map(o => `"${o.a}"×"${o.b}" (${o.w}×${o.h})`).join('; ') });
    return { fails, reports };
}

// ---------------------------------------------------------------- outputs

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pngSize = (file) => {
    try {
        const fd = openSync(file, 'r'); const b = Buffer.alloc(24); readSync(fd, b, 0, 24, 0); closeSync(fd);
        return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    } catch { return null; }
};
const settingLabel = (r) => r.kind === 'leaf' ? `${r.leafId} (defaults)` : r.kind === 'max' ? `${r.typeId} max ${JSON.stringify(r.setting)}` : `${r.typeId} ${r.tag}`;
const COLS = WIDTHS.flatMap(w => [0, 1].map(s => ({ w, s })));

function writeOutputs(elapsedS) {
    const cells = [...readCells().values()].map(r => ({ ...r, ...verdict(r) }));
    const failing = cells.filter(c => c.fails.length);
    const byKind = {}, repKind = {};
    for (const c of cells) {
        for (const k of new Set(c.fails.map(f => f.kind))) byKind[k] = (byKind[k] ?? 0) + 1;
        for (const k of new Set(c.reports.map(f => f.kind))) repKind[k] = (repKind[k] ?? 0) + 1;
    }
    const types = [...new Set(cells.map(c => c.typeId))].sort();
    const perType = types.map(t => {
        const list = cells.filter(c => c.typeId === t);
        return { typeId: t, domain: list[0].domain, cells: list.length, failing: list.filter(c => c.fails.length).length, reported: list.filter(c => c.reports.length).length, settings: new Set(list.map(c => `${c.leafId}~${c.tag}`)).size };
    });

    writeFileSync(join(OUT, 'result.json'), JSON.stringify({
        seeds: SEEDS, widths: WIDTHS, elapsedS, cells: cells.length, failing: failing.length,
        failuresByKind: byKind, reportsByKind: repKind, perType, results: cells,
    }, null, 1));

    // report.md: type → setting → failure, identical failures across widths/seeds collapsed.
    const sig = (f) => `${f.kind}${f.px != null ? ` ${Math.round(f.px)}px` : ''}${f.detail && f.kind !== 'hoverflow' ? `: ${String(f.detail).slice(0, 110)}` : ''}`;
    const md = ['# Full sweep', '',
        `${cells.length} cells, ${failing.length} failing, ${elapsedS != null ? `${Math.round(elapsedS)}s this run, ` : ''}seeds [${SEEDS.join(',')}], widths [${WIDTHS.join(',')}]`, '',
        `Failures by kind (cells): ${Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}`,
        `Reported (cells): ${Object.entries(repKind).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}`, '',
        '`w a → eff`: the width asked for and the width the packer gave the block (min-width clamp on).', '',
        '| type | domain | settings | cells | failing | reported |', '|---|---|---|---|---|---|',
        ...perType.map(p => `| ${p.typeId} | ${p.domain} | ${p.settings} | ${p.cells} | ${p.failing} | ${p.reported} |`), ''];
    for (const t of types) {
        const list = cells.filter(c => c.typeId === t && c.fails.length);
        if (!list.length) continue;
        md.push(`## ${t}`, '');
        const bySetting = new Map();
        for (const c of list) bySetting.set(`${c.leafId}~${c.tag}`, [...(bySetting.get(`${c.leafId}~${c.tag}`) ?? []), c]);
        for (const [, group] of bySetting) {
            const c0 = group[0];
            md.push(`### ${settingLabel(c0)}`, c0.kind === 'leaf' ? '' : `\`${JSON.stringify(c0.setting)}\``, '');
            const bySig = new Map();
            for (const c of group) for (const f of c.fails) {
                const k = sig(f);
                const e = bySig.get(k) ?? { cells: [], shot: c.shot };
                e.cells.push(`w${c.width}→${c.effWidth ?? '?'} s${c.solutions} #${c.seed}`);
                bySig.set(k, e);
            }
            for (const [k, e] of bySig) md.push(`- **${k.replace(/\|/g, '\\|')}** — ${e.cells.join(', ')}${e.shot ? ` — [shot](${e.shot})` : ''}`);
            md.push('');
        }
    }
    const reportedOnly = cells.filter(c => !c.fails.length && c.reports.length);
    md.push('## Reported only (not failed)', '', '| type | setting | kind | cells | example |', '|---|---|---|---|---|');
    const repGroups = new Map();
    for (const c of reportedOnly) for (const r of c.reports) {
        const k = `${c.typeId}|${settingLabel(c)}|${r.kind}`;
        const g = repGroups.get(k) ?? { n: 0, detail: r.detail };
        g.n++; repGroups.set(k, g);
    }
    for (const [k, g] of repGroups) { const [t, s, kind] = k.split('|'); md.push(`| ${t} | ${s} | ${kind} | ${g.n} | ${esc(g.detail).replace(/\|/g, '\\|').slice(0, 120)} |`); }
    writeFileSync(join(OUT, 'report.md'), md.join('\n'));

    // Contact sheets: one per type, rows = setting × seed, columns = width × solutions.
    mkdirSync(join(OUT, 'sheets'), { recursive: true });
    const css = `body{font-family:system-ui,sans-serif;background:#f4f4f2;margin:0;padding:12px;color:#222}h1{font-size:16px;margin:0 0 8px}
table{border-collapse:collapse}td,th{vertical-align:top;padding:4px;border-bottom:1px solid #ddd}th{font-size:11px;text-align:left;position:sticky;top:0;background:#f4f4f2}
td.lab{font-size:11px;max-width:220px;word-break:break-word}td.lab code{font-size:10px;color:#555}
.c{display:inline-block;border:3px solid transparent;background:#fff}.c.fail{border-color:#b91c1c}.c.rep{border-color:#d97706}
.c img{display:block}.why{font-size:10px;color:#b91c1c;max-width:360px}.rep .why{color:#92400e}.meta{font-size:10px;color:#666}`;
    const scale = Number(arg('scale', '0.6'));
    const cellHtml = (c) => {
        if (!c) return '<td></td>';
        const cls = c.fails.length ? 'fail' : c.reports.length ? 'rep' : '';
        const size = c.shot ? pngSize(join(OUT, c.shot)) : null;
        const img = c.shot ? `<img loading="lazy" src="../${esc(c.shot)}"${size ? ` width="${Math.round(size.w * scale)}" height="${Math.round(size.h * scale)}"` : ''}>` : `<div class="why">${esc(c.error ?? c.shotError ?? 'no screenshot')}</div>`;
        const why = [...c.fails, ...c.reports].map(f => `${f.kind}${f.px != null ? ` ${Math.round(f.px)}px` : ''}`).join(', ');
        return `<td><div class="c ${cls}" title="${esc([...c.fails, ...c.reports].map(f => `${f.kind}: ${f.detail ?? ''}`).join('\n'))}">${img}</div><div class="meta">eff ${c.effWidth ?? '?'}${c.note ? ' · note' : ''}</div>${why ? `<div class="why">${esc(why)}</div>` : ''}</td>`;
    };
    const index = [];
    for (const t of types) {
        const list = cells.filter(c => c.typeId === t);
        const rows = new Map();
        for (const c of list) {
            const k = `${c.leafId}~${c.tag}|${c.seed}`;
            const e = rows.get(k) ?? { c0: c, seed: c.seed, cells: {} };
            e.cells[`${c.width}-${c.solutions}`] = c;
            rows.set(k, e);
        }
        const order = [...rows.values()].sort((a, b) => (a.c0.kind === 'leaf' ? 0 : a.c0.kind === 'pair' ? 1 : 2) - (b.c0.kind === 'leaf' ? 0 : b.c0.kind === 'pair' ? 1 : 2)
            || `${a.c0.leafId}${a.c0.tag}`.localeCompare(`${b.c0.leafId}${b.c0.tag}`) || a.seed - b.seed);
        const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t)} — full sweep</title><style>${css}</style></head><body>
<h1>${esc(t)} — ${list.length} cells, ${list.filter(c => c.fails.length).length} failing (red), ${list.filter(c => !c.fails.length && c.reports.length).length} reported (amber)</h1>
<table><tr><th>setting · seed</th>${COLS.map(c => `<th>w${c.w} ${c.s ? 'opl. aan' : 'opl. uit'}</th>`).join('')}</tr>
${order.map(e => `<tr><td class="lab"><b>${esc(settingLabel(e.c0))}</b> · #${e.seed}${e.c0.kind === 'leaf' ? '' : `<br><code>${esc(JSON.stringify(e.c0.setting))}</code>`}${e.c0.instruction ? `<br><i>${esc(e.c0.instruction)}</i>` : ''}</td>${COLS.map(c => cellHtml(e.cells[`${c.w}-${c.s}`])).join('')}</tr>`).join('\n')}
</table></body></html>`;
        writeFileSync(join(OUT, 'sheets', `${t}.html`), html);
        const p = perType.find(x => x.typeId === t);
        index.push(`<tr><td>${esc(p.domain)}</td><td><a href="sheets/${esc(t)}.html">${esc(t)}</a></td><td>${p.settings}</td><td>${p.cells}</td><td${p.failing ? ' style="color:#b91c1c;font-weight:600"' : ''}>${p.failing}</td><td>${p.reported}</td></tr>`);
    }
    writeFileSync(join(OUT, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Full sweep</title><style>${css}td{font-size:12px}</style></head><body>
<h1>Full sweep — ${cells.length} cells, ${failing.length} failing</h1><p class="meta">Failures: ${esc(Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none')} — Reported: ${esc(Object.entries(repKind).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none')} — <a href="report.md">report.md</a></p>
<table><tr><th>domain</th><th>type</th><th>settings</th><th>cells</th><th>failing</th><th>reported</th></tr>${index.join('\n')}</table></body></html>`);
    return { cells: cells.length, failing: failing.length, byKind, repKind, perType };
}

// One PNG strip per type for a reviewer who reads images, not HTML: solutions on (it shows
// everything "off" shows plus the answers), seed SEEDS[0], all widths side by side.
// Three full-width cells (3 x 700px at 0.65) side by side.
const REVIEW_W = 1420;
async function reviewPngs() {
    const cells = [...readCells().values()].filter(c => c.solutions === 1 && c.seed === SEEDS[0] && c.shot && (!REVIEW_KINDS.length || REVIEW_KINDS.includes(c.kind)));
    const dir = join(OUT, REVIEW_KINDS.length ? `review-${REVIEW_KINDS.join('-')}` : 'review'); mkdirSync(dir, { recursive: true });
    const types = [...new Set(cells.map(c => c.typeId))].sort();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: REVIEW_W, height: 1000 } });
    const scale = 0.65;
    try {
        for (const t of types) {
            const list = cells.filter(c => c.typeId === t).map(c => ({ ...c, ...verdict(c) }));
            const rows = new Map();
            for (const c of list) { const k = `${c.leafId}~${c.tag}`; const e = rows.get(k) ?? { c0: c, cells: {} }; e.cells[c.width] = c; rows.set(k, e); }
            const blocks = [...rows.values()].map(e => {
                const imgs = WIDTHS.map(w => {
                    const c = e.cells[w]; if (!c) return '<div></div>';
                    const size = pngSize(join(OUT, c.shot));
                    const bad = c.fails.length ? '#b91c1c' : c.reports.length ? '#d97706' : '#ccc';
                    return `<div><div style="font-size:11px">w${w}→${c.effWidth ?? '?'} ${esc([...c.fails, ...c.reports].map(f => f.kind).join(','))}</div><img src="file:///${join(OUT, c.shot).replace(/\\/g, '/')}" style="border:2px solid ${bad};${size ? `width:${Math.round(size.w * scale)}px` : ''}"></div>`;
                }).join('');
                return `<div class="row"><div class="lab">${esc(settingLabel(e.c0))}${e.c0.kind === 'leaf' ? '' : ` ${esc(JSON.stringify(e.c0.setting)).slice(0, 400)}`}</div><div class="imgs">${imgs}</div></div>`;
            });
            const tmp = join(dir, `_${t}.html`);
            writeFileSync(tmp, `<html><body style="margin:0;padding:8px;font-family:system-ui;background:#fff"><style>.row{border-top:2px solid #333;padding:4px 0 8px}.lab{font-size:12px;font-weight:600;margin-bottom:3px}.imgs{display:flex;gap:10px;align-items:flex-start}img{display:block}</style>${blocks.join('')}</body></html>`);
            await page.goto(`file:///${tmp.replace(/\\/g, '/')}`, { waitUntil: 'load' });
            // Cut the page at row boundaries into strips of at most ~2400px.
            const tops = await page.evaluate(() => [...document.querySelectorAll('.row')].map(r => ({ y: r.offsetTop, h: r.offsetHeight })));
            let start = 0, n = 0;
            const flush = async (from, to) => {
                if (to <= from) return;
                n++; await page.screenshot({ path: join(dir, `${t}-${String(n).padStart(2, '0')}.png`), fullPage: true, clip: { x: 0, y: from, width: REVIEW_W, height: to - from } });
            };
            let cur = tops[0]?.y ?? 0;
            for (const r of tops) {
                if (r.y + r.h - cur > 2400 && r.y > cur) { await flush(cur, r.y); cur = r.y; }
                start = r.y + r.h;
            }
            await flush(cur, start);
            console.log(`[sweep] review ${t}: ${n} strip(s)`);
        }
    } finally {
        await browser.close();
    }
}

// ---------------------------------------------------------------- print pass

// Per domain one mixed sheet (a few leaves at their defaults + one at its max top), laid out
// by the real packer, then printed through Chromium's print path with margins none. Screen and
// print must agree on the page count and on which block sits on which page, in which order.
async function printPass(url, plan) {
    const dir = join(OUT, 'print'); mkdirSync(dir, { recursive: true });
    const perDomain = Number(arg('per-domain', '6'));
    const domains = [...new Set(plan.leaves.map(domainOf))].filter(inDomain);
    const browser = await chromium.launch();
    const results = [];
    try {
        for (const domain of domains) {
            const page = await openApp(browser, url);
            const errors = [];
            page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
            page.on('pageerror', (e) => errors.push(String(e)));
            const leaves = plan.leaves.filter(l => domainOf(l) === domain);
            const step = Math.max(1, Math.floor(leaves.length / perDomain));
            const picked = leaves.filter((_, i) => i % step === 0).slice(0, perDomain);
            const maxLeaf = leaves.find(l => plan.types[l.typeId]?.max);
            const specs = picked.map(l => ({ leafId: l.id, typeId: l.typeId, label: l.label, constraints: l.defaultConstraints, top: false }));
            if (maxLeaf) specs.push({ leafId: maxLeaf.id, typeId: maxLeaf.typeId, label: maxLeaf.label, constraints: maxLeaf.defaultConstraints, top: true });
            const layout = (media) => page.evaluate(() => [...document.querySelectorAll('.page-sheet')].map(ps => {
                const pr = ps.getBoundingClientRect();
                const cells = [...ps.querySelectorAll('[data-block-id]')].map(c => ({ id: c.dataset.blockId, r: c.getBoundingClientRect() }))
                    .sort((a, b) => a.r.top - b.r.top || a.r.left - b.r.left);
                return {
                    h: Math.round(pr.height), ids: cells.map(c => c.id),
                    outside: cells.filter(c => c.r.bottom > pr.bottom + 1 || c.r.top < pr.top - 1).map(c => c.id),
                };
            }));
            await page.evaluate(async (specs) => {
                const r = window.__rekenraak;
                r.clearBlocks(); r.seed(1234);
                for (const s of specs) {
                    let c = s.constraints ?? {};
                    if (s.top) { const m = r.maxPresetsFor(s.typeId, c); if (m?.presets.length) c = { ...c, [m.key]: Math.max(...m.presets) }; }
                    const own = r.leaves.find(l => l.id === s.leafId);
                    r.addBlockFromType(s.typeId, s.label, c, { leafId: s.leafId, instruction: own?.instruction });
                    r.getState().setActiveSelection(null);
                }
                r.getState().setShowSolutions(false);
                // Settle: the measurer's snapshot unchanged for 10 frames (repacks cascade block by block).
                const frame = () => new Promise(res => requestAnimationFrame(res));
                let prev = '', stable = 0; const t0 = performance.now();
                while (stable < 10 && performance.now() - t0 < 8000) { await frame(); const cur = JSON.stringify(r.measured?.()); stable = cur === prev ? stable + 1 : 0; prev = cur; }
            }, specs);
            await page.waitForTimeout(500);
            const screen = await layout();
            const blocks = await page.evaluate(() => window.__rekenraak.getState().blocks.map(b => ({ id: b.id, typeId: b.typeId, w: b.widthUnits ?? null })));
            // The sheet scrolls inside the app, so a fullPage shot would stop at the viewport: one PNG per page.
            const sheets = page.locator('.page-sheet');
            for (let i = 0; i < await sheets.count(); i++) await sheets.nth(i).screenshot({ path: join(dir, `${domain}-screen-p${i + 1}.png`) });
            await page.emulateMedia({ media: 'print' });
            await page.waitForTimeout(500);
            const print = await layout();
            const pdfPath = join(dir, `${domain}.pdf`);
            const pdf = await page.pdf({ path: pdfPath, format: 'A4', margin: { top: '0', right: '0', bottom: '0', left: '0' }, printBackground: true });
            const raw = pdf.toString('latin1');
            // Page objects, or the page tree's /Count when they sit in a compressed object stream.
            const pdfPages = Math.max((raw.match(/\/Type\s*\/Page(?!s)/g) ?? []).length, ...[...raw.matchAll(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/g)].map(m => Number(m[1])));
            await page.emulateMedia({ media: 'screen' });
            const sameOrder = JSON.stringify(screen.map(p => p.ids)) === JSON.stringify(print.map(p => p.ids));
            const res = {
                domain, blocks: blocks.map(b => b.typeId), screenPages: screen.length, pdfPages, sameOrder,
                screenOrder: screen.map(p => p.ids.map(id => blocks.find(b => b.id === id)?.typeId ?? id)),
                printOrder: print.map(p => p.ids.map(id => blocks.find(b => b.id === id)?.typeId ?? id)),
                printPageHeights: print.map(p => p.h), errors, pdf: pdfPath,
                outsideOnScreen: screen.flatMap(p => p.outside).map(id => blocks.find(b => b.id === id)?.typeId ?? id),
                outsideInPrint: print.flatMap(p => p.outside).map(id => blocks.find(b => b.id === id)?.typeId ?? id),
                pageWarnings: await page.evaluate(() => [...document.querySelectorAll('.page-sheet-warn')].map(w => w.textContent.trim())),
                ok: pdfPages === screen.length && sameOrder && !print.some(p => p.outside.length) && !errors.length,
            };
            results.push(res);
            console.log(`[sweep:print] ${domain}: screen ${res.screenPages} pages, pdf ${pdfPages}, order ${sameOrder ? 'same' : 'DIFFERS'}, ${res.ok ? 'OK' : 'CHECK'}`);
            await page.close();
        }
    } finally {
        await browser.close();
    }
    writeFileSync(join(dir, 'print.json'), JSON.stringify(results, null, 1));
    return results;
}

// ---------------------------------------------------------------- main

const t0 = Date.now();
let exitCode = 0;
try {
    if (MERGE.length) {
        const lines = [];
        for (const dir of MERGE) {
            const rel = relative(OUT, dir).replace(/\\/g, '/');
            for (const line of readFileSync(join(dir, 'cells.jsonl'), 'utf8').split('\n')) {
                if (!line.trim()) continue;
                let r; try { r = JSON.parse(line); } catch { continue; }
                if (r.shot) r.shot = `${rel}/${r.shot}`;
                lines.push(JSON.stringify(r));
            }
        }
        writeFileSync(JSONL, lines.join('\n') + '\n');
        console.log(`[sweep] merged ${lines.length} cells from ${MERGE.length} runs into ${JSONL}`);
    }
    if (REPORT_ONLY || REVIEW_PNG || MERGE.length) {
        const s = writeOutputs(null);
        console.log(`[sweep] report rebuilt: ${s.cells} cells, ${s.failing} failing — ${join(OUT, 'index.html')}`);
        if (REVIEW_PNG) await reviewPngs();
    } else {
        const url = EXTERNAL_URL || await startServer();
        let plan;
        if (RESUME && existsSync(PLAN)) plan = JSON.parse(readFileSync(PLAN, 'utf8'));
        else { plan = await buildPlan(url); writeFileSync(PLAN, JSON.stringify(plan)); }
        if (PRINT) {
            const res = await printPass(url, plan);
            exitCode = res.every(r => r.ok) ? 0 : 1;
        } else {
            const { settings: all, orphans } = settingsOf(plan);
            if (orphans.length) console.warn(`[sweep] registry types without a sidebar leaf (not swept): ${orphans.join(', ')}`);
            const settings = selectSettings(all);
            const elapsed = await sweep(url, plan, settings);
            killServer();
            const s = writeOutputs(elapsed);
            console.log(`[sweep] ${s.cells} cells in ${OUT}, ${s.failing} failing (${Math.round((Date.now() - t0) / 1000)}s)`);
            console.log(`  failures: ${Object.entries(s.byKind).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}`);
            console.log(`  reported: ${Object.entries(s.repKind).map(([k, n]) => `${k} ${n}`).join(' · ') || 'none'}`);
            console.log(`  ${join(OUT, 'index.html')}`);
            exitCode = s.failing ? 1 : 0;
        }
    }
} finally {
    killServer();
}
process.exit(exitCode);
