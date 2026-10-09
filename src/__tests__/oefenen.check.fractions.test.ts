import { describe, test, expect } from 'vitest';
import type { KioskAnswer, KioskDescriptor, OefenSessie, OefenType } from '../services/oefenen/types';
import { INTERACT_SEP } from '../services/oefenen/types';
import { flattenLeaves } from '../config/appstructure';
import { seedConstraints } from '../config/baseSettings';
import { kioskFor, kioskInputOf, kioskInteractOf } from '../services/oefenen/kiosk';
import { nextExercise } from '../services/oefenen/scheduler';
import { checkAnswer, exactFormOf } from '../services/oefenen/check';
import { gradeBase, mulberry32 } from './helpers/limitHarness';

// O8 (C3): a breuk answer counts by VALUE unless the row asks for the exact form. Every rational
// leaf × 200 seeds × a fixed list of spellings, checked with exactForm true, false and absent.

const SEEDS = 200;

interface RationalLeaf {
    leafId: string;
    extra?: Record<string, unknown>;
    // The descriptor's default when the row sets nothing: true where the form IS the exercise.
    exactDefault: boolean;
    // Every field holds a breuk-kind value (a whole one too); false = only fields spelled with '/'.
    allFraction: boolean;
}

const LEAVES: RationalLeaf[] = [
    { leafId: 'hr-std-optellen-rat', exactDefault: false, allFraction: true },
    { leafId: 'hr-std-aftrekken-rat', exactDefault: false, allFraction: true },
    { leafId: 'hr-std-vermenigvuldigen-rat', exactDefault: false, allFraction: true },
    { leafId: 'hr-std-delen-rat', exactDefault: false, allFraction: true },
    { leafId: 'getalbegrip-getallenassen-rat', exactDefault: false, allFraction: true },
    { leafId: 'getalbegrip-getallenrijen-rat', exactDefault: false, allFraction: true },
    { leafId: 'breuken-herkennen', extra: { answerFormat: 'blank-fraction' }, exactDefault: false, allFraction: true },
    { leafId: 'verbanden-tabel', exactDefault: false, allFraction: false },
    { leafId: 'verbanden-paren', exactDefault: false, allFraction: false },
    { leafId: 'procenten-verbanden', exactDefault: false, allFraction: false },
    { leafId: 'breuken-gemengd', exactDefault: true, allFraction: true },
    { leafId: 'breuken-gemengd', extra: { direction: 'naar-breuk' }, exactDefault: true, allFraction: true },
    { leafId: 'breuken-gelijknamig', exactDefault: true, allFraction: true },
    { leafId: 'breuken-vereenvoudigen', exactDefault: true, allFraction: true },
];

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));

// A spelling as a reduced [teller, noemer], written apart from check.ts; null = not a breuk/whole.
function ratioOf(s: string): [number, number] | null {
    const t = s.trim();
    const m = /^(-?)(?:(\d+) )?(\d+)\/(\d+)$/.exec(t);
    if (m) {
        const d = Number(m[4]), n = Number(m[2] ?? 0) * d + Number(m[3]);
        const g = gcd(n, d) || 1;
        return [(m[1] ? -1 : 1) * n / g, d / g];
    }
    return /^-?\d+$/.test(t) ? [Number(t), 1] : null;
}

// The test's own normal form of a spelling: spacing and leading zeros never counted.
const plainText = (s: string) => s.trim().replace(/\s*\/\s*/, '/').replace(/\s+/g, ' ')
    .replace(/\d+/g, x => x.replace(/^0+(?=\d)/, '')).replace(/^(-?)0 /, '$1');

interface Variant { text: string; sameValue: boolean; decimal?: boolean; badMixed?: boolean }

