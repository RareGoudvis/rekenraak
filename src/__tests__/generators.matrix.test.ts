import { describe, test, expect } from 'vitest';
import { REGISTRY } from '../config/exerciseRegistry';
import { APP_STRUCTURE } from '../config/appstructure';
import { constraintSpaceFor } from '../config/constraintSpace';
import { DEFAULT_BASE, type BaseSettings } from '../config/baseSettings';
import { GRADE_PRESETS, LEERJAREN } from '../config/gradePresets';
import { makeBlock, isLayoutType } from './helpers/makeBlock';
import { pairwise } from './helpers/pairwise';

// ── The sweep ────────────────────────────────────────────────────────────────
// Every generator, across every constraint option a teacher can reach. Four passes:
//   a) registry defaults, repeated (generators are random — one run proves little)
//   b) every APP_STRUCTURE leaf's defaultConstraints (the sidebar's real entry points)
//   c) pairwise combinations from CONSTRAINT_SPACE (every option value paired with
//      every other at least once), capped per type so the suite stays fast
//   d) every Leerjaar seed, which is how a teacher changes difficulty globally
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

function runOne(typeId: string, constraints: Record<string, unknown>, opts: RunOptions = {}) {
    const def = REGISTRY[typeId];
    const block = makeBlock(typeId, { constraints, base: opts.base });
    const ctx = opts.label || JSON.stringify(constraints);

    let data: unknown[] = [];
    expect(() => { data = def.generate(block); }, `${typeId} threw for ${ctx}`).not.toThrow();

    expect(Array.isArray(data), `${typeId} did not return an array for ${ctx}`).toBe(true);

    if (isLayoutType(typeId)) {
        // Sheet furniture draws itself from constraints; it has no generated content.
        expect(data.length).toBe(0);
        return;
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
