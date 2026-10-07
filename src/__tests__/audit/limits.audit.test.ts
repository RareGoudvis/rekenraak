import { test } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { REGISTRY } from '../../config/exerciseRegistry';
import { constraintSpaceFor, type OptionSpace } from '../../config/constraintSpace';
import { pairwise } from '../helpers/pairwise';
import {
    runCase, leafGradeCases, leavesOf, triggerCases, triggerToCase, comboKey, stableStringify, normalizeForDump,
    reachableMax, mulberry32, generatingTypeIds, type LimitCase, type CaseResult,
} from '../helpers/limitHarness';
import { KNOWN_BUGS, KNOWN_SKIPS } from '../limits.knownBugs';

// ── The full limit diagnosis (`npm run limits:audit`, not part of the gate) ──
// Per typeId: every sidebar leaf × (no grade, Leerjaar 1-6); one factor at a time (every value
// of every key × every max value); the full cartesian product when it has ≤ 20 000 rows, else
// pairwise plus LIMITS_RANDOM seeded-random rows; and the trigger cases. Each row runs once per
// seed at LIMITS_COUNT exercises, through the same runner and rule book as the gate.
//
// Env: LIMITS_OUT (dir, default ~/Downloads/limits-audit/<timestamp>), LIMITS_DUMP (dir: one
// <typeId>.jsonl of every generated block), LIMITS_ONLY (comma list of typeIds and/or leafIds; a
// leafId runs that leaf only and sweeps its type on top of the leaf's defaults), LIMITS_SEEDS
// (default 1,2,3), LIMITS_COUNT (default 40), LIMITS_RANDOM (default 3000).

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = process.env.LIMITS_OUT || join(homedir(), 'Downloads', 'limits-audit', stamp);
const DUMP = process.env.LIMITS_DUMP || null;
const ONLY = (process.env.LIMITS_ONLY ?? '').split(',').map(s => s.trim()).filter(Boolean);
const SEEDS = (process.env.LIMITS_SEEDS ?? '1,2,3').split(',').map(Number).filter(Number.isFinite);
const COUNT = Number(process.env.LIMITS_COUNT ?? 40);
const RANDOM = Number(process.env.LIMITS_RANDOM ?? 3000);
const CARTESIAN_MAX = 20_000;
// violations.json keeps every NEW finding but only a sample of each known bug's hits.
const KNOWN_SAMPLE = 200;
const NEW_CAP = 5000;

// The key every one-factor row is crossed with: the picker's max, else the type's main size knob.
const SIZE_KEYS = ['maxGetal', 'maxRange', 'maxNumber', 'maxEuro', 'maxLength', 'maxDenominator', 'maxPriceEuros', 'maxDuurMin', 'bereikGram', 'maxSamengesteld'];

interface TypeSummary {
    combos: number;
    exercises: number;
    violationsByRule: Record<string, number>;
    knownBugHits: Record<string, number>;
    hangs: number;
    throws: number;
    underfill: number;
    seconds: number;
}

interface ViolationRow {
    bugId: string | null; typeId: string; leafId: string | null; comboKey: string; seed: number;
    rule: string; observed: unknown; limit: unknown; example: string;
}

const summary: Record<string, TypeSummary> = {};
const violations: ViolationRow[] = [];
const sampled = new Map<string, number>();

const leafIdsAsked = new Set(ONLY.filter(id => leavesOf().some(l => l.id === id)));
const typeIds = generatingTypeIds().filter(t => ONLY.length === 0 || ONLY.includes(t) || leavesOf(t).some(l => leafIdsAsked.has(l.id)));

function cartesian(space: OptionSpace): Array<Record<string, unknown>> {
    let rows: Array<Record<string, unknown>> = [{}];
    for (const [k, vals] of Object.entries(space)) rows = rows.flatMap(r => vals.map(v => ({ ...r, [k]: v })));
    return rows;
}

const hashOf = (s: string) => [...s].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0, 7);

