import { test, expect, vi, afterEach } from 'vitest';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { generateGetallenasExercisesNoted } from '../services/getallenas/getallenasGenerator';
import { generateGetallenrijExercisesNoted } from '../services/getallenrij/getallenrijGenerator';
import type { MathBlock } from '../services/math/types';

// Golden output recorded from the generators BEFORE the mixed-jumps engine: with fewer than
// 2 distinct jumps (or rational) the draw order and output must stay byte-identical.
const GOLDEN = new URL('./fixtures/getallenJumps.legacy.json', import.meta.url);

function seeded(seed: number) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

const blk = (typeId: string, constraints: Record<string, unknown>, n = 6) => ({ typeId, numberOfExercises: n, constraints } as unknown as MathBlock);
const CASES: [string, string, Record<string, unknown>][] = [
    ['as', 'getallenas', { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6 }],
    ['as-beide', 'getallenas', { numberType: 'natural', maxGetal: 1000, step: 50, direction: 'beide', hardMode: true, ticks: 8 }],
    ['as-dec', 'getallenas', { numberType: 'decimal', maxGetal: 10, step: 0.5, direction: 'left', hardMode: false, ticks: 6 }],
    ['as-geh', 'getallenas', { numberType: 'geheel', maxGetal: 100, minGetal: -50, step: 10, direction: 'beide', hardMode: false, ticks: 6 }],
    ['as-rat', 'getallenas', { numberType: 'rational', maxGetal: 10, step: 1, direction: 'beide', hardMode: false, ticks: 6, fractionStep: 4, jumps: [1, 2] }],
    ['as-one', 'getallenas', { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6, jumps: [10] }],
    ['as-same', 'getallenas', { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6, jumps: [10, 10] }],
    ['as-shrink', 'getallenas', { numberType: 'natural', maxGetal: 20, step: 5, direction: 'right', hardMode: false, ticks: 6 }],
    ['rij', 'getallenrijen', { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6, numberMask: {}, fractionStep: 4, maxTeller: 25 }],
    ['rij-mask', 'getallenrijen', { numberType: 'natural', maxGetal: 1000, step: 5, direction: 'beide', hardMode: true, ticks: 6, numberMask: { H: true, E: true }, fractionStep: 4, maxTeller: 25 }],
    ['rij-dec', 'getallenrijen', { numberType: 'decimal', maxGetal: 10, step: 0.5, direction: 'left', hardMode: false, ticks: 6, numberMask: { T: true }, fractionStep: 4, maxTeller: 25 }],
    ['rij-rat', 'getallenrijen', { numberType: 'rational', maxGetal: 10, step: 1, direction: 'beide', hardMode: false, ticks: 6, numberMask: {}, fractionStep: 4, maxTeller: 25, jumps: [1, 2], jumpMode: 'in-rij' }],
    ['rij-one', 'getallenrijen', { numberType: 'natural', maxGetal: 100, step: 5, direction: 'right', hardMode: false, ticks: 6, numberMask: {}, fractionStep: 4, maxTeller: 25, jumps: [], jumpMode: 'in-rij' }],
    ['rij-fixed', 'getallenrijen', { numberType: 'natural', maxGetal: 20, step: 50, direction: 'right', hardMode: false, ticks: 6, numberMask: {}, fractionStep: 4, maxTeller: 25, jumps: [7, 7] }],
];

function run() {
    const out: Record<string, unknown> = {};
    for (const [name, typeId, c] of CASES) {
        const rng = seeded(1234 + name.length);
        vi.spyOn(Math, 'random').mockImplementation(rng);
        const gen = typeId === 'getallenas' ? generateGetallenasExercisesNoted : generateGetallenrijExercisesNoted;
        out[name] = gen(blk(typeId, c));
        vi.restoreAllMocks();
    }
    return JSON.parse(JSON.stringify(out));
}

afterEach(() => vi.restoreAllMocks());

test('0/1 distinct jumps and rational keep the pre-jumps output draw for draw', () => {
    const now = run();
    if (process.env.WRITE_GOLDEN) { writeFileSync(GOLDEN, JSON.stringify(now, null, 1)); return; }
    expect(existsSync(GOLDEN)).toBe(true);
    expect(now).toEqual(JSON.parse(readFileSync(GOLDEN, 'utf8')));
});
