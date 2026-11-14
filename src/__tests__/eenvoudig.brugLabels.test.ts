import { describe, test, expect } from 'vitest';
import cards from '../config/eenvoudig/cards.json';
import { allVariants, type CardVariant, type EenvoudigData } from '../config/eenvoudig/cards';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { REGISTRY } from '../config/exerciseRegistry';
import type { Equation, MathBlock } from '../services/math/types';
import { mulberry32 } from './helpers/limitHarness';

// Owner 2026-11-14: card labels about the brug must say what the sums do. "Geen brug nodig" cards
// made 5 + 9 in leerjaar 1; now they split into Zonder brug / Brug bij E or say "Met en zonder brug".

const PLACES = ['E', 'T', 'H', 'D', 'TD', 'HD', 'M'];

// Per place: did the column cross (carry for +, borrow for −), and did its digits land exactly on 10 (a round result).
function columns(ex: Equation): { place: string; crosses: boolean; round: boolean }[] | null {
    const ops = ex.operands;
    if (ops.length !== 2 || ops.some(o => typeof o !== 'number' || !Number.isInteger(o) || o < 0)) return null;
    let [a, b] = ops as number[];
    const minus = ex.operator === '-';
    const out = [];
    for (let i = 0; a > 0 || b > 0; i++) {
        const da = a % 10, db = b % 10;
        out.push({ place: PLACES[i] ?? `p${i}`, crosses: minus ? da < db : da + db >= 10, round: !minus && da + db === 10 && a % 10 + b % 10 === 10 });
        a = Math.floor(a / 10); b = Math.floor(b / 10);
    }
    return out;
}

function generate(v: CardVariant, seed: number): Equation[] {
    const r = resolveCard(v);
    const block = { id: v.id, typeId: r.typeId, numberOfExercises: 20, constraints: r.constraints, exercises: [], layoutPreset: 'inline-short' } as unknown as MathBlock;
    const real = Math.random;
    Math.random = mulberry32(seed);
    try { return REGISTRY[r.typeId].generate(block) as Equation[]; } finally { Math.random = real; }
}

const variants = allVariants(cards as unknown as EenvoudigData).filter(v => /^hr-std-(optellen|aftrekken)/.test(v.leafId));
const byLabel = (re: RegExp) => variants.filter(v => re.test(v.l));

describe('brug labels on + / − cards match the sums', () => {
    test('"Geen brug nodig": no column crosses, except a sum landing exactly on a round number', () => {
        const bad: string[] = [];
        for (const v of byLabel(/^Geen brug nodig$/)) for (const seed of [1, 2, 3]) for (const ex of generate(v, seed)) {
            const cols = columns(ex);
            if (cols?.some(c => c.crosses && !c.round)) bad.push(`${v.id} ${ex.operands.join(ex.operator ?? '+')}`);
        }
        expect(bad.slice(0, 5)).toEqual([]);
    });

    test('leerjaar 1 T + T and T − T tot 20: Zonder brug never crosses at E, Brug bij E always does', () => {
        const pairs = [['C:c007-l1', 'C:c007m-l1'], ['C:c008-l1', 'C:c008m-l1']];
        for (const [zonderId, metId] of pairs) {
            const zonder = variants.find(v => v.id === zonderId)!;
            const met = variants.find(v => v.id === metId)!;
            expect(zonder.l).toBe('Zonder brug');
            expect(met.l).toBe('Brug bij E');
            for (const seed of [1, 2, 3]) {
                const z = generate(zonder, seed);
                const m = generate(met, seed);
                expect(z.length).toBeGreaterThan(0);
                expect(m.length).toBeGreaterThan(0);
                for (const ex of z) expect(columns(ex)![0].crosses).toBe(false);
                for (const ex of m) expect(columns(ex)![0].crosses).toBe(true);
            }
        }
    });

    test('the default (first) variant of the leerjaar 1 tot-20 cards is Zonder brug', () => {
        const data = cards as unknown as EenvoudigData;
        for (const name of ['T + T', 'T − T']) {
            const card = data.types.find(t => t.name === name && t.max === 20 && t.grades.includes(1))!;
            expect(card.vars[0].l).toBe('Zonder brug');
        }
    });
});
