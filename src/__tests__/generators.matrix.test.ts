import { describe, test, expect } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { APP_STRUCTURE } from '../config/appstructure';
import { constraintSpaceFor } from '../config/constraintSpace';
import { DEFAULT_BASE, type BaseSettings } from '../config/baseSettings';
import { GRADE_PRESETS, LEERJAREN } from '../config/gradePresets';
import { makeBlock, isLayoutType } from './helpers/makeBlock';
import { pairwise } from './helpers/pairwise';

// ── The sweep ────────────────────────────────────────────────────────────────
// Every generator, across every constraint option a teacher can reach. Five passes:
//   a) registry defaults, repeated (generators are random — one run proves little)
//   b) every APP_STRUCTURE leaf's defaultConstraints (the sidebar's real entry points)
//   c) pairwise combinations from CONSTRAINT_SPACE (every option value paired with
//      every other at least once), capped per type so the suite stays fast
//   d) every Leerjaar seed, which is how a teacher changes difficulty globally
//   e) every type at the top of its own max-number list (the 1e9 ceiling)
//
// A generator returning FEWER items than asked is not a hard failure: over-restrictive
// constraints legitimately exhaust the candidate space. Those are collected and printed
// as a table at the end so they stay visible instead of silently passing.

const PAIRWISE_CAP = 200;

const typeIds = Object.keys(REGISTRY);
const exerciseTypeIds = typeIds.filter(t => !isLayoutType(t));

interface Shortfall { typeId: string; got: number; want: number; constraints: string; }
const shortfalls: Shortfall[] = [];


/** Leaves of APP_STRUCTURE that carry a typeId, with the constraints the sidebar passes. */
function appStructureLeaves(): Array<{ typeId: string; label: string; constraints: Record<string, unknown> }> {
    const out: Array<{ typeId: string; label: string; constraints: Record<string, unknown> }> = [];
    for (const domain of APP_STRUCTURE) {
        for (const sub of domain.subdomains) {
            for (const type of sub.types) {
                if (type.typeId) out.push({ typeId: type.typeId, label: type.label, constraints: type.defaultConstraints ?? {} });
                for (const child of type.children ?? []) {
                    if (child.typeId) out.push({ typeId: child.typeId, label: `${type.label} › ${child.label}`, constraints: child.defaultConstraints ?? {} });
                }
            }
        }
    }
    return out;
}

/** Deep walk for values a printed worksheet can never survive. */
function assertNoBadNumbers(value: unknown, path: string, seen = new Set<unknown>()): void {
    if (value === null || value === undefined) return;
    if (typeof value === 'number') {
        // NaN and +-Infinity both print as garbage; a worksheet must never carry one.
        expect(Number.isFinite(value), `${path} is ${value}`).toBe(true);
        return;
    }
    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
        value.forEach((v, i) => {
            // A hole in an exercise ARRAY is always a bug; an optional object key set to
            // undefined is not (several generators write `target: undefined` deliberately).
            expect(v, `${path}[${i}] is undefined`).not.toBe(undefined);
            assertNoBadNumbers(v, `${path}[${i}]`, seen);
        });
        return;
    }
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        assertNoBadNumbers(v, `${path}.${k}`, seen);
    }
}

interface RunOptions {
    base?: BaseSettings;
    label?: string;
    /** Pairwise combos mix keys the UI would never show together (a preset with a
     *  4-term chain, a digit mask that contradicts a FORBIDDEN bridge). An empty
     *  result there is an over-restrictive setting, not a broken generator, so it is
     *  recorded for the end-of-run table rather than failed. */
    allowEmpty?: boolean;
}

function runOne(typeId: string, constraints: Record<string, unknown>, opts: RunOptions = {}): unknown[] {
    const def = REGISTRY[typeId];
    const block = makeBlock(typeId, { constraints, base: opts.base });
    const ctx = opts.label || JSON.stringify(constraints);

    let data: unknown[] = [];
    expect(() => { data = def.generate(block); }, `${typeId} threw for ${ctx}`).not.toThrow();

    expect(Array.isArray(data), `${typeId} did not return an array for ${ctx}`).toBe(true);

    if (isLayoutType(typeId)) {
        // Sheet furniture draws itself from constraints; it has no generated content.
        expect(data.length).toBe(0);
        return data;
    }

    const want = block.numberOfExercises;
    if (data.length < want) {
        shortfalls.push({ typeId, got: data.length, want, constraints: ctx });
        // An empty block is unusable on the sheet, so the settings a teacher reaches in
        // one click (defaults, a sidebar leaf, a leerjaar seed) must never produce one.
        if (!opts.allowEmpty) expect(data.length, `${typeId} produced nothing for ${ctx}`).toBeGreaterThanOrEqual(1);
    } else {
        expect(data.length, `${typeId} overproduced for ${ctx}`).toBe(want);
    }

    const ids = data.map(d => (d as { id?: string }).id);
    expect(new Set(ids).size, `${typeId} produced duplicate ids for ${ctx}`).toBe(ids.length);

    for (const item of data) {
        const rec = item as Record<string, unknown>;
        if ('isManuallyEdited' in rec) {
            expect(rec.isManuallyEdited, `${typeId}: freshly generated item claims a manual edit`).toBe(false);
        }
    }
    assertNoBadNumbers(data, `${typeId}`);
    return data;
}