// The spelling list of value p/q (reduced): improper, unreduced, mixed, whole, spaced, zero-padded,
// and the wrong ones (decimal, another value, a gemengd getal with an improper part).
function variantsOf(p: number, q: number): Variant[] {
    const s = p < 0 ? '-' : '', P = Math.abs(p);
    const out: Variant[] = [
        { text: `${s}${P}/${q}`, sameValue: true },
        { text: `${s}${2 * P}/${2 * q}`, sameValue: true },
        { text: ` ${s}${3 * P} / ${3 * q} `, sameValue: true },
        { text: `${s}0${P}/0${q}`, sameValue: true },
        { text: `${s}${P + 1}/${q}`, sameValue: false },
    ];
    if (q === 1) out.push({ text: `${s}${P}`, sameValue: true }, { text: `${s}${4 * P}/4`, sameValue: true });
    const w = Math.floor(P / q), r = P % q;
    if (w > 0 && r > 0) out.push({ text: `${s}${w} ${r}/${q}`, sameValue: true }, { text: `${s}${w} ${2 * r}/${2 * q}`, sameValue: true });
    // '0 5/4' is just 5/4, so the improper part needs a whole of at least 1 left.
    if (w > 1 && r > 0) out.push({ text: `${s}${w - 1} ${r + q}/${q}`, sameValue: false, badMixed: true });
    // A terminating decimal of a non-whole value: a breuk answer never takes it (owner: not now).
    const terminates = (n: number): boolean => (n % 2 === 0 ? terminates(n / 2) : n % 5 === 0 ? terminates(n / 5) : n === 1);
    const dec = P / q;
    if (r > 0 && terminates(q)) {
        out.push({ text: `${s}${String(dec)}`, sameValue: false, decimal: true }, { text: `${s}${String(dec).replace('.', ',')}`, sameValue: false, decimal: true });
    }
    return out;
}

interface Fields { fields: string[]; join: (fs: string[]) => KioskAnswer }

// The answer as one spelling list per field, and how a pupil's fields go into checkAnswer.
function fieldsOf(d: KioskDescriptor, ex: unknown, c: Record<string, unknown>): Fields {
    const input = kioskInputOf(d, ex, c);
    if (input === 'interactive') {
        const ia = kioskInteractOf(d, c)!;
        expect(ia.kind).toBe('fill-cells');
        return { fields: ia.answerOf(ex, c).split(INTERACT_SEP), join: fs => fs.join(INTERACT_SEP) };
    }
    if (input === 'multi-number') return { fields: d.answerOf(ex, c), join: fs => fs };
    expect(['number', 'missing-operand']).toContain(input);
    return { fields: [d.answerOf(ex, c).join('|')], join: fs => fs[0] };
}

const tally = { checked: 0, valueAccepted: 0, exactRejected: 0 };

describe('breuk answers: by value unless the row asks the exact form', () => {
    const leaves = flattenLeaves();
    for (const L of LEAVES) {
        test(`${L.leafId}${L.extra ? ` ${JSON.stringify(L.extra)}` : ''}: ${SEEDS} seeds`, () => {
            const leaf = leaves.find(l => l.id === L.leafId)!;
            expect(leaf, L.leafId).toBeDefined();
            const d = kioskFor(leaf.typeId)!;
            const constraints = seedConstraints({ typeId: leaf.typeId, base: gradeBase(null), override: { ...leaf.defaultConstraints, ...L.extra }, grade: null, leafId: leaf.id });
            const type: OefenType = { typeId: leaf.typeId, leafId: leaf.id, label: leaf.label, constraints, weight: 1 };
            const sessie: OefenSessie = { v: 1, id: 't', createdAt: 0, types: [type], mode: 'afwisselen', allowRepeatType: true, testMode: false, statsLocked: false };
            let fractionFields = 0;
            for (let seed = 1; seed <= SEEDS; seed++) {
                const got = nextExercise(sessie, type, new Set(), mulberry32(seed * 104729));
                expect(got, `seed ${seed}`).not.toBeNull();
                const { exercise: ex, constraints: c } = got!;
                expect(exactFormOf(d, c), L.leafId).toBe(L.exactDefault);
                expect(exactFormOf(d, c, !L.exactDefault), `${L.leafId} row override`).toBe(!L.exactDefault);
                const { fields, join } = fieldsOf(d, ex, c);
                const firsts = fields.map(f => f.split('|')[0]);
                fields.forEach((field, i) => {
                    const alts = field.split('|');
                    if (!L.allFraction && !alts.some(a => a.includes('/'))) return;
                    const value = ratioOf(alts[0]);
                    expect(value, `seed ${seed} field ${i} '${alts[0]}'`).not.toBeNull();
                    for (const a of alts) expect(ratioOf(a), `seed ${seed} alt ${a}`).toEqual(value);
                    fractionFields++;
                    const asked = new Set(alts.map(plainText));
                    for (const v of variantsOf(value![0], value![1])) {
                        const given = join(firsts.map((f, j) => (j === i ? v.text : f)));
                        const where = `${L.leafId} seed ${seed} field ${i} want ${field} gave '${v.text}' ${JSON.stringify(ex)}`;
                        const byValue = checkAnswer(d, ex, c, given, false);
                        const byForm = checkAnswer(d, ex, c, given, true);
                        expect(byValue, `${where} (value)`).toBe(v.sameValue);
                        expect(byForm, `${where} (exact)`).toBe(asked.has(plainText(v.text)));
                        expect(checkAnswer(d, ex, c, given), `${where} (default)`).toBe(L.exactDefault ? byForm : byValue);
                        tally.checked++;
                        if (byValue) tally.valueAccepted++;
                        if (!byForm && v.sameValue) tally.exactRejected++;
                    }
                });
            }
            expect(fractionFields, `${L.leafId}: no breuk field came up`).toBeGreaterThan(0);
        });
    }
    test('the matrix ran', () => {
        expect(tally.checked).toBeGreaterThan(10_000);
        expect(tally.exactRejected).toBeGreaterThan(0);
    });
});

