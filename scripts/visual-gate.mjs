// The visual half of the commit gate (.githooks/pre-commit): render the exercise types
// the staged change can actually reach, and compare them to a committed baseline of
// numbers. Catches what vitest cannot — a viewer that still renders but renders wrong.
//
//   node scripts/visual-gate.mjs --staged            # what the pre-commit hook runs
//   node scripts/visual-gate.mjs --files src/components/viewer/ClockViewer.tsx
//   node scripts/visual-gate.mjs --all
//   node scripts/visual-gate.mjs --all --accept      # rewrite the baseline (npm run visual:baseline)
//
// Scope: a changed file is mapped to typeIds (viewer file -> the EXERCISE_UI rows using it,
// generator file -> the REGISTRY rows using it, shared surface -> every leaf, anything else
// -> no visual scope and an instant exit 0). The walk itself is scripts/lib/leafWalk.mjs,
// shared with font-baseline.mjs; the thresholds are scripts/lib/visualCompare.mjs.
//
// Baseline: scripts/visual-baseline.json holds one row per leaf x width x solutions with
// the cell height, its intrinsic width and a hash of its text — no PNGs, so the file stays
// reviewable in a diff. Screenshots are written to ~/Downloads/visual-gate/<timestamp>/.

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve as pathResolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { walkLeaves, cellKey } from './lib/leafWalk.mjs';
import { tierOf, textHash, HEIGHT_DELTA_FLAG_PX, ERROR_BOUNDARY_TEXT } from './lib/visualCompare.mjs';

const ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'scripts', 'visual-baseline.json');

const argv = process.argv.slice(2);
const has = (name) => argv.includes(`--${name}`);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const ACCEPT = has('accept');
const ALL = has('all');
const STAGED = has('staged');
const FILES_ARG = arg('files', '');
const SEED = Number(arg('seed', 1234));
const WIDTHS = arg('widths', '4,2,1').split(',').map(Number);
const PORT = Number(arg('port', 5299));
const EXTERNAL_URL = arg('url', '');

// ---------------------------------------------------------------- scope resolution

// Files whose change can move any block on the page: the registries, the page/packing
// chain, the store, the tokens. A change here is scoped to every leaf.
const SHARED_SURFACE = [
    /^src\/services\/math\//,
    /^src\/services\/layout\//,
    /^src\/config\/appstructure\.ts$/,
    /^src\/config\/exerciseRegistry\.ts$/,
    /^src\/config\/exerciseUI\.tsx$/,
    /^src\/config\/baseSettings/,
    /^src\/components\/viewer\/(FragmentableGrid|BlockWidthContext|ScaledBlock|BlockErrorBoundary|solutionStyle)\./,
    /^src\/components\/layout\/PageSheet\.tsx$/,
    /^src\/App\.tsx$/,
    /^src\/index\.css$/,
    /^src\/assets\/theme\.css$/,
    /^src\/store\//,
    /^src\/hooks\/useMeasuredHeights\.ts$/,
];

const norm = (p) => p.replace(/\\/g, '/').replace(/^\.\//, '');

// Resolve a relative import specifier to a repo-relative source path, trying the
// extensions Vite would (the registries import without one).
function resolveSpecifier(fromFile, spec) {
    if (!spec.startsWith('.')) return null;
    const base = norm(join(dirname(fromFile), spec));
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
        if (existsSync(join(ROOT, cand))) return norm(cand);
    }
    return null;
}

// identifier -> repo-relative file it was imported from. Covers default, named and
// renamed named imports; the registries use nothing else.
function importMap(file) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const map = new Map();
    const re = /import\s+(?:type\s+)?([^;]*?)\s+from\s+['"]([^'"]+)['"]/g;
    for (const m of text.matchAll(re)) {
        const target = resolveSpecifier(file, m[2]);
        if (!target) continue;
        const clause = m[1];
        const named = clause.match(/\{([\s\S]*?)\}/);
        const defaultPart = clause.replace(/\{[\s\S]*?\}/, '').replace(/,/g, '').trim();
        if (defaultPart) map.set(defaultPart, target);
        if (named) {
            for (const piece of named[1].split(',')) {
                const ident = piece.trim().split(/\s+as\s+/).pop()?.trim();
                if (ident) map.set(ident, target);
            }
        }
    }
    return map;
}