// ── (a) registry defaults ────────────────────────────────────────────────────
describe.each(typeIds)('defaults: %s', (typeId) => {
    test('generates at its default count, 5 runs', () => {
        for (let i = 0; i < 5; i++) runOne(typeId, {}, { label: 'registry defaults' });
    });
});

// ── (b) every sidebar leaf ───────────────────────────────────────────────────
const leaves = appStructureLeaves();

describe('APP_STRUCTURE leaves', () => {
    test('every leaf typeId has a registry row', () => {
        const missing = leaves.filter(l => !REGISTRY[l.typeId]).map(l => `${l.label} (${l.typeId})`);
        expect(missing).toEqual([]);
    });

    test.each(leaves.map(l => [`${l.typeId} · ${l.label}`, l] as const))('%s', (_name, leaf) => {
        for (let i = 0; i < 3; i++) runOne(leaf.typeId, leaf.constraints, { label: `leaf ${leaf.label}` });
    });
});

// ── (c) pairwise over the declared option space ──────────────────────────────
// PAIRWISE_CAP (200) is a safety ceiling, not the working number: the greedy row
// generator in pairwise() stops as soon as every pair is covered, and the largest
// declared space (hr-std-gemengd, 8 keys) needs 56 rows to do that — so 200 leaves
// headroom for a future space without letting a broken one silently truncate.
describe.each(typeIds)('constraint matrix: %s', (typeId) => {
    const space = constraintSpaceFor(typeId);
    const combos = pairwise(space, PAIRWISE_CAP);
    const keys = Object.keys(space).filter(k => (space[k]?.length ?? 0) > 0);

    // Recomputed independently of pairwise()'s own bookkeeping: this is what proves the
    // matrix actually reaches full coverage rather than trusting the row generator's
    // internal "uncovered" set, which would pass even if the generator quietly gave up.
    function requiredPairs(): Set<string> {
        const req = new Set<string>();
        for (let a = 0; a < keys.length; a++) {
            for (let b = a + 1; b < keys.length; b++) {
                for (let i = 0; i < space[keys[a]].length; i++) {
                    for (let j = 0; j < space[keys[b]].length; j++) req.add(`${keys[a]}=${i}|${keys[b]}=${j}`);
                }
            }
        }
        return req;
    }

    function coveredPairs(): Set<string> {
        const cov = new Set<string>();
        for (const combo of combos) {
            for (let a = 0; a < keys.length; a++) {
                for (let b = a + 1; b < keys.length; b++) {
                    const ka = keys[a], kb = keys[b];
                    if (!(ka in combo) || !(kb in combo)) continue;
                    const ia = space[ka].indexOf(combo[ka]);
                    const ib = space[kb].indexOf(combo[kb]);
                    if (ia < 0 || ib < 0) continue;
                    cov.add(`${ka}=${ia}|${kb}=${ib}`);
                }
            }
        }
        return cov;
    }

    test(`covers ${combos.length} pairwise combinations`, () => {
        // Every exercise type must declare its options — an empty space means the sweep
        // silently skips it, which is exactly the gap this suite exists to close.
        if (!isLayoutType(typeId)) expect(Object.keys(space).length, `${typeId} has no CONSTRAINT_SPACE entry`).toBeGreaterThan(0);

        if (keys.length >= 2) {
            const required = requiredPairs();
            const covered = coveredPairs();
            console.log(`${typeId}: ${combos.length} rows / ${required.size} pairs`);
            // A space that cannot be covered within the cap must fail loudly, with the
            // numbers, rather than pass on however many rows it happened to reach.
            expect(covered.size, `${typeId}: only ${covered.size}/${required.size} pairs covered by ${combos.length} rows (cap ${PAIRWISE_CAP})`).toBe(required.size);
        }

        for (const combo of combos) runOne(typeId, combo, { allowEmpty: true });
    });
});

// ── (d) leerjaar seeds ───────────────────────────────────────────────────────
describe.each(LEERJAREN)('leerjaar %i base', (grade) => {
    const base: BaseSettings = { ...DEFAULT_BASE, ...GRADE_PRESETS[grade] };
    test('every type generates under this grade seed', () => {
        for (const typeId of exerciseTypeIds) runOne(typeId, {}, { base, label: `leerjaar ${grade}` });
    });
});

// ── (e) every type at the top of its own max list ────────────────────────────
// The 1e9 line: a type's didactic ceiling (the top of its REGISTRY maxPresets list) is a
// setting a teacher reaches in one click, so it must generate a full, printable block — for every branch the config
// switches lists on, plus the stress knobs that widen an exercise the most.

