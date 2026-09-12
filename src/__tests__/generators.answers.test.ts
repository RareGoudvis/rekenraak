import { describe, test, expect } from 'vitest';
import type { RekenvolgordeExercise, Equation, Fraction, CijferExercise, SplitsenExercise, BreukBewerkExercise, OrdenenExercise, DeelbaarheidExercise, ProcentExercise, VerbandExercise, TijdsduurExercise, KalenderExercise, ControleExercise, HerleidingExercise } from '../services/math/types';
import { ladderFor } from '../services/herleidingen/herleidingenGenerator';
import { daysInMonth } from '../services/kalender/kalenderGenerator';
import { negenrest } from '../services/controleren/controlerenGenerator';
import { fractionToDecimal, fractionToPercent } from '../services/verbanden/verbandenGenerator';
import { makeBlock, generateFor } from './helpers/makeBlock';

// Correctness, not smoke: does the answer the sheet prints actually follow from the
// question it prints? Every check below runs over a batch of generated exercises, since
// generators are random and a single sample proves nothing.

const RUNS = 20;

// mathEngine works in scaled integers (INTERNAL_SCALE = 1_000_000) to dodge JS float
// rounding, so comparisons here scale the same way instead of using a tolerance.
const SCALE = 1_000_000;
const scaled = (x: number) => Math.round(x * SCALE);

const isFraction = (v: unknown): v is Fraction => typeof v === 'object' && v !== null && 'n' in (v as object) && 'd' in (v as object);
const fracValue = (f: Fraction) => (f.whole ?? 0) + f.n / f.d;
const numValue = (v: number | Fraction) => (isFraction(v) ? fracValue(v) : v);

function applyOp(a: number, op: string, b: number): number {
    switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case 'x': return a * b;
        case ':': return a / b;
        default: throw new Error(`unknown operator ${op}`);
    }
}

/** Left-to-right evaluation — mathEngine builds chains, not precedence expressions. */
function evaluate(eq: Equation): number {
    const ops = eq.operators ?? eq.operands.slice(1).map(() => eq.operator);
    let acc = numValue(eq.operands[0]);
    for (let i = 1; i < eq.operands.length; i++) acc = applyOp(acc, ops[i - 1], numValue(eq.operands[i]));
    return acc;
}

function equations(typeId: string, constraints: Record<string, unknown>, count = 10): Equation[] {
    const block = makeBlock(typeId, { constraints, block: { numberOfExercises: count } });
    return generateFor(block) as Equation[];
}

// ── mathEngine: the printed answer follows from the printed operands ─────────
describe('mathEngine answers', () => {
    const cases: Array<[string, Record<string, unknown>]> = [
        ['hr-std-optellen', { numberType: 'natural', maxGetal: 1000 }],
        ['hr-std-aftrekken', { numberType: 'natural', maxGetal: 1000 }],
        ['hr-std-vermenigvuldigen', { numberType: 'natural', multiplicationMode: 'tafels' }],
        ['hr-std-optellen', { numberType: 'decimal', maxGetal: 100, decimalPlaces: 2 }],
        ['hr-std-aftrekken', { numberType: 'decimal', maxGetal: 100, decimalPlaces: 2 }],
        ['hr-std-optellen', { numberType: 'rational', maxDenominator1: 10 }],
        ['hr-std-optellen', { numberType: 'natural', maxGetal: 100, termCount: 3 }],
        ['hr-std-optellen', { numberType: 'natural', maxGetal: 100, termCount: 4 }],
    ];

    test.each(cases.map(([t, c]) => [`${t} ${JSON.stringify(c)}`, t, c] as const))('%s', (_n, typeId, constraints) => {
        for (let run = 0; run < RUNS; run++) {
            for (const eq of equations(typeId, constraints)) {
                expect(scaled(evaluate(eq)), `${JSON.stringify(eq.operands)} ${eq.operator}`).toBe(scaled(numValue(eq.answer)));
            }
        }
    });

    test('division answers multiply back, remainder included', () => {
        for (let run = 0; run < RUNS; run++) {
            for (const eq of equations('hr-std-delen', { numberType: 'natural', multiplicationMode: 'met_rest', selectedTables: [2, 3, 4, 5, 10] })) {
                const [a, b] = eq.operands.map(numValue);
                const answer = numValue(eq.answer);
                const rest = eq.remainder ?? 0;
                expect(rest, 'remainder must be smaller than the divisor').toBeLessThan(b);
                expect(rest).toBeGreaterThanOrEqual(0);
                expect(scaled(answer * b + rest)).toBe(scaled(a));
            }
        }
    });

    test('missingTerm never points past the operands it addresses', () => {
        for (const typeId of ['hr-std-optellen', 'hr-std-aftrekken']) {
            for (const eq of equations(typeId, { numberType: 'natural', maxGetal: 100, missingTermMode: 'random' }, 20)) {
                if (eq.missingTerm) expect(['result', 'operand1', 'operand2']).toContain(eq.missingTerm);
                if (eq.missingIndex !== undefined) {
                    expect(eq.missingIndex).toBeGreaterThanOrEqual(0);
                    expect(eq.missingIndex).toBeLessThan(eq.operands.length);
                }
            }
        }
    });
});

