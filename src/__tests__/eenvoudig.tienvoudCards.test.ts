import { describe, test, expect, beforeAll } from 'vitest';
import { loadEenvoudigData, allVariants, type CardVariant, type EenvoudigData } from '../config/eenvoudig/cards';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { generateForBlock } from '../services/generateDispatch';
import type { Equation, MathBlock } from '../services/math/types';
import { choicesFor } from '../oefenen/zelf/zelfSessie';

// Owner 2026-11-14: × / : 10, 100 (leerjaar 3) and 1000 (leerjaar 4), E × HTE in leerjaar 3, E × DHTE in 4.

let data: EenvoudigData;
let variants: CardVariant[];
beforeAll(async () => { data = await loadEenvoudigData(); variants = allVariants(data); });

const generate = (id: string, n = 200): Equation[] => {
    const card = resolveCard(variants.find(v => v.id === id)!);
    return generateForBlock({ id, typeId: card.typeId, numberOfExercises: n, constraints: card.constraints } as unknown as MathBlock).items as Equation[];
};
const cardOf = (id: string) => data.types.find(t => t.vars.some(v => v.id === id))!;

describe('× / : 10, 100, 1000 cards', () => {
    test.each([
        ['R:tien-x-l3', 'x', [10, 100], 1000],
        ['R:tien-x-l4', 'x', [10, 100, 1000], 10000],
        ['R:tien-d-l3', ':', [10, 100], 1000],
        ['R:tien-d-l4', ':', [10, 100, 1000], 10000],
    ] as const)('%s: whole answers, every number within the leerjaar', (id, op, factors, max) => {
        const list = generate(id);
        expect(list.length).toBeGreaterThan(50);
        for (const eq of list) {
            const [a, b] = eq.operands as number[];
            expect(eq.operator).toBe(op);
            expect(factors).toContain(b);
            expect(Number.isInteger(eq.answer)).toBe(true);
            expect(eq.answer as number).toBeGreaterThanOrEqual(2);
            // × the product, : the deeltal stays at or under the card's max.
            expect(Math.max(a, b, eq.answer as number)).toBeLessThanOrEqual(max);
            expect(op === 'x' ? a * b : a / b).toBe(eq.answer);
        }
        // Every factor of the card is drawn.
        expect(new Set(list.map(e => e.operands[1]))).toEqual(new Set(factors));
    });

    test('without tienvoudTotMax the base is bounded, not the answer (existing sheets unchanged)', () => {
        const base = resolveCard(variants.find(v => v.id === 'R:tien-x-l3')!);
        const { tienvoudTotMax: _drop, ...rest } = base.constraints;
        void _drop;
        const items = generateForBlock({ id: 'b', typeId: base.typeId, numberOfExercises: 100, constraints: rest } as unknown as MathBlock).items as Equation[];
        expect(Math.max(...items.map(e => e.answer as number))).toBeGreaterThan(1000);
    });

    test('E × HTE is a leerjaar 3 card, E × DHTE a leerjaar 4 card, both inside their max', () => {
        expect(cardOf('C:c137-l4').grades).toEqual([3, 4]);
        expect(cardOf('C:c172-l5').grades).toEqual([4, 5, 6]);
        for (const [id, max] of [['C:c137-l4', 1000], ['C:c172-l5', 10000]] as const) {
            for (const eq of generate(id, 60)) expect(eq.answer as number).toBeLessThanOrEqual(max);
        }
        const l3 = choicesFor(data, 3, 'Hoofdrekenen · Vermenigvuldigen');
        expect(l3.map(c => c.label)).toEqual(expect.arrayContaining(['Keer 10 en 100', 'Keer een driecijferig getal']));
        const l4 = choicesFor(data, 4, 'Hoofdrekenen · Vermenigvuldigen').flatMap(c => c.vars.map(v => v.id));
        expect(l4).toEqual(expect.arrayContaining(['R:tien-x-l4', 'C:c172-l5']));
        expect(choicesFor(data, 3, 'Hoofdrekenen · Delen').map(c => c.label)).toContain('Delen door 10, 100');
    });
});