// Keys the registry's maxPresets branches on; a type gets one case per value combination.
const BRANCH_KEYS = ['numberType', 'layout', 'subType', 'preset', 'multiplicationMode', 'viewMode', 'rasterVorm', 'operator'];
// Widest setting of a length knob, combined on top of every branch case.
const STRESS: Record<string, unknown> = { termCount: 4, numberOfTerms: 4, setSize: 6 };

// Types that cannot yet hold their ceiling. Recorded and printed, not failed, because the
// fix lands in generator files other agents own (1e9 plan, Phase 1 A/B); delete a line
// when the report below says that type passes.
const KNOWN_CEILING_FAILURES: Record<string, string> = {};

function ceilingCases(typeId: string): Array<Record<string, unknown>> {
    const def = REGISTRY[typeId];
    if (!def.maxPresets) return [];
    const space = constraintSpaceFor(typeId);
    let combos: Array<Record<string, unknown>> = [{}];
    for (const k of BRANCH_KEYS.filter(k => (space[k]?.length ?? 0) > 0)) {
        combos = combos.flatMap(c => space[k].map(v => ({ ...c, [k]: v })));
    }
    const stressKeys = Object.keys(STRESS).filter(k => k in space);
    const out = new Map<string, Record<string, unknown>>();
    for (const c of combos) {
        const range = def.maxPresets({ ...def.defaultConstraints(typeId), ...c });
        if (!range || range.presets.length === 0) continue;
        const atTop = { ...c, [range.key]: Math.max(...range.presets) };
        out.set(JSON.stringify(atTop), atTop);
        if (stressKeys.length) {
            const stressed = { ...atTop, ...Object.fromEntries(stressKeys.map(k => [k, STRESS[k]])) };
            out.set(JSON.stringify(stressed), stressed);
        }
    }
    return [...out.values()];
}

// A generated label ("… undefined miljoen", "NaN") prints as garbage even when every number is finite.
function assertNoBadText(value: unknown, path: string, seen = new Set<unknown>()): void {
    if (typeof value === 'string') {
        expect(/undefined|NaN/.test(value), `${path} = "${value}"`).toBe(false);
        return;
    }
    if (value === null || typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) assertNoBadText(v, `${path}.${k}`, seen);
}

interface CeilingOutcome { typeId: string; known: boolean; failures: string[]; cases: number }
const ceilingOutcomes: CeilingOutcome[] = [];

const ceilingTypeIds = exerciseTypeIds.filter(t => REGISTRY[t].maxPresets);

describe.each(ceilingTypeIds)('ceiling: %s', (typeId) => {
    const cases = ceilingCases(typeId);
    test(`generates at its own top across ${cases.length} branch case(s)`, () => {
        expect(cases.length, `${typeId} declares maxPresets but no branch reaches a list`).toBeGreaterThan(0);
        const failures: string[] = [];
        for (const c of cases) {
            for (let i = 0; i < 3; i++) {
                try {
                    // allowEmpty stays off: the top of a list is one click away, an empty block there is a bug.
                    assertNoBadText(runOne(typeId, c, { label: `ceiling ${JSON.stringify(c)}` }), typeId);
                } catch (e) {
                    failures.push(`${JSON.stringify(c)}: ${String((e as Error).message ?? e).split('\n')[0]}`);
                    break;
                }
            }
        }
        const known = typeId in KNOWN_CEILING_FAILURES;
        ceilingOutcomes.push({ typeId, known, failures, cases: cases.length });
        if (!known) expect(failures, `${typeId} fails at its ceiling`).toEqual([]);
    });
});

test('report: ceiling pass known failures', () => {
    const lines: string[] = [];
    for (const o of ceilingOutcomes.filter(o => o.known)) {
        if (o.failures.length === 0) lines.push(`  ${o.typeId}: now PASSES all ${o.cases} case(s) — remove it from KNOWN_CEILING_FAILURES`);
        else lines.push(`  ${o.typeId} (${KNOWN_CEILING_FAILURES[o.typeId]}): ${o.failures.length}/${o.cases} case(s) fail; first: ${o.failures[0]}`);
    }
    if (lines.length) console.warn(['', '[matrix] ceiling pass (e), known failures:', ...lines, ''].join('\n'));
});

// Declared last so it runs last: a console.warn from an `afterAll` hook is dropped by
// the reporter, while one inside a test is printed with the run.
test('report: constraint sets that under-produce', () => {
    if (shortfalls.length === 0) return;
    // Grouped so a family that under-produces across many combos reads as one entry.
    const byType = new Map<string, Shortfall[]>();
    for (const s of shortfalls) {
        const list = byType.get(s.typeId) ?? [];
        list.push(s);
        byType.set(s.typeId, list);
    }
    const lines = [...byType.entries()].map(([typeId, list]) => {
        const worst = list.reduce((a, b) => (a.got / a.want <= b.got / b.want ? a : b));
        return `  ${typeId}: ${list.length} combo(s) short; worst ${worst.got}/${worst.want} for ${worst.constraints}`;
    });
    console.warn(['', '[matrix] generators returned fewer exercises than requested:', ...lines, ''].join('\n'));
});
