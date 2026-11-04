// Limits diff: compare two `npm run limits:audit` output dirs (before / after a generator fix)
// so the owner only rechecks what actually moved instead of re-reading ~30 fixes.
//
// Usage:
//   node scripts/limits-diff.mjs --before <dir> --after <dir> --out <dir> \
//        [--touched typeIdA,typeIdB] [--samples 3]
//
// Each input dir holds (the limits:audit contract):
//   summary.json     { [typeId]: { combos, exercises, violationsByRule, knownBugHits, hangs, throws, underfill } }
//   violations.json  [{ bugId|null, typeId, leafId, comboKey, seed, rule, observed, limit, example }]
//   dump/<typeId>.jsonl (optional)  one line per (combo, seed): { comboKey, seed, exercises: [...] }
// Writes <out>/report.md and a self-contained <out>/report.html (no external assets).
// --touched lists the typeIds the fixes were meant to change: any OTHER typeId whose dump
// differs is flagged as collateral, since an untouched generator must stay byte-identical.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const BEFORE = arg('before');
const AFTER = arg('after');
const OUT = arg('out', join('.', 'limits-diff-out'));
const SAMPLES = Number(arg('samples', 3));
const TOUCHED = arg('touched', '').split(',').filter(Boolean);
if (!BEFORE || !AFTER) { console.error('Usage: limits-diff.mjs --before <dir> --after <dir> [--out <dir>] [--touched a,b] [--samples N]'); process.exit(1); }

const readJson = (dir, name, fallback) => {
    const p = join(dir, name);
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback;
};

// violations.json may be the bare array or { violations: [...] }; accept both.
const violationsOf = (dir) => {
    const v = readJson(dir, 'violations.json', []);
    return Array.isArray(v) ? v : (v.violations ?? []);
};

const dumpOf = (dir) => {
    const out = new Map(); // typeId -> Map(`comboKey|seed` -> raw line)
    const d = join(dir, 'dump');
    if (!existsSync(d)) return out;
    for (const f of readdirSync(d).filter((n) => n.endsWith('.jsonl'))) {
        const m = new Map();
        for (const line of readFileSync(join(d, f), 'utf8').split('\n')) {
            if (!line.trim()) continue;
            const o = JSON.parse(line);
            m.set(`${o.comboKey}|${o.seed}`, line.trim());
        }
        out.set(basename(f, '.jsonl'), m);
    }
    return out;
};

const sumB = readJson(BEFORE, 'summary.json', {});
const sumA = readJson(AFTER, 'summary.json', {});
const vioB = violationsOf(BEFORE);
const vioA = violationsOf(AFTER);
const dumpB = dumpOf(BEFORE);
const dumpA = dumpOf(AFTER);

const vKey = (v) => [v.bugId ?? '', v.typeId, v.leafId, v.comboKey, v.seed, v.rule].join('|');
const keysB = new Set(vioB.map(vKey));
const keysA = new Set(vioA.map(vKey));
const newViolations = vioA.filter((v) => !keysB.has(vKey(v)));
const fixedViolations = vioB.filter((v) => !keysA.has(vKey(v)));

const countBy = (arr, f) => { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] ?? 0) + 1; } return m; };

// Generic one-line rendering: well-known fields if present, else truncated JSON.
const render = (ex) => {
    if (ex == null || typeof ex !== 'object') return String(ex);
    const parts = [];
    for (const k of ['operands', 'values', 'answer']) if (ex[k] !== undefined) parts.push(`${k}=${typeof ex[k] === 'object' ? JSON.stringify(ex[k]) : ex[k]}`);
    const s = parts.length ? parts.join(' ') : JSON.stringify(ex);
    return s.length > 160 ? `${s.slice(0, 157)}...` : s;
};