describe('value compare: the owner examples', () => {
    const hr = kioskFor('hr-std-optellen')!;
    const c = { numberType: 'rational' };
    const sum = (answer: { whole?: number; n: number; d: number }) =>
        ({ id: 'x', operands: [{ n: 1, d: 4 }, { whole: 3, n: 0, d: 4 }], operator: '+', answer, isManuallyEdited: false });
    test('3 1/4: every equal spelling, never a decimal', () => {
        const ex = sum({ whole: 3, n: 1, d: 4 });
        for (const g of ['26/8', '13/4', '3 1/4', '3 2/8', ' 3  2 / 8 ', '013/04', '26 / 8']) expect(checkAnswer(hr, ex, c, g), g).toBe(true);
        for (const g of ['3,25', '3.25', '3 5/4', '2 5/4', '27/8', '3', '13/0', '']) expect(checkAnswer(hr, ex, c, g), g).toBe(false);
        expect(checkAnswer(hr, ex, c, '26/8', true)).toBe(false);
        expect(checkAnswer(hr, ex, c, '13/4', true)).toBe(true);
        expect(checkAnswer(hr, ex, c, '3 1/4', true)).toBe(true);
    });
    test('3 (from 12/4): whole, any fraction of it, and the whole as typed today', () => {
        const ex = sum({ n: 12, d: 4 });
        for (const g of ['3', '12/4', '3/1', '6/2', '03', '3,0']) expect(checkAnswer(hr, ex, c, g), g).toBe(true);
        for (const g of ['3,5', '13/4', '2 4/4']) expect(checkAnswer(hr, ex, c, g), g).toBe(false);
        expect(checkAnswer(hr, ex, c, '12/4', true)).toBe(false);
        expect(checkAnswer(hr, ex, c, '3', true)).toBe(true);
    });
    test('negative values compare by value too', () => {
        const ex = sum({ whole: -3, n: 1, d: 4 });
        for (const g of ['-13/4', '-3 1/4', '−26/8', '-3 2/8']) expect(checkAnswer(hr, ex, c, g), g).toBe(true);
        for (const g of ['13/4', '-3,25', '-3 3/4']) expect(checkAnswer(hr, ex, c, g), g).toBe(false);
    });
    test('natural and decimal hr rows keep the spelling compare: no breuk for a whole answer', () => {
        const ex = { id: 'x', operands: [9, 3], operator: ':', answer: 3, isManuallyEdited: false };
        expect(exactFormOf(hr, { numberType: 'natural' })).toBe(true);
        expect(exactFormOf(hr, { numberType: 'natural' }, false)).toBe(true);
        expect(checkAnswer(hr, ex, { numberType: 'natural' }, '6/2', false)).toBe(false);
        expect(checkAnswer(hr, ex, { numberType: 'natural' }, '3', false)).toBe(true);
        const dec = { ...ex, operands: [7.5, 3], answer: 2.5 };
        expect(checkAnswer(hr, dec, { numberType: 'decimal' }, '5/2', false)).toBe(false);
        expect(checkAnswer(hr, dec, { numberType: 'decimal' }, '2,50', false)).toBe(true);
    });
});