// ── bruggetje (carry/borrow across a place boundary) ─────────────────────────
// bridges.E = 'REQUIRED' means the units column MUST carry; 'FORBIDDEN' means it may not.
describe('bridges are honoured', () => {
    const digitAt = (n: number, weight: number) => Math.floor(Math.abs(n) / weight) % 10;

    // SYNC: mirrors additionCarryPlaces / subtractionBorrowPlaces in mathEngine.ts:93-120.
    // A bridge is judged on the RUNNING carry/borrow, so 319 + 184 bridges at T even
    // though 1 + 8 < 10 — the carry out of the units column pushes it over.
    const carries = (a: number, b: number, weight: number) => {
        let carry = 0;
        for (let w = 1; w <= weight; w *= 10) {
            carry = Math.floor((digitAt(a, w) + digitAt(b, w) + carry) / 10);
        }
        return carry > 0;
    };
    const borrows = (a: number, b: number, weight: number) => {
        let borrow = 0;
        let hit = false;
        for (let w = 1; w <= weight; w *= 10) {
            const needed = digitAt(a, w) - borrow - digitAt(b, w);
            hit = needed < 0;
            borrow = hit ? 1 : 0;
        }
        return hit;
    };

    test.each([
        ['E', 1],
        ['T', 10],
    ] as const)('optellen REQUIRED/FORBIDDEN at %s', (place, weight) => {
        for (let run = 0; run < RUNS; run++) {
            for (const eq of equations('hr-std-optellen', { numberType: 'natural', maxGetal: 1000, bridges: { [place]: 'REQUIRED' } })) {
                const [a, b] = eq.operands.map(numValue);
                expect(carries(a, b, weight), `${a} + ${b} should carry at ${place}`).toBe(true);
            }
            for (const eq of equations('hr-std-optellen', { numberType: 'natural', maxGetal: 1000, bridges: { [place]: 'FORBIDDEN' } })) {
                const [a, b] = eq.operands.map(numValue);
                expect(carries(a, b, weight), `${a} + ${b} should NOT carry at ${place}`).toBe(false);
            }
        }
    });

    test.each([
        ['E', 1],
        ['T', 10],
    ] as const)('aftrekken REQUIRED/FORBIDDEN at %s', (place, weight) => {
        for (let run = 0; run < RUNS; run++) {
            for (const eq of equations('hr-std-aftrekken', { numberType: 'natural', maxGetal: 1000, bridges: { [place]: 'REQUIRED' } })) {
                const [a, b] = eq.operands.map(numValue);
                expect(borrows(a, b, weight), `${a} - ${b} should borrow at ${place}`).toBe(true);
            }
            for (const eq of equations('hr-std-aftrekken', { numberType: 'natural', maxGetal: 1000, bridges: { [place]: 'FORBIDDEN' } })) {
                const [a, b] = eq.operands.map(numValue);
                expect(borrows(a, b, weight), `${a} - ${b} should NOT borrow at ${place}`).toBe(false);
            }
        }
    });
});

// ── cijferen (column arithmetic) ─────────────────────────────────────────────
describe('cijferen', () => {
    test.each([
        ['cijferen-optellen-nat', '+'],
        ['cijferen-aftrekken-nat', '-'],
        ['cijferen-vermenigvuldigen-nat', 'x'],
        ['cijferen-delen-nat', ':'],
    ])('%s answer + remainder', (typeId, operator) => {
        for (let run = 0; run < RUNS; run++) {
            const block = makeBlock(typeId, { constraints: { operator, numberType: 'natural', maxRange: 1000 }, block: { numberOfExercises: 6 } });
            for (const ex of generateFor(block) as CijferExercise[]) {
                if (operator === ':') {
                    const [a, b] = ex.operands;
                    expect(scaled(ex.answer * b + ex.remainder)).toBe(scaled(a));
                    expect(ex.remainder).toBeLessThan(b);
                } else {
                    const expected = ex.operands.slice(1).reduce((acc, n) => applyOp(acc, operator, n), ex.operands[0]);
                    expect(scaled(expected)).toBe(scaled(ex.answer));
                    expect(ex.remainder).toBe(0);
                }
            }
        }
    });
});