/** Every row this run sweeps for one type, on top of `base` (a leaf's defaults or {}). */
function sweepRows(typeId: string, base: Record<string, unknown>): Array<{ tag: string; combo: Record<string, unknown> }> {
    const space = constraintSpaceFor(typeId);
    const keys = Object.keys(space).filter(k => space[k].length > 0);
    const def = REGISTRY[typeId];
    const sizeKey = def.maxPresets?.({ ...def.defaultConstraints(typeId), ...base })?.key ?? SIZE_KEYS.find(k => k in space);
    const sizes: unknown[] = sizeKey && space[sizeKey] ? space[sizeKey] : [undefined];
    const rows: Array<{ tag: string; combo: Record<string, unknown> }> = [];
    const withSize = (combo: Record<string, unknown>, m: unknown) => (m === undefined || !sizeKey ? combo : { ...combo, [sizeKey]: m });

    for (const k of keys) {
        if (k === sizeKey) { for (const m of sizes) rows.push({ tag: 'one-factor', combo: { ...base, [k]: m } }); continue; }
        for (const v of space[k]) for (const m of sizes) rows.push({ tag: 'one-factor', combo: withSize({ ...base, [k]: v }, m) });
    }
    const size = keys.reduce((p, k) => p * space[k].length, 1);
    if (size <= CARTESIAN_MAX) {
        for (const combo of cartesian(Object.fromEntries(keys.map(k => [k, space[k]])))) rows.push({ tag: 'cartesian', combo: { ...base, ...combo } });
    } else {
        for (const combo of pairwise(space, 5000)) rows.push({ tag: 'pairwise', combo: { ...base, ...combo } });
        const rnd = mulberry32(hashOf(typeId));
        for (let i = 0; i < RANDOM; i++) {
            const combo: Record<string, unknown> = {};
            for (const k of keys) combo[k] = space[k][Math.floor(rnd() * space[k].length)];
            rows.push({ tag: 'random', combo: { ...base, ...combo } });
        }
    }
    // Snap each max into the list its combo's picker shows (flat spaces union every list).
    return rows.map(r => ({ tag: r.tag, combo: reachableMax(typeId, r.combo) }));
}

function casesFor(typeId: string): LimitCase[] {
    const leaves = leavesOf(typeId).filter(l => leafIdsAsked.size === 0 || leafIdsAsked.has(l.id) || ONLY.includes(typeId));
    const bases = leafIdsAsked.size && !ONLY.includes(typeId)
        ? leaves.map(l => ({ leafId: l.id as string | undefined, base: { ...(l.defaultConstraints ?? {}) } }))
        : [{ leafId: undefined as string | undefined, base: {} as Record<string, unknown> }];
    const cases: LimitCase[] = [];
    for (const seed of SEEDS) {
        for (const cs of leafGradeCases(seed, typeId, COUNT)) if (leaves.some(l => l.id === cs.leafId)) cases.push(cs);
        for (const { leafId, base } of bases) {
            for (const r of sweepRows(typeId, base)) cases.push({ typeId, leafId, constraints: r.combo, grade: null, seed, count: COUNT, tag: r.tag });
        }
        for (const t of triggerCases().filter(t => t.typeId === typeId)) cases.push({ ...triggerToCase(t), seed, count: COUNT });
    }
    // The same row can come out of two enumerations; run it once per seed.
    const seen = new Set<string>();
    return cases.filter(cs => { const k = `${cs.seed}|${cs.grade}|${cs.leafId}|${stableStringify(cs.constraints)}`; return !seen.has(k) && (seen.add(k), true); });
}

function record(r: CaseResult, s: TypeSummary) {
    s.exercises += r.items.length;
    if (r.skipped) s.hangs++;
    const rules = new Set<string>();
    // Blocks here ask LIMITS_COUNT (40) exercises; a small candidate space legitimately runs out
    // above the type's own default count, so only a shortfall below that default is a finding.
    const floor = Math.min(r.cs.count ?? Infinity, REGISTRY[r.cs.typeId].defaultCount);
    for (const v of r.violations.filter(v => v.rule !== 'underfill' || (v.observed as number) < floor)) {
        s.violationsByRule[v.rule] = (s.violationsByRule[v.rule] ?? 0) + 1;
        if (v.bugId) s.knownBugHits[v.bugId] = (s.knownBugHits[v.bugId] ?? 0) + 1;
        if (v.rule === 'threw') s.throws++;
        if (v.rule === 'slow') s.hangs++;
        if (v.rule === 'underfill') s.underfill++;
        // One row per (case, rule): the first exercise that broke it.
        if (rules.has(v.rule)) continue;
        rules.add(v.rule);
        const bucket = `${v.bugId ?? 'NEW'}|${r.cs.typeId}|${v.rule}`;
        const n = sampled.get(bucket) ?? 0;
        if (n >= (v.bugId ? KNOWN_SAMPLE : NEW_CAP)) continue;
        sampled.set(bucket, n + 1);
        violations.push({ bugId: v.bugId, typeId: r.cs.typeId, leafId: r.cs.leafId ?? null, comboKey: comboKey(r.cs), seed: r.cs.seed, rule: v.rule, observed: v.observed, limit: v.limit, example: v.example });
    }
}

mkdirSync(OUT, { recursive: true });
if (DUMP) mkdirSync(DUMP, { recursive: true });

