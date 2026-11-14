import { describe, test, expect } from 'vitest';
import { loadEenvoudigData } from '../config/eenvoudig/cards';
import { buildZelfSessie, choicesFor, usableVariants } from '../oefenen/zelf/zelfSessie';
import { nextExercise } from '../services/oefenen/scheduler';
import { choicesOf, distractors, mulberry32, type SumFacts } from '../oefenen/spelen/distractors';
import { choiceCanPlay, spelQuestionOf } from '../oefenen/spelen/spelQuestion';

const check = (f: SumFacts, ds: number[]) => {
    expect(ds).toHaveLength(3);
    expect(new Set(ds).size).toBe(3);
    for (const d of ds) {
        expect(d).not.toBe(f.answer);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(d)).toBe(true);
    }
};

describe('distractors', () => {
    test('typical slips: ±1, ±10, the other operation, a digit swap', () => {
        const f: SumFacts = { answer: 34, operands: [21, 13], op: '+' };
        const all = new Set<number>();
        for (let seed = 0; seed < 200; seed++) for (const d of distractors(f, mulberry32(seed))) all.add(d);
        expect([...all].sort((a, b) => a - b)).toEqual([8, 24, 33, 35, 43, 44]);
        // − read as +: 15 − 4 offers 19.
        const g: SumFacts = { answer: 11, operands: [15, 4], op: '-' };
        const seen = new Set<number>();
        for (let seed = 0; seed < 200; seed++) for (const d of distractors(g, mulberry32(seed))) seen.add(d);
        expect(seen.has(19)).toBe(true);
    });

    test('tiny answers fall back to near numbers, never negative', () => {
        for (const f of [
            { answer: 0, operands: [3, 3], op: '-' }, { answer: 1, operands: [1, 0], op: '+' },
            { answer: 2, operands: [1, 1], op: '+' }, { answer: 0, operands: [0, 0], op: '+' },
        ] as SumFacts[]) {
            for (let seed = 0; seed < 50; seed++) check(f, distractors(f, mulberry32(seed)));
        }
    });

    test('seeded: the same seed gives the same choices; the answer is always among four', () => {
        const f: SumFacts = { answer: 57, operands: [38, 19], op: '+' };
        expect(choicesOf(f, mulberry32(7))).toEqual(choicesOf(f, mulberry32(7)));
        const c = choicesOf(f, mulberry32(9));
        expect(c).toHaveLength(4);
        expect(c).toContain(57);
    });

    test('over many generated + and − sums of every playable choice (leerjaar 1 to 3)', async () => {
        const data = await loadEenvoudigData();
        let sums = 0;
        for (const g of [1, 2, 3] as const) {
            for (const topic of usableVariants(data, g).keys()) {
                for (const choice of choicesFor(data, g, topic)) {
                    if (!choiceCanPlay(choice, g)) continue;
                    const s = buildZelfSessie(choice, { kind: 'count', n: 10 }, 0, g);
                    const rng = mulberry32(g * 1000 + sums);
                    for (let i = 0; i < 40; i++) {
                        const slot = i % s.types.length;
                        const made = nextExercise(s, s.types[slot], new Set(), rng);
                        expect(made).not.toBeNull();
                        const q = spelQuestionOf(s.types[slot], slot, made!);
                        expect(q, `${choice.label}: ${JSON.stringify(made!.exercise)}`).not.toBeNull();
                        check(q!.facts, q!.choices.map(Number).filter(n => n !== q!.facts.answer));
                        expect(q!.choices).toContain(q!.answer);
                        expect(q!.choices).toHaveLength(4);
                        sums++;
                    }
                }
            }
        }
        expect(sums).toBeGreaterThan(500);
    });

    test('only hoofdrekenen + and − with natural numbers at leerjaar 1 to 3 can be played', async () => {
        const data = await loadEenvoudigData();
        const playable = (g: 1 | 2 | 3 | 4, t: string) => choicesFor(data, g, t).filter(c => choiceCanPlay(c, g)).length;
        expect(playable(2, 'Hoofdrekenen · Optellen')).toBeGreaterThan(0);
        expect(playable(1, 'Hoofdrekenen · Aftrekken')).toBeGreaterThan(0);
        expect(playable(3, 'Cijferen · Optellen')).toBe(0);
        expect(playable(4, 'Hoofdrekenen · Optellen')).toBe(0);
        const tafels = [...usableVariants(data, 2).keys()].find(t => /tafels$/.test(t));
        if (tafels) expect(playable(2, tafels)).toBe(0);
    });
});