// ── splitsen: 'splitsen' = decomposing a number into two parts (7 → 3 + 4) ───
describe('splitsen', () => {
    test.each(['basic', 'splitsboom', 'verliefde-harten'])('%s pairs sum to the total', (layout) => {
        for (let run = 0; run < RUNS; run++) {
            const block = makeBlock('splitsen', { constraints: { layout, maxGetal: layout === 'verliefde-harten' ? 10 : 100 } });
            for (const ex of generateFor(block) as SplitsenExercise[]) {
                for (const pair of ex.pairs) {
                    expect(scaled(pair.given + pair.answer), `${pair.given} + ${pair.answer} != ${ex.total}`).toBe(scaled(ex.total));
                }
            }
        }
    });

    test('positie-* place breakdowns reconstruct the total', () => {
        for (const layout of ['positie-tabel', 'positie-benen', 'positie-math']) {
            const block = makeBlock('splitsen', { constraints: { layout, maxGetal: 1000 } });
            for (const ex of generateFor(block) as SplitsenExercise[]) {
                if (!ex.placeBreakdown) continue;
                const sum = ex.placeBreakdown.reduce((a, p) => a + p.digit * p.weight, 0);
                expect(scaled(sum), `${layout} breakdown of ${ex.total}`).toBe(scaled(ex.total));
            }
        }
    });
});

// ── breuken bewerken ─────────────────────────────────────────────────────────
describe('breuken-bewerken', () => {
    test('inputs and answers are the same value', () => {
        for (const subType of ['gemengd', 'gelijknamig', 'vereenvoudigen']) {
            const block = makeBlock('breuken-bewerken', { constraints: { subType } });
            for (const ex of generateFor(block) as BreukBewerkExercise[]) {
                expect(ex.inputs.length).toBe(ex.answers.length);
                ex.inputs.forEach((input, i) => {
                    expect(fracValue(ex.answers[i]), `${subType}: ${JSON.stringify(input)} -> ${JSON.stringify(ex.answers[i])}`)
                        .toBeCloseTo(fracValue(input), 9);
                });
            }
        }
    });

    test('gelijknamig makes both denominators equal', () => {
        const block = makeBlock('breuken-bewerken', { constraints: { subType: 'gelijknamig' } });
        for (const ex of generateFor(block) as BreukBewerkExercise[]) {
            expect(ex.answers[0].d).toBe(ex.answers[1].d);
        }
    });

    test('vereenvoudigen answers are in lowest terms', () => {
        const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
        const block = makeBlock('breuken-bewerken', { constraints: { subType: 'vereenvoudigen', allowIrreducible: false } });
        for (const ex of generateFor(block) as BreukBewerkExercise[]) {
            const f = ex.answers[0];
            expect(gcd(f.n, f.d), `${f.n}/${f.d} is not reduced`).toBe(1);
        }
    });
});

// ── ordenen ──────────────────────────────────────────────────────────────────
describe('ordenen', () => {
    test.each(['oplopend', 'aflopend'])('%s values are sorted and display is a permutation', (operatorMode) => {
        for (let run = 0; run < RUNS; run++) {
            const block = makeBlock('ordenen', { constraints: { operatorMode, maxGetal: 1000 } });
            for (const ex of generateFor(block) as OrdenenExercise[]) {
                const vals = ex.values.map(numValue);
                for (let i = 1; i < vals.length; i++) {
                    if (ex.operator === '<') expect(vals[i], `${vals}`).toBeGreaterThan(vals[i - 1]);
                    else expect(vals[i], `${vals}`).toBeLessThan(vals[i - 1]);
                }
                const sortNum = (a: number, b: number) => a - b;
                expect(ex.display.map(numValue).sort(sortNum)).toEqual([...vals].sort(sortNum));
            }
        }
    });
});

// ── deelbaarheid ─────────────────────────────────────────────────────────────
describe('deelbaarheid', () => {
    test('veelvouden rows are exact multiples of the base', () => {
        const block = makeBlock('deelbaarheid', { constraints: { layout: 'veelvouden', base: 7, terms: 8 } });
        for (const ex of generateFor(block) as DeelbaarheidExercise[]) {
            expect(ex.sequence).toBeDefined();
            ex.sequence!.forEach((v, i) => expect(v).toBe(ex.base! * i));
            // At least one blank must remain or there is nothing to solve.
            expect(ex.givenCount!).toBeLessThan(ex.sequence!.length);
        }
    });

    test('tabel numbers stay inside the requested range', () => {
        const block = makeBlock('deelbaarheid', { constraints: { layout: 'tabel', maxGetal: 1000 } });
        for (const ex of generateFor(block) as DeelbaarheidExercise[]) {
            expect(ex.number!).toBeGreaterThanOrEqual(10);
            expect(ex.number!).toBeLessThanOrEqual(1000);
        }
    });
});