test.each(typeIds)('audit %s', (typeId) => {
    const t0 = performance.now();
    const s: TypeSummary = { combos: 0, exercises: 0, violationsByRule: {}, knownBugHits: {}, hangs: 0, throws: 0, underfill: 0, seconds: 0 };
    const combos = new Set<string>();
    const dump: string[] = [];
    for (const cs of casesFor(typeId)) {
        const r = runCase(cs);
        combos.add(comboKey(cs));
        record(r, s);
        if (DUMP) {
            const extra = r.skipped ? { skipped: r.skipped } : r.violations.some(v => v.rule === 'threw') ? { threw: String(r.violations.find(v => v.rule === 'threw')!.observed) } : {};
            dump.push(stableStringify({ comboKey: comboKey(cs), seed: cs.seed, exercises: normalizeForDump(r.items), ...extra }));
        }
    }
    s.combos = combos.size;
    s.seconds = Math.round((performance.now() - t0) / 100) / 10;
    summary[typeId] = s;
    if (DUMP) writeFileSync(join(DUMP, `${typeId}.jsonl`), dump.length ? `${dump.join('\n')}\n` : '');
    console.log(`[limits:audit] ${typeId}: ${s.combos} combos, ${s.exercises} exercises, ${Object.values(s.violationsByRule).reduce((a, b) => a + b, 0)} violations, ${s.seconds}s`);
});

test('write summary.json, violations.json, report.md', () => {
    writeFileSync(join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
    writeFileSync(join(OUT, 'violations.json'), JSON.stringify(violations, null, 1));

    const lines: string[] = [];
    const total = (f: (s: TypeSummary) => number) => Object.values(summary).reduce((a, s) => a + f(s), 0);
    lines.push('# Limit audit', '', `Seeds ${SEEDS.join(', ')} · ${COUNT} exercises per block · random rows ${RANDOM} · only ${ONLY.join(', ') || 'all'}`, '');
    lines.push(`${Object.keys(summary).length} types · ${total(s => s.combos)} combos · ${total(s => s.exercises)} exercises · ${total(s => s.seconds).toFixed(0)} s`, '');
    lines.push('| typeId | combos | exercises | violations | known | new | hangs | throws | underfill | s |', '|---|---|---|---|---|---|---|---|---|---|');
    for (const [t, s] of Object.entries(summary)) {
        const all = Object.values(s.violationsByRule).reduce((a, b) => a + b, 0);
        const known = Object.values(s.knownBugHits).reduce((a, b) => a + b, 0);
        lines.push(`| ${t} | ${s.combos} | ${s.exercises} | ${all} | ${known} | ${all - known} | ${s.hangs} | ${s.throws} | ${s.underfill} | ${s.seconds} |`);
    }

    const fresh = new Map<string, { n: number; first: ViolationRow }>();
    for (const v of violations.filter(v => v.bugId === null)) {
        const k = `${v.typeId} · ${v.rule}`;
        const e = fresh.get(k);
        if (e) e.n++; else fresh.set(k, { n: 1, first: v });
    }
    lines.push('', '## NEW findings (no known bug matches)', '');
    if (fresh.size === 0) lines.push('None.');
    for (const [k, { n, first }] of fresh) {
        lines.push(`- **${k}** — ${n} case(s)${n >= NEW_CAP ? '+' : ''}: \`${first.example}\` (observed ${JSON.stringify(first.observed)}, limit ${JSON.stringify(first.limit)})`);
        lines.push(`  - repro: typeId \`${first.typeId}\`, seed ${first.seed}, \`${first.comboKey}\``);
    }

    const hits: Record<string, number> = {};
    for (const s of Object.values(summary)) for (const [id, n] of Object.entries(s.knownBugHits)) hits[id] = (hits[id] ?? 0) + n;
    lines.push('', '## Known bugs', '', '| id | violations | ', '|---|---|');
    const audited = Object.keys(summary);
    const ids = [...new Set([...KNOWN_BUGS, ...KNOWN_SKIPS].filter(b => b.typeIds.some(t => audited.includes(t))).map(b => b.id))];
    for (const id of ids) lines.push(`| ${id} | ${hits[id] ?? (KNOWN_SKIPS.some(s => s.id === id && s.kind === 'hang') ? 'skipped (hang)' : '0 — no longer seen in this run?')} |`);
    lines.push('', `violations.json keeps every NEW (case, rule) row up to ${NEW_CAP} per type and rule, and a sample of ${KNOWN_SAMPLE} per known bug, type and rule; summary.json counts all.`);
    writeFileSync(join(OUT, 'report.md'), `${lines.join('\n')}\n`);
    console.log(`[limits:audit] wrote ${OUT}${DUMP ? ` and dumps in ${DUMP}` : ''}`);
});