const typeIds = [...new Set([...Object.keys(sumB), ...Object.keys(sumA), ...dumpB.keys(), ...dumpA.keys(), ...vioB.map((v) => v.typeId), ...vioA.map((v) => v.typeId)])].sort();
const delta = (a, b) => `${a ?? 0} -> ${b ?? 0}`;
const mergeKeys = (a = {}, b = {}) => [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();

const report = [];
for (const typeId of typeIds) {
    const sB = sumB[typeId] ?? {}; const sA = sumA[typeId] ?? {};
    const rules = mergeKeys(sB.violationsByRule, sA.violationsByRule).map((r) => ({ rule: r, text: delta(sB.violationsByRule?.[r], sA.violationsByRule?.[r]), worse: (sA.violationsByRule?.[r] ?? 0) > (sB.violationsByRule?.[r] ?? 0) }));
    const bugs = mergeKeys(sB.knownBugHits, sA.knownBugHits).map((b) => ({ bug: b, text: delta(sB.knownBugHits?.[b], sA.knownBugHits?.[b]) }));
    const counters = ['combos', 'exercises', 'hangs', 'throws', 'underfill'].map((k) => ({ k, text: delta(sB[k], sA[k]), changed: (sB[k] ?? 0) !== (sA[k] ?? 0) }));

    let dump = null;
    const mB = dumpB.get(typeId); const mA = dumpA.get(typeId);
    if (mB || mA) {
        const b = mB ?? new Map(); const a = mA ?? new Map();
        let identical = 0, changed = 0, onlyBefore = 0, onlyAfter = 0;
        const samples = [];
        for (const [k, line] of b) {
            if (!a.has(k)) { onlyBefore++; continue; }
            if (a.get(k) === line) { identical++; continue; }
            changed++;
            if (samples.length < SAMPLES) {
                const eb = JSON.parse(line).exercises ?? []; const ea = JSON.parse(a.get(k)).exercises ?? [];
                const pairs = [];
                for (let i = 0; i < Math.max(eb.length, ea.length) && pairs.length < 2; i++) {
                    if (JSON.stringify(eb[i]) !== JSON.stringify(ea[i])) pairs.push({ i, before: eb[i] === undefined ? '(none)' : render(eb[i]), after: ea[i] === undefined ? '(none)' : render(ea[i]) });
                }
                samples.push({ combo: k, pairs });
            }
        }
        for (const k of a.keys()) if (!b.has(k)) onlyAfter++;
        dump = { identical, changed, onlyBefore, onlyAfter, samples };
    }

    const touched = TOUCHED.includes(typeId);
    const collateral = TOUCHED.length > 0 && !touched && !!dump && (dump.changed + dump.onlyBefore + dump.onlyAfter) > 0;
    report.push({ typeId, touched, collateral, rules, bugs, counters, dump,
        newCount: newViolations.filter((v) => v.typeId === typeId).length,
        fixedCount: fixedViolations.filter((v) => v.typeId === typeId).length });
}

const totalsByRuleB = countBy(vioB, (v) => v.rule);
const totalsByRuleA = countBy(vioA, (v) => v.rule);
const totalsByBugB = countBy(vioB, (v) => v.bugId ?? '(none)');
const totalsByBugA = countBy(vioA, (v) => v.bugId ?? '(none)');
const newUnknown = newViolations.filter((v) => !v.bugId);
// New violations with no bugId are the headline: a fix that introduced a fresh limit break.
const orderedNew = [...newViolations].sort((x, y) => (x.bugId ? 1 : 0) - (y.bugId ? 1 : 0));
const collateralTypes = report.filter((r) => r.collateral).map((r) => r.typeId);

// ---------- markdown ----------
const md = [];
md.push('# Limits diff', '', `${BEFORE} -> ${AFTER}`, '');
md.push(`Violations: ${vioB.length} -> ${vioA.length}; fixed ${fixedViolations.length}; **NEW ${newViolations.length}** (${newUnknown.length} without a bugId).`, '');
if (TOUCHED.length) md.push(`Touched types: ${TOUCHED.join(', ')}. Collateral (untouched but changed): ${collateralTypes.length ? '**' + collateralTypes.join(', ') + '**' : 'none'}.`, '');
md.push('## NEW violations (in after, not in before)', '');
if (!newViolations.length) md.push('None.', '');
else {
    md.push('| bugId | typeId | leaf | combo | seed | rule | observed | limit | example |', '|---|---|---|---|---|---|---|---|---|');
    for (const v of orderedNew) md.push(`| ${v.bugId ?? '**NONE**'} | ${v.typeId} | ${v.leafId} | ${v.comboKey} | ${v.seed} | ${v.rule} | ${v.observed} | ${v.limit} | ${String(v.example ?? '').replace(/\|/g, '\\|')} |`);
    md.push('');
}
md.push('## Totals', '', '| rule | before | after |', '|---|---|---|');
for (const r of mergeKeys(totalsByRuleB, totalsByRuleA)) md.push(`| ${r} | ${totalsByRuleB[r] ?? 0} | ${totalsByRuleA[r] ?? 0} |`);
md.push('', '| bugId | before | after |', '|---|---|---|');
for (const r of mergeKeys(totalsByBugB, totalsByBugA)) md.push(`| ${r} | ${totalsByBugB[r] ?? 0} | ${totalsByBugA[r] ?? 0} |`);
md.push('', '## Per typeId', '');
for (const r of report) {
    md.push(`### ${r.typeId}${r.touched ? ' (touched)' : ''}${r.collateral ? ' - COLLATERAL CHANGE' : ''}`, '');
    if (r.dump) md.push(`Combos: ${r.dump.identical} identical, ${r.dump.changed} changed, ${r.dump.onlyBefore} only before, ${r.dump.onlyAfter} only after.`, '');
    else md.push('No dump available (identity not checked).', '');
    const cs = r.counters.filter((c) => c.changed).map((c) => `${c.k} ${c.text}`);
    if (cs.length) md.push(`Counters: ${cs.join(', ')}.`, '');
    if (r.rules.length) md.push(`Violations by rule: ${r.rules.map((x) => `${x.rule} ${x.text}`).join('; ')}.`, '');
    if (r.bugs.length) md.push(`Known-bug hits: ${r.bugs.map((x) => `${x.bug} ${x.text}`).join('; ')}.`, '');
    if (r.newCount || r.fixedCount) md.push(`Violations: +${r.newCount} new, -${r.fixedCount} fixed.`, '');
    for (const s of r.dump?.samples ?? []) {
        md.push(`- changed combo \`${s.combo}\``);
        for (const p of s.pairs) md.push(`  - #${p.i}: \`${p.before}\` -> \`${p.after}\``);
    }
    md.push('');
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'report.md'), md.join('\n'));