// typeIds whose EXERCISE_UI row names a Viewer imported from one of `files`.
function typeIdsForViewerFiles(files) {
    const uiFile = 'src/config/exerciseUI.tsx';
    const imports = importMap(uiFile);
    const text = readFileSync(join(ROOT, uiFile), 'utf8');
    const out = new Set();
    for (const m of text.matchAll(/^\s*'([\w-]+)':\s*\{([^}]*)\}/gm)) {
        const viewer = m[2].match(/Viewer:\s*(\w+)/)?.[1];
        if (viewer && files.has(imports.get(viewer))) out.add(m[1]);
    }
    return out;
}

// typeIds whose REGISTRY row references anything imported from one of `files`. Rows are
// matched by identifier rather than by `generate:` alone because several rows wrap the
// generator (relaxing(...), generateNoted, a local row factory like cijferRow()).
function typeIdsForGeneratorFiles(files) {
    const regFile = 'src/config/exerciseRegistry.ts';
    const imports = importMap(regFile);
    const text = readFileSync(join(ROOT, regFile), 'utf8');
    const wanted = new Set([...imports].filter(([, f]) => files.has(f)).map(([ident]) => ident));
    if (!wanted.size) return new Set();

    // A row may delegate to a file-local factory; inline that factory's body once so the
    // generator identifier inside it is visible to the same scan.
    const locals = new Map();
    for (const m of text.matchAll(/^const (\w+)\s*=[\s\S]*?^\}\);?$/gm)) locals.set(m[1], m[0]);

    const registry = text.slice(text.indexOf('export const REGISTRY'));
    const out = new Set();
    for (const m of registry.matchAll(/^\s{4}'([\w-]+)':\s*(.*)$/gm)) {
        let body = m[2];
        for (const [name, def] of locals) if (body.includes(name)) body += `\n${def}`;
        if ([...wanted].some(ident => new RegExp(`\\b${ident}\\b`).test(body))) out.add(m[1]);
    }
    return out;
}

// A viewer helper (FractionExerciseItem, AnalogClockSVG, …) is not itself registered, so
// walk the viewer folder's import graph back to the files that ARE registered rows.
function viewerFilesReaching(changed) {
    const dir = join(ROOT, 'src', 'components', 'viewer');
    const listing = readdirSync(dir).filter(f => /\.(ts|tsx)$/.test(f)).map(f => `src/components/viewer/${f}`);
    // importer -> imported
    const edges = new Map();
    for (const f of listing) edges.set(f, new Set([...importMap(f).values()]));
    const reaching = new Set(changed);
    let grew = true;
    while (grew) {
        grew = false;
        for (const [importer, imported] of edges) {
            if (reaching.has(importer)) continue;
            if ([...imported].some(t => reaching.has(t))) { reaching.add(importer); grew = true; }
        }
    }
    return reaching;
}

function changedFiles() {
    if (ALL) return [];
    if (FILES_ARG) return FILES_ARG.split(',').map(s => norm(s.trim())).filter(Boolean);
    if (STAGED) {
        return execSync('git diff --cached --name-only', { cwd: ROOT, encoding: 'utf8' })
            .split('\n').map(norm).filter(Boolean);
    }
    return [];
}

/** @returns {{mode:'all'|'types'|'none', typeIds:Set<string>, why:string}} */
function resolveScope() {
    if (ALL) return { mode: 'all', typeIds: new Set(), why: '--all' };
    const files = changedFiles();
    if (!files.length) return { mode: 'none', typeIds: new Set(), why: 'no files' };

    const shared = files.filter(f => SHARED_SURFACE.some(re => re.test(f)));
    if (shared.length) return { mode: 'all', typeIds: new Set(), why: `shared visual surface: ${shared.join(', ')}` };

    const viewerChanged = files.filter(f => f.startsWith('src/components/viewer/') && /\.(ts|tsx)$/.test(f));
    const serviceChanged = files.filter(f => f.startsWith('src/services/') && /\.ts$/.test(f));

    const typeIds = new Set();
    if (viewerChanged.length) {
        for (const t of typeIdsForViewerFiles(viewerFilesReaching(viewerChanged))) typeIds.add(t);
    }
    if (serviceChanged.length) {
        for (const t of typeIdsForGeneratorFiles(new Set(serviceChanged))) typeIds.add(t);
    }
    if (!typeIds.size) return { mode: 'none', typeIds, why: 'no visual files changed' };
    return { mode: 'types', typeIds, why: `${viewerChanged.concat(serviceChanged).join(', ')}` };
}

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

