import { describe, test, expect, afterEach } from 'vitest';
import type { GetallenasExercise, PatroonExercise, Fraction } from '../services/math/types';
import { generateGetallenasExercisesNoted } from '../services/getallenas/getallenasGenerator';
import { generateGetallenrijExercisesNoted } from '../services/getallenrij/getallenrijGenerator';
import { generatePatroonExercisesNoted } from '../services/patroon/patroonGenerator';
import { generateKettingExercisesNoted } from '../services/patroon/kettingGenerator';
import { makeBlock, generateFor } from './helpers/makeBlock';

// Limit-audit WP2: every value a row/pattern generator prints stays within the block's
// bounds, also on the settings that used to overrun them. Seeded so a failure reproduces;
// the limit checks go through the registry generator, the note checks through *Noted.

const SEEDS = [11, 22, 33, 44, 55];

function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const realRandom = Math.random;
afterEach(() => { Math.random = realRandom; });
const seeded = (seed: number) => { Math.random = mulberry32(seed); };

const num = (v: number | Fraction) => (typeof v === 'number' ? v : (v.whole ?? 0) + v.n / v.d);
const block = (typeId: string, constraints: Record<string, unknown>, count = 20) => makeBlock(typeId, { constraints, block: { numberOfExercises: count } });
const lines = (typeId: string, c: Record<string, unknown>) => generateFor(block(typeId, c)) as GetallenasExercise[];
const patterns = (typeId: string, c: Record<string, unknown>) => generateFor(block(typeId, c)) as PatroonExercise[];

const applyStep = (prev: number, op: string, operand: number) =>
    op === '+' ? prev + operand : op === '-' ? prev - operand : op === 'x' ? prev * operand : prev / operand;

// Values follow the printed cycle and stay within [lo, hi].
function expectPatternWithin(ex: PatroonExercise, lo: number, hi: number) {
    const vals = ex.values;
    for (const v of vals) {
        expect(v).toBeGreaterThanOrEqual(lo);
        expect(v).toBeLessThanOrEqual(hi);
    }
    for (let i = 1; i < vals.length; i++) {
        const st = ex.cycle[(i - 1) % ex.cycle.length];
        expect(applyStep(vals[i - 1], st.op, st.operand)).toBeCloseTo(vals[i], 6);
    }
}

describe('[L1] getallenas / getallenrijen stay within [lo, max]', () => {
    const cases: Record<string, unknown>[] = [
        { numberType: 'natural', maxGetal: 20, step: 5, ticks: 6, direction: 'right' },
        { numberType: 'natural', maxGetal: 20, step: 5, ticks: 6, direction: 'left' },
        { numberType: 'natural', maxGetal: 20, step: 50, ticks: 6, direction: 'beide' },
        { numberType: 'natural', maxGetal: 100, step: 100, ticks: 10, direction: 'beide' },
        { numberType: 'decimal', maxGetal: 20, step: 5, ticks: 10, direction: 'left' },
        { numberType: 'geheel', maxGetal: 20, minGetal: 0, step: 25, ticks: 8, direction: 'beide' },
        { numberType: 'geheel', maxGetal: 20, minGetal: -10, step: 10, ticks: 6, direction: 'right' },
    ];
    for (const typeId of ['getallenas', 'getallenrijen']) for (const c of cases) {
        test(`${typeId} ${JSON.stringify(c)}`, () => {
            const lo = c.numberType === 'geheel' ? (c.minGetal as number) : 0;
            for (const seed of SEEDS) {
                seeded(seed);
                const items = lines(typeId, c);
                expect(items).toHaveLength(20);
                for (const ex of items) {
                    expect(ex.values).toHaveLength(ex.tickCount);
                    expect(ex.tickCount).toBeGreaterThanOrEqual(4);
                    for (const v of ex.values ?? []) {
                        expect(num(v)).toBeGreaterThanOrEqual(lo);
                        expect(num(v)).toBeLessThanOrEqual(c.maxGetal as number);
                    }
                }
            }
        });
    }

    test('keeps the step and drops a tick when that is enough (Leerjaar 1 default)', () => {
        seeded(11);
        const { items, note } = generateGetallenasExercisesNoted(block('getallenas', { maxGetal: 20, step: 5, ticks: 6 }));
        expect(items.every(ex => ex.step === 5 && ex.tickCount === 5)).toBe(true);
        expect(note).toBe('Sprong +5 met 6 streepjes past niet tot 20: 5 streepjes gebruikt.');
    });

    test('shrinks the step when even four ticks overrun', () => {
        seeded(11);
        const { items, note } = generateGetallenrijExercisesNoted(block('getallenrijen', { maxGetal: 20, step: 50, ticks: 6 }));
        expect(items.every(ex => ex.step === 2 && ex.tickCount === 6)).toBe(true);
        expect(note).toBe('Sprong +50 past niet tot 20: sprong +2 gebruikt.');
    });

    test('a line that fits gets no note', () => {
        seeded(11);
        expect(generateGetallenasExercisesNoted(block('getallenas', { maxGetal: 100, step: 5, ticks: 6 })).note).toBeNull();
    });
});