// ---------- html ----------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const h = [];
h.push(`<!doctype html><html><head><meta charset="utf-8"><title>Limits diff</title><style>
body{font-family:system-ui,sans-serif;background:#f4f4f2;margin:0;padding:16px;color:#222}
h1{font-size:18px} h2{font-size:15px;margin-top:24px} h3{font-size:13px;margin:0 0 6px}
table{border-collapse:collapse;font-size:12px;background:#fff;margin-bottom:12px} td,th{border:1px solid #ddd;padding:3px 8px;text-align:left}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;margin-bottom:10px;padding:10px 12px;font-size:12px}
.red{color:#b91c1c;font-weight:600} .green{color:#15803d} .flag{background:#fee2e2;border-color:#b91c1c}
code{background:#eee;padding:0 3px;border-radius:3px} .new td{background:#fee2e2}
</style></head><body><h1>Limits diff</h1><p>${esc(BEFORE)} &rarr; ${esc(AFTER)}</p>`);
h.push(`<p>Violations ${vioB.length} &rarr; ${vioA.length}; fixed ${fixedViolations.length}; <span class="${newViolations.length ? 'red' : 'green'}">NEW ${newViolations.length}</span> (${newUnknown.length} without a bugId).</p>`);
if (TOUCHED.length) h.push(`<p>Touched: ${esc(TOUCHED.join(', '))}. Collateral: ${collateralTypes.length ? `<span class="red">${esc(collateralTypes.join(', '))}</span>` : '<span class="green">none</span>'}.</p>`);
h.push('<h2 class="red">NEW violations</h2>');
if (!newViolations.length) h.push('<p class="green">None.</p>');
else {
    h.push('<table><tr><th>bugId</th><th>typeId</th><th>leaf</th><th>combo</th><th>seed</th><th>rule</th><th>observed</th><th>limit</th><th>example</th></tr>');
    for (const v of orderedNew) h.push(`<tr class="new"><td>${v.bugId ? esc(v.bugId) : '<b>NONE</b>'}</td><td>${esc(v.typeId)}</td><td>${esc(v.leafId)}</td><td>${esc(v.comboKey)}</td><td>${esc(v.seed)}</td><td>${esc(v.rule)}</td><td>${esc(v.observed)}</td><td>${esc(v.limit)}</td><td>${esc(v.example)}</td></tr>`);
    h.push('</table>');
}
const totalsTable = (title, a, b) => {
    h.push(`<h2>${title}</h2><table><tr><th>${title.toLowerCase()}</th><th>before</th><th>after</th></tr>`);
    for (const k of mergeKeys(a, b)) h.push(`<tr><td>${esc(k)}</td><td>${a[k] ?? 0}</td><td class="${(b[k] ?? 0) > (a[k] ?? 0) ? 'red' : ''}">${b[k] ?? 0}</td></tr>`);
    h.push('</table>');
};
totalsTable('Rule', totalsByRuleB, totalsByRuleA);
totalsTable('BugId', totalsByBugB, totalsByBugA);
h.push('<h2>Per typeId</h2>');
for (const r of report) {
    h.push(`<div class="card${r.collateral ? ' flag' : ''}"><h3>${esc(r.typeId)}${r.touched ? ' (touched)' : ''}${r.collateral ? ' <span class="red">COLLATERAL CHANGE</span>' : ''}</h3>`);
    h.push(r.dump ? `<div>Combos: ${r.dump.identical} identical, ${r.dump.changed} changed, ${r.dump.onlyBefore} only before, ${r.dump.onlyAfter} only after.</div>` : '<div>No dump available (identity not checked).</div>');
    const cs = r.counters.filter((c) => c.changed).map((c) => `${c.k} ${c.text}`);
    if (cs.length) h.push(`<div>Counters: ${esc(cs.join(', '))}.</div>`);
    if (r.rules.length) h.push(`<div>By rule: ${r.rules.map((x) => `<span class="${x.worse ? 'red' : ''}">${esc(x.rule)} ${esc(x.text)}</span>`).join('; ')}.</div>`);
    if (r.bugs.length) h.push(`<div>Known-bug hits: ${r.bugs.map((x) => `${esc(x.bug)} ${esc(x.text)}`).join('; ')}.</div>`);
    if (r.newCount || r.fixedCount) h.push(`<div>Violations: <span class="${r.newCount ? 'red' : ''}">+${r.newCount} new</span>, -${r.fixedCount} fixed.</div>`);
    for (const s of r.dump?.samples ?? []) {
        h.push(`<div>changed combo <code>${esc(s.combo)}</code><ul>`);
        for (const p of s.pairs) h.push(`<li>#${p.i}: <code>${esc(p.before)}</code> &rarr; <code>${esc(p.after)}</code></li>`);
        h.push('</ul></div>');
    }
    h.push('</div>');
}
h.push('</body></html>');
writeFileSync(join(OUT, 'report.html'), h.join('\n'));

console.log(`violations ${vioB.length} -> ${vioA.length}, new ${newViolations.length} (${newUnknown.length} unknown), fixed ${fixedViolations.length}${collateralTypes.length ? `, COLLATERAL: ${collateralTypes.join(',')}` : ''} -> ${OUT}`);