async function startServer(outDir) {
    const logPath = join(outDir, 'vite.log');
    const log = [];
    // Run vite's own entry with this node, not npx through a shell: no shell quoting, no
    // extra process between us and the pid we have to taskkill.
    const viteBin = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    server = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'],
        { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', d => log.push(String(d)));
    server.stderr.on('data', d => log.push(String(d)));

    const url = `http://localhost:${PORT}/`;
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            if (res.status === 200) return url;
        } catch { /* not up yet */ }
        await new Promise(r => setTimeout(r, 500));
    }
    writeFileSync(logPath, log.join(''));
    killServer();
    throw new Error(`dev server did not answer on ${url} within 60s — see ${logPath}`);
}

// ---------------------------------------------------------------- run

const scope = resolveScope();
// --scope-only answers "what would this change render?" without a browser — the cheap way
// to check the file -> typeId mapping after touching SHARED_SURFACE or a registry.
if (has('scope-only')) {
    console.log(`mode=${scope.mode} why=${scope.why}`);
    console.log(scope.mode === 'none' ? '(nothing)' : scope.typeIds.size ? [...scope.typeIds].sort().join(', ') : '(all leaves)');
    process.exit(0);
}
if (scope.mode === 'none') {
    console.log('[visual-gate] no visual scope — skipped');
    process.exit(0);
}

const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : { seed: SEED, widths: WIDTHS, rows: {} };

