import { describe, test, expect, beforeAll } from 'vitest';
import { loadEenvoudigData, allVariants, type CardVariant, type EenvoudigData } from '../config/eenvoudig/cards';
import { resolveCard } from '../config/eenvoudig/resolveCard';
import { generateForBlock } from '../services/generateDispatch';
import type { Equation, MathBlock } from '../services/math/types';
import { choicesFor } from '../oefenen/zelf/zelfSessie';
import { choiceCanPlay, spelContentOf } from '../oefenen/spelen/spelQuestion';
import { distractors, mulberry32, type SumFacts } from '../oefenen/spelen/distractors';
import { answerBoundOf } from '../oefenen/spelen/answerChars';
import { skinsFor } from '../oefenen/spelen/accepts';
import { SKINS } from '../oefenen/spelen/skins/registry';

// Owner 2026-11-14: Spelen up to leerjaar 4 for × and :, with the × / : 10, 100, 1000 cards.

let data: EenvoudigData;
let variants: CardVariant[];
beforeAll(async () => { data = await loadEenvoudigData(); variants = allVariants(data); });

const generate = (id: string, n = 200): Equation[] => {
    const card = resolveCard(variants.find(v => v.id === id)!);
    return generateForBlock({ id, typeId: card.typeId, numberOfExercises: n, constraints: card.constraints } as unknown as MathBlock).items as Equation[];
};

describe('Spelen with × / : 10, 100, 1000', () => {
    const zeros = (a: number) => [a * 10, a / 10];

    test('a zero too many or too few is always among the options, never the answer', () => {
        const sums: SumFacts[] = [];
        for (const p of [10, 100, 1000]) for (const b of [2, 7, 47, 60, 99, 312]) {
            sums.push({ answer: b * p, operands: [b, p], op: 'x' }, { answer: b * p, operands: [p, b], op: 'x' }, { answer: b, operands: [b * p, p], op: ':' });
        }
        for (const f of sums) for (let seed = 0; seed < 30; seed++) {
            const d = distractors(f, mulberry32(seed));
            expect(d).toHaveLength(3);
            expect(new Set(d).size).toBe(3);
            expect(d).not.toContain(f.answer);
            expect(d.every(v => Number.isInteger(v) && v >= 0)).toBe(true);
            expect(d.some(v => zeros(f.answer).includes(v)), JSON.stringify(f)).toBe(true);
        }
        // 47 × 100: the neighbouring rows are 46 and 48 hundreds, never 47 × 101.
        const seen = new Set<number>();
        for (let seed = 0; seed < 100; seed++) for (const v of distractors({ answer: 4700, operands: [47, 100], op: 'x' }, mulberry32(seed))) seen.add(v);
        expect(seen.has(4747)).toBe(false);
        expect([...seen]).toEqual(expect.arrayContaining([47000, 470, 4800, 4600]));
    });

    test('E × HTE options stay plausible: unique, near the answer', () => {
        for (const eq of generate('C:c137-l4', 100)) {
            const f: SumFacts = { answer: eq.answer as number, operands: eq.operands as number[], op: 'x' };
            const d = distractors(f, mulberry32(f.answer));
            expect(new Set(d).size).toBe(3);
            expect(d).not.toContain(f.answer);
            for (const v of d) expect(Math.abs(v - f.answer)).toBeLessThanOrEqual(Math.max(...(eq.operands as number[])) + 10);
        }
    });

    test('leerjaar 4: × and : choices play, and since 2026-11-15 + and − too', () => {
        const playable = (g: 3 | 4, t: string) => choicesFor(data, g, t).filter(c => choiceCanPlay(c, g));
        expect(playable(4, 'Hoofdrekenen · Vermenigvuldigen').map(c => c.label)).toContain('Hele getallen');
        expect(playable(4, 'Hoofdrekenen · Delen').length).toBeGreaterThan(0);
        expect(playable(4, 'Hoofdrekenen · Optellen').length).toBeGreaterThan(0);
        expect(playable(4, 'Hoofdrekenen · Aftrekken').length).toBeGreaterThan(0);
        expect(playable(3, 'Hoofdrekenen · Vermenigvuldigen').map(c => c.label)).toContain('Keer 10 en 100');
    });

    test('answerChars: 5-digit answers hide the eggs, 4-digit ones keep every tap game', () => {
        const ids = (g: 3 | 4, t: string, label: string) => {
            const c = choicesFor(data, g, t).find(x => x.label === label)!;
            const content = spelContentOf(c, g)!;
            return { chars: content.answerChars, skins: skinsFor(SKINS, content).map(s => s.meta.id) };
        };
        const l4 = ids(4, 'Hoofdrekenen · Vermenigvuldigen', 'Hele getallen');
        expect(l4.chars).toBe(5);
        expect(l4.skins).not.toContain('eieren');
        expect(l4.skins).toEqual(expect.arrayContaining(['ballonnen', 'mollen', 'pakjesband', 'hartjes', 'pinguintoren']));
        const l3 = ids(3, 'Hoofdrekenen · Vermenigvuldigen', 'Keer 10 en 100');
        expect(l3.chars).toBe(4);
        expect(l3.skins).toContain('eieren');
        // Every skin with a smaller cap than the content hides.
        for (const s of SKINS) if ((s.meta.accepts.maxAnswerChars ?? Infinity) < 5) expect(l4.skins).not.toContain(s.meta.id);
    });

    test('answer bounds follow the settings', () => {
        expect(answerBoundOf('x', { multiplicationMode: 'tafels', selectedTables: [2, 7], tableLimit: 10 })).toBe(70);
        expect(answerBoundOf(':', { multiplicationMode: 'tafels', selectedTables: [2, 7], tableLimit: 10 })).toBe(10);
        expect(answerBoundOf(':', { multiplicationMode: 'tafels', selectedTables: [7], tableLimit: 10, equationType: 'puntoefening' })).toBe(70);
        expect(answerBoundOf('x', { preset: 'tienvoud', presetFactors: [10, 100], maxGetal: 1000, tienvoudTotMax: true })).toBe(1000);
        expect(answerBoundOf(':', { preset: 'tienvoud', presetFactors: [10, 100], maxGetal: 1000, tienvoudTotMax: true })).toBe(100);
        expect(answerBoundOf('x', { preset: 'tienvoud', presetFactors: [10, 100], maxGetal: 100 })).toBe(10000);
        expect(answerBoundOf('x', { multiplicationMode: 'andere', maxGetal: 10000 })).toBe(10000);
        expect(answerBoundOf('x', { numberType: 'decimal' })).toBeNull();
        // Over many generated sums the bound always holds.
        for (const id of ['R:tien-x-l4', 'R:tien-d-l4', 'C:c172-l5', 'C:c137-l4', 'C:c110-l3']) {
            const c = resolveCard(variants.find(v => v.id === id)!).constraints;
            const op = c.preset === 'tienvoud' ? (id.includes('-d-') ? ':' : 'x') : id === 'C:c110-l3' ? ':' : 'x';
            const bound = answerBoundOf(op, c)!;
            for (const eq of generate(id, 100)) expect(eq.answer as number, id).toBeLessThanOrEqual(bound);
        }
    });
});
