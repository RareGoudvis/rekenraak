import { describe, test, expect, beforeAll } from 'vitest';
import { loadEenvoudigData, type EenvoudigData } from '../config/eenvoudig/cards';
import { LEERJAREN, type Leerjaar } from '../config/gradePresets';
import { buildZelfSessie, choicesFor, zelfRangeButtons, type ZelfChoice } from '../oefenen/zelf/zelfSessie';
import { zelfRangeless } from '../oefenen/zelf/zelfRegroup';
import { nextExercise } from '../services/oefenen/scheduler';
import { kioskFor, kioskSupports } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import { mulberry32 } from '../oefenen/spelen/distractors';
import { choiceCanPlay, kioskAnswerOf, spelQuestionOf } from '../oefenen/spelen/spelQuestion';
import type { SplitsenExercise, VergelijkenExercise } from '../services/math/types';

// The kids app's own grouping (zelfRegroup.ts): Vergelijken in three plain choices, Splitsen in leerjaar 1 in four steps.

let data: EenvoudigData;
beforeAll(async () => { data = await loadEenvoudigData(); });

const VERGELIJKEN = 'Vergelijken, ordenen, afronden';
const labels = (g: Leerjaar, t: string) => choicesFor(data, g, t).map(c => c.label);
const choice = (g: Leerjaar, t: string, label: string): ZelfChoice => choicesFor(data, g, t).find(c => c.label === label)!;

// Exercises of every type of a choice, as its session makes them.
function made(c: ZelfChoice, g: Leerjaar, per = 12) {
    const s = buildZelfSessie(c, { kind: 'count', n: 10 }, 0, g);
    const rng = mulberry32(7);
    return s.types.flatMap(type => Array.from({ length: per }, () => ({ type, made: nextExercise(s, type, new Set(), rng)! })));
}

describe('Vergelijken in the kids app', () => {
    test('every leerjaar: Groter of kleiner, Grootste of kleinste, Ordenen (Afronden where it was), Alles door elkaar', () => {
        expect(labels(1, VERGELIJKEN)).toEqual(['Groter of kleiner', 'Grootste of kleinste', 'Ordenen', 'Alles door elkaar']);
        expect(labels(2, VERGELIJKEN)).toEqual(['Groter of kleiner', 'Grootste of kleinste', 'Ordenen', 'Alles door elkaar']);
        for (const g of [3, 4, 5, 6] as const) expect(labels(g, VERGELIJKEN)).toEqual(['Groter of kleiner', 'Grootste of kleinste', 'Ordenen', 'Afronden', 'Alles door elkaar']);
    });

    test('Grootste of kleinste mixes both: the kiosk asks and checks the kleinste, a game asks it on its sign', () => {
        for (const g of LEERJAREN) {
            const c = choice(g, VERGELIJKEN, 'Grootste of kleinste');
            const targets = new Set<string>();
            for (const { type, made: m } of made(c, g)) {
                expect(kioskSupports(type.typeId, type.constraints)).toBe(true);
                const ex = m.exercise as VergelijkenExercise;
                const nums = ex.numbers ?? [];
                const target = ex.target ?? 'grootste';
                targets.add(target);
                expect(type.instruction).toBe(`Omcirkel het ${target} getal.`);
                const d = kioskFor(type.typeId)!;
                expect(Number(d.answerOf(ex, m.constraints)[0].replace(/\s/g, ''))).toBe(target === 'kleinste' ? Math.min(...nums) : Math.max(...nums));
                const q = spelQuestionOf(type, 0, m);
                if (!q) continue;
                expect(q.text).toBe(`Het ${target} getal: ?`);
                expect(checkAnswer(d, q.exercise, q.constraints, kioskAnswerOf(q, q.answer))).toBe(true);
            }
            expect([...targets].sort(), `leerjaar ${g}`).toEqual(['grootste', 'kleinste']);
            // Leerjaar 5 and 6 numbers are too long for a tap target; the choice pad takes them (spelen.choicePad.test).
            expect(choiceCanPlay(c, g)).toBe(true);
        }
    });

    test('Ordenen mixes klein → groot and groot → klein, each exercise names its own direction', () => {
        const c = choice(1, VERGELIJKEN, 'Ordenen');
        const ops = new Set(made(c, 1).map(({ made: m }) => (m.exercise as { operator: string }).operator));
        expect([...ops].sort()).toEqual(['<', '>']);
        for (const { type, made: m } of made(c, 1, 3)) {
            const op = (m.exercise as { operator: string }).operator;
            const ins = kioskFor(type.typeId)!.kioskInstruction;
            expect(typeof ins === 'function' ? ins(m.exercise, m.constraints) : ins).toContain(op === '>' ? 'groot naar klein' : 'klein naar groot');
        }
    });
});

describe('Splitsen in leerjaar 1', () => {
    test('four choices and no "Tot hoeveel?"', () => {
        expect(zelfRangeless('Splitsen', 1)).toBe(true);
        expect(zelfRangeless('Splitsen', 2)).toBe(false);
        expect(zelfRangeButtons(data, 'Splitsen', 1)).toEqual([]);
        expect(labels(1, 'Splitsen')).toEqual(['Tot 5', 'Vriendjes van 10', 'Van 10 tot 20', 'Tot 20']);
        // The same choices whatever range the device remembers.
        for (const r of [5, 10, 20]) expect(choicesFor(data, 1, 'Splitsen', r)).toEqual(choicesFor(data, 1, 'Splitsen'));
    });

    test('each choice asks what its name says, and every one plays a game', () => {
        const totals = (label: string) => made(choice(1, 'Splitsen', label), 1, 20).map(({ made: m }) => (m.exercise as SplitsenExercise).total);
        expect(Math.max(...totals('Tot 5'))).toBeLessThanOrEqual(5);
        expect(new Set(totals('Vriendjes van 10'))).toEqual(new Set([10]));
        const teen = totals('Van 10 tot 20');
        expect(Math.min(...teen)).toBeGreaterThanOrEqual(11);
        expect(Math.max(...teen)).toBeLessThanOrEqual(19);
        expect(new Set(teen).size).toBeGreaterThan(4);
        expect(Math.max(...totals('Tot 20'))).toBeLessThanOrEqual(20);
        for (const c of choicesFor(data, 1, 'Splitsen')) expect(choiceCanPlay(c, 1), c.label).toBe(true);
    });

    test('Van 10 tot 20 opens a tak or the geheel; the game checks with the kiosk', () => {
        const c = choice(1, 'Splitsen', 'Van 10 tot 20');
        const blanks = new Set<string>();
        for (const { type, made: m } of made(c, 1)) {
            blanks.add((m.exercise as SplitsenExercise).blankPos ?? 'right');
            const q = spelQuestionOf(type, 0, m)!;
            expect(checkAnswer(kioskFor(type.typeId)!, q.exercise, q.constraints, kioskAnswerOf(q, q.answer))).toBe(true);
        }
        expect([...blanks].sort()).toEqual(['right', 'top']);
    });
});