if (!ACCEPT && !Object.keys(baseline.rows).length) {
    console.log('[visual-gate] no baseline yet — run `npm run visual:baseline -- --all` once. Skipped.');
    process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = arg('out', join(homedir(), 'Downloads', 'visual-gate', stamp));
mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
const url = EXTERNAL_URL || await startServer(OUT);

const only = scope.mode === 'all' ? [] : [...scope.typeIds];
const { rows } = await walkLeaves({ url, out: OUT, widths: WIDTHS, seed: SEED, only, log: () => {} });
killServer();

// ---------------------------------------------------------------- compare

const results = rows.map((r) => {
    const key = cellKey(r);
    const base = baseline.rows[key];
    const reasons = [];
    if (r.error) reasons.push(`errored: ${r.error}`);
    if (r.consoleErrors?.length) reasons.push(`console.error: ${r.consoleErrors[0]}`);
    if (r.text?.includes(ERROR_BOUNDARY_TEXT)) reasons.push('error boundary on the sheet');
    if (!r.error) {
        if (!base) reasons.push('no baseline row (new leaf)');
        else {
            if (textHash(r.text) !== base.textHash) reasons.push('text changed');
            const dh = (r.cellHeightPx ?? 0) - (base.cellHeightPx ?? 0);
            if (Math.abs(dh) > HEIGHT_DELTA_FLAG_PX) reasons.push(`height Δ${dh}px`);
            const tb = tierOf(base.intrinsicPx), ta = tierOf(r.intrinsicPx);
            if (tb !== ta) reasons.push(`tier ${tb} -> ${ta}`);
        }
    }
    return { ...r, key, flagged: reasons.length > 0, reason: reasons.join('; ') };
});

const flagged = results.filter(r => r.flagged);
const elapsedS = ((Date.now() - t0) / 1000).toFixed(1);

const md = [
    '# Visual gate', '',
    `scope: ${scope.mode} (${scope.why})`,
    `${results.length} cells, ${flagged.length} flagged, ${elapsedS}s, seed ${SEED}, widths [${WIDTHS.join(',')}]`, '',
    '| leaf | w | sol | height | baseline | intrinsic | flagged | reason |',
    '|---|---|---|---|---|---|---|---|',
    ...results.map(r => {
        const b = baseline.rows[r.key];
        return `| ${r.path ?? r.leafId} | ${r.width} | ${r.solutions} | ${r.cellHeightPx ?? '-'} | ${b?.cellHeightPx ?? '-'} | ${r.intrinsicPx ?? '-'} | ${r.flagged ? 'YES' : ''} | ${r.reason} |`;
    }),
].join('\n');
writeFileSync(join(OUT, 'report.md'), md);

const shotSrc = (name) => name ? `file:///${join(OUT, name).replace(/\\/g, '/')}` : '';
writeFileSync(join(OUT, 'contact-sheet.html'), `<!doctype html><html><head><meta charset="utf-8"><title>Visual gate contact sheet</title>
<style>body{font-family:system-ui,sans-serif;background:#f4f4f2;margin:0;padding:16px}h1{font-size:16px}
.row{background:#fff;border:1px solid #ddd;border-radius:8px;margin-bottom:16px;padding:12px}
.row h3{margin:0 0 6px;font-size:13px}.reason{color:#b91c1c;font-size:12px;margin-bottom:8px}
img{max-width:100%;border:1px solid #ccc}</style></head><body>
<h1>${flagged.length} of ${results.length} cells flagged — ${scope.mode} scope</h1>
${flagged.map(r => `<div class="row"><h3>${r.path ?? r.leafId} — w${r.width}, oplossingen ${r.solutions ? 'aan' : 'uit'}</h3>
<div class="reason">${r.reason}</div><img src="${shotSrc(r.screenshot)}"></div>`).join('\n')}
</body></html>`);

// ---------------------------------------------------------------- accept / verdict

if (ACCEPT) {
    const next = { seed: SEED, widths: WIDTHS, rows: ALL ? {} : { ...baseline.rows } };
    let added = 0, changedCount = 0;
    for (const r of results) {
        if (r.error) continue;
        const prev = baseline.rows[r.key];
        next.rows[r.key] = {
            cellHeightPx: r.cellHeightPx,
            intrinsicPx: r.intrinsicPx == null ? null : Math.round(r.intrinsicPx),
            textHash: textHash(r.text),
        };
        if (!prev) added++;
        else if (prev.textHash !== next.rows[r.key].textHash || prev.cellHeightPx !== r.cellHeightPx) changedCount++;
    }
    const sorted = Object.fromEntries(Object.keys(next.rows).sort().map(k => [k, next.rows[k]]));
    writeFileSync(BASELINE_PATH, `${JSON.stringify({ seed: next.seed, widths: next.widths, rows: sorted }, null, 1)}\n`);
    const dropped = ALL ? Object.keys(baseline.rows).filter(k => !sorted[k]).length : 0;
    console.log(`[visual-gate] baseline updated: ${Object.keys(sorted).length} rows (${added} new, ${changedCount} changed${ALL ? `, ${dropped} dropped` : ''}) in ${elapsedS}s`);
    console.log(`              stage scripts/visual-baseline.json`);
    process.exit(0);
}

if (!flagged.length) {
    console.log(`[visual-gate] ${results.length} cells, 0 flagged (${scope.mode} scope, ${elapsedS}s)`);
    process.exit(0);
}

console.error(`[visual-gate] ${flagged.length} of ${results.length} cells flagged (${elapsedS}s):`);
for (const r of flagged.slice(0, 40)) console.error(`  ${r.leafId} w${r.width} s${r.solutions}: ${r.reason}`);
if (flagged.length > 40) console.error(`  … ${flagged.length - 40} more`);
console.error(`  report: ${join(OUT, 'report.md')}`);
console.error(`  screenshots: ${OUT}  (contact-sheet.html)`);
console.error('Look at the screenshots. If the change is intended, run `npm run visual:baseline -- --files <same files>` (or `--all`) to accept, stage scripts/visual-baseline.json, and commit again.');
process.exit(1);
