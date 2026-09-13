// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { APP_STRUCTURE } from '../config/appstructure';
import { constraintSpaceFor } from '../config/constraintSpace';
import { BlockWidthProvider, FULL_BLOCK_WIDTH_PX } from '../components/viewer/BlockWidthContext';
import { makeBlock, isLayoutType } from './helpers/makeBlock';
import type { MathBlock } from '../services/math/types';

// ── Stale settings ───────────────────────────────────────────────────────────
// An exercise renders from its own data; `block.constraints` may only steer layout.
// Between a structural setting change and the teacher's next click on Genereer the
// sheet holds OLD exercises under NEW settings — the store flags the block stale but
// still renders it. A viewer that derives structure (place count, operator, unit,
// range, sub-type) from the live constraints instead of from the exercise takes the
// whole sheet down there (see fix(plaatswaarde) ffcccdc).
//
// So: generate once, then render the untouched exercises under every single-key
// constraint drift the option space allows, plus one "everything moved at once"
// bundle. The bar is the smoke suite's: no throw, no React console.error.

const WIDTHS = [FULL_BLOCK_WIDTH_PX, 338];

// CONSTRAINT_SPACE deliberately lists only what a GENERATOR reads. These keys are the
// other half: settings only the viewer reads, which a teacher can still move under
// already-generated exercises. Keyed by typeId prefix.
// SYNC: option values mirror the plugins under src/components/configurator/plugins/.
const VIEWER_ONLY_DRIFT: Array<[string, Record<string, unknown[]>]> = [
    ['hr-std-', { equationType: ['normal', 'puntoefening'], compenserenScaffold: ['tussenstap', 'geen'] }],
    ['cijferen-', { extraCols: [0, 3], extraRows: [0, 3] }],
    ['breuken', { groupingMode: ['standaard', 'gebalanceerd', 'per-deel'] }],
    ['controleren', { prefill: ['niets', 'teken', 'alles'] }],
    ['herleidingen', {
        tablePrompt: [false, true],
        tableAnswer: ['blank', 'filled', 'hidden'],
        // A unit selection that no longer contains the exercise's own units.
        units: [['m'], ['km', 'm', 'cm'], ['ha', 'a', 'ca'], ['mg']],
    }],
    ['getalpatronen', { operatorsShown: [0, 3] }],
    ['geld-', { showVoorbeelden: [false, true], voorbeeldTypes: [[], [500, 200]] }],
    ['mab-', { showBox: [false, true] }],
    ['vormleer-', { showEqualSides: [false, true], showRightAngles: [false, true], showMarks: [false, true] }],
];

const viewerOnlyDriftFor = (typeId: string): Record<string, unknown[]> =>
    Object.assign({}, ...VIEWER_ONLY_DRIFT.filter(([prefix]) => typeId.startsWith(prefix)).map(([, space]) => space));

interface Leaf { typeId: string; label: string; constraints: Record<string, unknown> }

function appStructureLeaves(): Leaf[] {
    const out: Leaf[] = [];
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

const leaves = appStructureLeaves().filter(l => !isLayoutType(l.typeId) && EXERCISE_UI[l.typeId]);

let consoleError: ReturnType<typeof vi.spyOn>;

// Generators call Math.random directly. A seeded stream makes a failure here
// reproducible instead of a once-a-week flake in `npm run check`; STALE_SEED=<n>
// re-runs the whole sweep over different generated data.
const SEED = Number((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.STALE_SEED ?? 0x5eed);

function seedRandom(seed: number) {
    let a = seed >>> 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    });
}