// ── procenten ────────────────────────────────────────────────────────────────
describe('procenten', () => {
    test.each(['nemen', 'welk-percent'])('%s: answer = percent of base, exactly', (subType) => {
        for (let run = 0; run < RUNS; run++) {
            const block = makeBlock('procenten', { constraints: { subType, percents: [1, 5, 10, 20, 25, 50, 75, 100], maxGetal: 1000 } });
            for (const ex of generateFor(block) as ProcentExercise[]) {
                expect(scaled((ex.base * ex.percent) / 100), `${ex.percent}% of ${ex.base}`).toBe(scaled(ex.answer));
                // Answer-first construction: results are whole numbers, never 12,5 items.
                expect(Number.isInteger(ex.answer)).toBe(true);
            }
        }
    });
});

// ── verbanden breuk · decimaal · procent ─────────────────────────────────────
describe('verbanden', () => {
    test('the three representations agree exactly', () => {
        const block = makeBlock('verbanden', { constraints: { denominators: [2, 4, 5, 8, 10, 20, 25, 100] } });
        for (const ex of generateFor(block) as VerbandExercise[]) {
            const value = ex.fraction.n / ex.fraction.d;
            expect(fractionToDecimal(ex.fraction)).toBeCloseTo(value, 3);
            expect(fractionToPercent(ex.fraction)).toBeCloseTo(value * 100, 1);
            // Proper benchmark fractions only — 5/4 has no place in this exercise.
            expect(ex.fraction.n).toBeLessThan(ex.fraction.d);
        }
    });

    test('paren asks for a representation other than the one it prints', () => {
        const block = makeBlock('verbanden', { constraints: { subType: 'paren' } });
        for (const ex of generateFor(block) as VerbandExercise[]) {
            expect(ex.target).toBeDefined();
            expect(ex.target).not.toBe(ex.given);
        }
    });
});

// ── tijdsduur ────────────────────────────────────────────────────────────────
describe('tijdsduur', () => {
    test('einde - begin is a positive multiple of the chosen granularity', () => {
        for (const [granularity, step] of [['heel-uur', 60], ['kwartier', 15], ['vijf-min', 5], ['een-min', 1]] as const) {
            const block = makeBlock('tijdsduur', { constraints: { granularity: [granularity], maxDuurMin: 240 } });
            for (const ex of generateFor(block) as TijdsduurExercise[]) {
                const duur = ex.endMin - ex.startMin;
                expect(duur, `${ex.startMin} → ${ex.endMin}`).toBeGreaterThan(0);
                expect(duur % step).toBe(0);
                expect(duur).toBeLessThanOrEqual(240);
            }
        }
    });

    test('stays inside one day unless overMidnight is on', () => {
        const block = makeBlock('tijdsduur', { constraints: { overMidnight: false } });
        for (const ex of generateFor(block) as TijdsduurExercise[]) expect(ex.endMin).toBeLessThan(1440);
    });
});

// ── kalender ─────────────────────────────────────────────────────────────────
describe('kalender', () => {
    test('maandrooster asks exactly the requested number of questions, each answered', () => {
        const block = makeBlock('kalender', { constraints: { subType: 'maandrooster', questionCount: 5 }, block: { numberOfExercises: 3 } });
        for (const ex of generateFor(block) as KalenderExercise[]) {
            expect(ex.month).toBeGreaterThanOrEqual(0);
            expect(ex.month).toBeLessThanOrEqual(11);
            expect(ex.questions).toHaveLength(5);
            for (const q of ex.questions!) {
                expect(q.text.length).toBeGreaterThan(0);
                expect(q.answer.length).toBeGreaterThan(0);
            }
        }
    });

    test('datum-rekenen dates are real dates in their month', () => {
        const block = makeBlock('kalender', { constraints: { subType: 'datum-rekenen' }, block: { numberOfExercises: 6 } });
        for (const ex of generateFor(block) as KalenderExercise[]) {
            expect(ex.baseDate!).toBeGreaterThanOrEqual(1);
            expect(ex.baseDate!).toBeLessThanOrEqual(daysInMonth(ex.year, ex.month));
            expect(ex.offsetDays).not.toBe(0);
        }
    });

    test('February 2024 is a leap month, 2026 is not', () => {
        expect(daysInMonth(2024, 1)).toBe(29);
        expect(daysInMonth(2026, 1)).toBe(28);
    });
});