describe('[L10] rational getallenrijen stay within maxTeller', () => {
    const cases: Record<string, unknown>[] = [
        { fractionStep: 4, maxTeller: 1, ticks: 6, direction: 'right' },
        { fractionStep: 4, maxTeller: 4, ticks: 6, direction: 'beide' },
        { fractionStep: 2, maxTeller: 3, ticks: 6, direction: 'right' },
        { fractionStep: 4, maxTeller: 5, ticks: 9, direction: 'left' },
        { fractionStep: 4, maxTeller: 5, ticks: 10, direction: 'left', gelijknamig: true, allowMixed: false },
    ];
    for (const c of cases) {
        test(JSON.stringify(c), () => {
            const d = c.fractionStep as number;
            for (const seed of SEEDS) {
                seeded(seed);
                const items = lines('getallenrijen', { numberType: 'rational', ...c });
                expect(items).toHaveLength(20);
                for (const ex of items) {
                    expect(ex.values).toHaveLength(ex.tickCount);
                    for (const v of ex.values ?? []) {
                        if (typeof v !== 'number') expect(v.d).toBeGreaterThan(0);
                        expect(num(v)).toBeGreaterThanOrEqual(0);
                        expect(Math.round(num(v) * d)).toBeLessThanOrEqual(c.maxTeller as number);
                    }
                }
            }
        });
    }

    test('notes the shorter row; a row that fits keeps its cells and gets no note', () => {
        seeded(11);
        expect(generateGetallenrijExercisesNoted(block('getallenrijen', { numberType: 'rational', fractionStep: 2, maxTeller: 3, ticks: 6 })).note)
            .toBe('Hoogste teller 3 bij noemer 2: 4 vakjes i.p.v. 6.');
        const { items, note } = generateGetallenrijExercisesNoted(block('getallenrijen', { numberType: 'rational', fractionStep: 4, maxTeller: 25, ticks: 6 }));
        expect(note).toBeNull();
        expect(items.every(ex => ex.tickCount === 6)).toBe(true);
    });
});

describe('[L9] getalpatronen: "Stap (max)" bounds a masked +/− step', () => {
    test('a mask that fits under the max: operands ≤ max and on the masked places', () => {
        for (const seed of SEEDS) {
            seeded(seed);
            const items = patterns('getalpatronen', { maxGetal: 1000, ops: ['+'], opSettings: { '+': { max: 50, mask: { T: true, E: true } } } });
            expect(items).toHaveLength(20);
            for (const ex of items) for (const st of ex.cycle) {
                expect(st.operand).toBeLessThanOrEqual(50);
                expect(st.operand % 10).not.toBe(0);
                expect(st.operand).toBeGreaterThan(10);
            }
        }
    });

    test('a mask above the max is dropped with a note, operands stay ≤ max', () => {
        for (const seed of SEEDS) {
            seeded(seed);
            const items = patterns('getalpatronen', { maxGetal: 1000, ops: ['+'], opSettings: { '+': { max: 50, mask: { H: true, T: true } } } });
            expect(items).toHaveLength(20);
            for (const ex of items) {
                expectPatternWithin(ex, 1, 1000);
                for (const st of ex.cycle) expect(st.operand).toBeLessThanOrEqual(50);
            }
        }
        seeded(11);
        expect(generatePatroonExercisesNoted(block('getalpatronen', { maxGetal: 1000, ops: ['+'], opSettings: { '+': { max: 50, mask: { H: true, T: true } } } })).note)
            .toBe('De getalopbouw bij optellen (H, T) past niet onder de grootste stap 50 en is genegeerd.');
    });
});

describe('[E5a] getalpatronen / kettingsommen keep the chosen operations', () => {
    test('getalpatronen with a lone × stays a × pattern within the max', () => {
        for (const seed of SEEDS) {
            seeded(seed);
            const items = patterns('getalpatronen', { maxGetal: 100, ticks: 7, ops: ['x'], opSettings: { x: { max: 12, mask: {} } } });
            expect(items).toHaveLength(20);
            for (const ex of items) {
                expect(ex.cycle.every(st => st.op === 'x')).toBe(true);
                expectPatternWithin(ex, 1, 100);
            }
        }
    });

    test('getalpatronen that cannot fit gives fewer patterns and says so', () => {
        for (const seed of SEEDS) {
            seeded(seed);
            const items = patterns('getalpatronen', { maxGetal: 100, ticks: 6, ops: ['-'], opSettings: { '-': { max: 1000, mask: { H: true } } } });
            for (const ex of items) {
                expect(ex.cycle.every(st => st.op === '-')).toBe(true);
                expectPatternWithin(ex, 1, 100);
            }
        }
        seeded(11);
        const { items, note } = generatePatroonExercisesNoted(block('getalpatronen', { maxGetal: 100, ticks: 6, ops: ['-'], opSettings: { '-': { max: 1000, mask: { H: true } } } }));
        expect(items).toHaveLength(0);
        expect(note).toBe('Geen patroon mogelijk met deze bewerkingen tussen 1 en 100.');
    });

    for (const op of ['x', ':']) {
        test(`kettingsommen with only ${op} at max 20 keeps ${op}`, () => {
            for (const seed of SEEDS) {
                seeded(seed);
                const items = patterns('kettingsommen', { maxGetal: 20, chainLength: 4, ops: [op] });
                expect(items).toHaveLength(20);
                for (const ex of items) {
                    expect(ex.cycle.every(st => st.op === op)).toBe(true);
                    expectPatternWithin(ex, 0, 20);
                }
            }
        });
    }

    test('kettingsommen that cannot fit gives no chain and says so', () => {
        seeded(11);
        const { items, note } = generateKettingExercisesNoted(block('kettingsommen', { maxGetal: 20, chainLength: 5, ops: ['x'] }));
        expect(items).toHaveLength(0);
        expect(note).toBe('Geen kettingsom mogelijk met deze bewerkingen tot 20.');
    });
});