beforeEach(() => { consoleError = vi.spyOn(console, 'error').mockImplementation(() => { }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

/** One drifted render at both widths and both solution states; returns the failure lines. */
function renderDrift(block: MathBlock, drift: Record<string, unknown>, what: string): string[] {
    const drifted = { ...block, constraints: { ...block.constraints, ...drift } } as MathBlock;
    const { Viewer } = EXERCISE_UI[block.typeId];
    const fails: string[] = [];

    for (const width of WIDTHS) {
        for (const showSolutions of [false, true]) {
            consoleError.mockClear();
            try {
                render(
                    <BlockWidthProvider value={width}>
                        <Viewer block={drifted} showSolutions={showSolutions} />
                    </BlockWidthProvider>,
                );
            } catch (err) {
                fails.push(`${what} @${width}px sol=${showSolutions}: THREW ${(err as Error).message}`);
                cleanup();
                continue;
            }
            const errors = consoleError.mock.calls.map((args: unknown[]) => String(args[0]));
            if (errors.length) fails.push(`${what} @${width}px sol=${showSolutions}: console.error ${errors[0]}`);
            cleanup();
        }
    }
    return fails;
}

describe.each(leaves.map(l => [`${l.typeId} · ${l.label}`, l] as const))('%s', (_name, leaf) => {
    const space = { ...constraintSpaceFor(leaf.typeId), ...viewerOnlyDriftFor(leaf.typeId) };
    const keys = Object.keys(space);

    // "Everything moved at once", the worst a teacher reaches in one session.
    const bundle = Object.fromEntries(keys.map(k => [k, space[k][space[k].length - 1]]));

    /** Generate under `origin`, then render those exercises under drifted settings. */
    function sweep(origin: Record<string, unknown>, originName: string, away: Record<string, unknown>, valuesFor: (key: string) => unknown[]): string[] {
        // Three exercises, not the type's default count: a structural mismatch shows on
        // the first item, and the sweep renders thousands of blocks per leaf.
        const block = makeBlock(leaf.typeId, { constraints: origin, id: leaf.typeId, block: { numberOfExercises: 3 } });
        const def = REGISTRY[leaf.typeId];
        const data = def.generate(block);
        // An over-restrictive combination can legitimately produce nothing to render.
        if (!data.length) return [];
        (block as unknown as Record<string, unknown>)[def.exerciseField] = data;

        const fails: string[] = [];
        // One key at a time, exhaustively — a crashing value must never be sampled away.
        for (const key of keys) {
            const seen = new Set<string>([JSON.stringify(block.constraints[key])]);
            for (const value of valuesFor(key)) {
                const sig = JSON.stringify(value);
                if (seen.has(sig)) continue;
                seen.add(sig);
                fails.push(...renderDrift(block, { [key]: value }, `${originName}: ${key}=${sig}`));
            }
        }
        if (keys.length) fails.push(...renderDrift(block, away, `${originName}: drift bundle`));
        return fails;
    }

    test('renders its generated exercises under every drifted setting', () => {
        seedRandom(SEED);
        // Both directions: the default block drifting outward across every option, and
        // the extreme block drifting back — an exercise generated large must survive a
        // small setting just as the small one must survive a large.
        const fails = [
            ...sweep(leaf.constraints, 'from leaf defaults', bundle, key => space[key]),
            ...(keys.length ? sweep(bundle, 'from drift bundle', leaf.constraints, key => [leaf.constraints[key] ?? space[key][0]]) : []),
        ];
        expect(fails, `${leaf.typeId} · ${leaf.label}`).toEqual([]);
        // A wide option space (a raster of 1000 cells × every drift) outruns the default.
    }, 120_000);
});

test('every exercise type is reachable from a sidebar leaf, so the sweep covers it', () => {
    const covered = new Set(leaves.map(l => l.typeId));
    const uncovered = Object.keys(EXERCISE_UI).filter(t => !isLayoutType(t) && !covered.has(t));
    expect(uncovered).toEqual([]);
});

test('every exercise leaf declares an option space to drift', () => {
    const bare = leaves.filter(l => Object.keys(constraintSpaceFor(l.typeId)).length === 0).map(l => l.typeId);
    expect([...new Set(bare)]).toEqual([]);
});