// ── controleren ──────────────────────────────────────────────────────────────
describe('controleren', () => {
    test('negenproef: a planted error is always catchable (delta not a multiple of 9)', () => {
        for (let run = 0; run < RUNS; run++) {
            const block = makeBlock('controleren', { constraints: { subType: 'negenproef', foutAandeel: 'alles' }, block: { numberOfExercises: 8 } });
            for (const ex of generateFor(block) as ControleExercise[]) {
                expect(ex.correctAnswer).toBe(ex.a * ex.b);
                expect(ex.shownAnswer).not.toBe(ex.correctAnswer);
                // The whole point of the negenproef: a wrong answer must differ mod 9,
                // or the check passes on a wrong sum.
                expect(negenrest(Math.abs(ex.shownAnswer - ex.correctAnswer))).not.toBe(0);
            }
        }
    });

    test('foutAandeel geen prints only correct answers', () => {
        const block = makeBlock('controleren', { constraints: { subType: 'omgekeerde', foutAandeel: 'geen' } });
        for (const ex of generateFor(block) as ControleExercise[]) {
            const expected = applyOp(ex.a, ex.operator, ex.b);
            expect(ex.correctAnswer).toBe(expected);
            expect(ex.shownAnswer).toBe(ex.correctAnswer);
        }
    });
});

// ── herleidingen (metric unit conversion) ────────────────────────────────────
describe('herleidingen', () => {
    test.each(['lengte', 'inhoud', 'massa', 'oppervlakte'])('%s: both sides are the same quantity, exactly', (measure) => {
        const ladder = ladderFor(measure);
        const factor = (key: string) => ladder.find(u => u.key === key)!.factor;
        for (let run = 0; run < 5; run++) {
            const block = makeBlock('herleidingen', { constraints: { measure } });
            for (const ex of generateFor(block) as HerleidingExercise[]) {
                const total = (parts: typeof ex.fromParts) => parts.reduce((a, p) => a + p.value * factor(p.key), 0);
                expect(total(ex.fromParts), `${JSON.stringify(ex.fromParts)} = ${JSON.stringify(ex.toParts)}`).toBe(total(ex.toParts));
            }
        }
    });
});

describe('rekenvolgorde', () => {
    // Independent evaluator: brackets first, then ×/: left-to-right, then +/−.
    function evaluate(tokens: (number | string)[]): number {
        const t = [...tokens];
        while (t.includes('(')) {
            const open = t.lastIndexOf('(');
            const close = open + t.slice(open).indexOf(')');
            t.splice(open, close - open + 1, evaluate(t.slice(open + 1, close)));
        }
        for (let i = 1; i < t.length - 1; i++) {
            if (t[i] === 'x' || t[i] === ':') {
                const a = t[i - 1] as number, b = t[i + 1] as number;
                t.splice(i - 1, 3, t[i] === 'x' ? a * b : a / b);
                i -= 1;
            }
        }
        let acc = t[0] as number;
        for (let i = 1; i < t.length - 1; i += 2) acc = t[i] === '+' ? acc + (t[i + 1] as number) : acc - (t[i + 1] as number);
        return acc;
    }

    test.each([2, 3, 4])('%i operators: the printed answer matches the expression', (opsCount) => {
        const block = makeBlock('rekenvolgorde', { constraints: { opsCount, haakjesMode: 'MAG' } });
        const data = generateFor(block) as RekenvolgordeExercise[];
        expect(data.length).toBe(block.numberOfExercises);
        for (const ex of data) expect(evaluate(ex.tokens), ex.tokens.join(' ')).toBe(ex.answer);
    });

    // Only + and − selected with two operators: the guard used to reject every candidate
    // (it demanded a ×/:), so the block came back empty. Now the bracket carries the lesson.
    test('plus/minus only with two operators still fills the block, with meaningful brackets', () => {
        const block = makeBlock('rekenvolgorde', { constraints: { operators: ['+', '-'], opsCount: 2, haakjesMode: 'MOET' } });
        const data = generateFor(block) as RekenvolgordeExercise[];
        expect(data.length).toBe(block.numberOfExercises);
        for (const ex of data) {
            expect(ex.tokens).toContain('(');
            expect(evaluate(ex.tokens), ex.tokens.join(' ')).toBe(ex.answer);
            // A bracket that does not change the outcome is decoration, not an exercise.
            expect(evaluate(ex.tokens.filter(t => t !== '(' && t !== ')'))).not.toBe(ex.answer);
        }
    });
});
