import { describe, test, expect } from 'vitest';
import { hrRowLayout, hrRowNeedPx, hrRowStats, HR_FIT_FONT_STEPS, HR_SOLUTION_FONT, type HrRowInput, type HrRowLayout } from '../services/layout/hrRowLayout';
import type { Equation } from '../services/math/types';

// The hoofdrekenen fit ladder at the 1e9 ceiling: a row that fits keeps the full font, one
// that doesn't steps the math font down (0.95 → 0.9 → 0.85) and only then wraps the chain
// before its last term. The ladder and the drawn row share one geometry, so each choice is
// checked against the row rebuilt from the widths the viewer actually draws.

const FULL = 688;
const MATH_PX = 17.33; // 13pt at 96dpi, the default Lettergrootte

const input = (layout: string, maxTerms: number, maxChars: number, maxAnswerChars: number, over: Partial<HrRowInput> = {}): HrRowInput => ({
    widthPx: FULL, mathPx: MATH_PX, layout, labelChars: 0, compScaffoldOn: false,
    maxChars, maxAnswerChars, maxTerms, maxFractionPx: 0, anyRemainder: false, anyMissingTerm: false,
    ...over,
});

// The 1-up row as MathBlockRenderer lays it out: label column, first box, one
// [gap][sign][gap][box] unit per later term, then [gap] "=" [gap] and the answer slot.
function drawnRowPx(r: HrRowLayout, inp: HrRowInput): number {
    const unit = r.termUnitGap + r.opGlyphPx + r.opTermGap + r.termBoxPx;
    const slot = inp.layout === 'inline-short' ? r.answerLinePx : 55;
    const answer = r.answerGap + r.charPx + r.eqGap + Math.max(slot, Math.ceil(inp.maxAnswerChars * r.charPx * HR_SOLUTION_FONT) + 8);
    return r.wrapChain
        ? r.labelColPx + r.termBoxPx + Math.max((inp.maxTerms - 2) * unit, unit + answer)
        : r.labelColPx + r.termBoxPx + (inp.maxTerms - 1) * unit + answer;
}

// "1 000 000" = 9 chars (1e6), "999 999 999" = 11, "1 000 000 000" = 13 (1e9).
const KORT = 'inline-short', LANG = 'inline-long', STAPPEN = 'stepped';
const CASES: { name: string; inp: HrRowInput; font: number; wrap: boolean }[] = [
    ...[KORT, LANG, STAPPEN].flatMap(layout => [2, 3, 4].map(terms => ({
        name: `${layout} 1e6 ${terms} terms`, inp: input(layout, terms, 9, 9), font: 1, wrap: false,
    }))),
    ...[KORT, LANG, STAPPEN].map(layout => ({ name: `${layout} 1e9 2 terms`, inp: input(layout, 2, 13, 13), font: 1, wrap: false })),
    { name: 'Kort 1e9 3 terms, 11-char operands, numbered', inp: input(KORT, 3, 11, 13, { labelChars: 3 }), font: 0.95, wrap: false },
    { name: 'Kort 1e9 3 terms, 11-char operands', inp: input(KORT, 3, 11, 13), font: 1, wrap: false },
    { name: 'Kort 1e9 3 terms, numbered', inp: input(KORT, 3, 13, 13, { labelChars: 3 }), font: 0.85, wrap: false },
    { name: 'Kort 1e9 3 terms, 13-char', inp: input(KORT, 3, 13, 13), font: 0.9, wrap: false },
    { name: 'Kort 1e9 4 terms, 11-char', inp: input(KORT, 4, 11, 11), font: 1, wrap: true },
    { name: 'Kort 1e9 4 terms, 13-char', inp: input(KORT, 4, 13, 13), font: 1, wrap: true },
    { name: 'Lang 1e9 3 terms', inp: input(LANG, 3, 13, 13), font: 0.95, wrap: false },
    { name: 'Lang 1e9 3 terms, numbered 1)', inp: input(LANG, 3, 13, 13, { labelChars: 2 }), font: 0.9, wrap: false },
    { name: 'Lang 1e9 3 terms, numbered 10)', inp: input(LANG, 3, 13, 13, { labelChars: 3 }), font: 0.85, wrap: false },
    { name: 'Lang 1e9 4 terms, 11-char', inp: input(LANG, 4, 11, 11), font: 0.85, wrap: false },
    { name: 'Lang 1e9 4 terms, 13-char', inp: input(LANG, 4, 13, 13), font: 1, wrap: true },
    { name: 'Stappen 1e9 3 terms', inp: input(STAPPEN, 3, 13, 13), font: 0.95, wrap: false },
    { name: 'Stappen 1e9 4 terms, 11-char', inp: input(STAPPEN, 4, 11, 11), font: 0.85, wrap: false },
    { name: 'Stappen 1e9 4 terms, 13-char, numbered', inp: input(STAPPEN, 4, 13, 13, { labelChars: 3 }), font: 1, wrap: true },
];

describe('hrRowLayout — the fit ladder', () => {
    test.each(CASES)('$name → font $font, wrap $wrap', ({ inp, font, wrap }) => {
        const r = hrRowLayout(inp);
        expect(r.fontScale).toBe(font);
        expect(r.wrapChain).toBe(wrap);
        // The chosen row fits the cell as drawn…
        expect(drawnRowPx(r, inp)).toBeLessThanOrEqual(FULL);
        // …and a fitted row really needed it: the same row at full size does not.
        if (font !== 1 || wrap) {
            const unfitted = hrRowLayout({ ...inp, widthPx: 10_000 });
            expect(unfitted.fontScale).toBe(1);
            expect(drawnRowPx(unfitted, inp)).toBeGreaterThan(FULL);
        }
    });

    test.each(CASES)('$name: every earlier rung of the ladder overflows', ({ inp, font, wrap }) => {
        const ladder = [false, true].flatMap(w => HR_FIT_FONT_STEPS.map(f => ({ f, w })));
        const chosen = ladder.findIndex(o => o.f === font && o.w === wrap);
        expect(chosen).toBeGreaterThanOrEqual(0);
        for (const o of ladder.slice(0, chosen)) expect(hrRowNeedPx(inp, o.f, o.w)).toBeGreaterThan(FULL);
        expect(hrRowNeedPx(inp, font, wrap)).toBeLessThanOrEqual(FULL);
        // The ladder's number is the drawn row's number.
        expect(hrRowNeedPx(inp, font, wrap)).toBeCloseTo(drawnRowPx(hrRowLayout(inp), inp), 6);
    });

    test('a bigger Lettergrootte pushes the same row further down the ladder', () => {
        const at13pt = hrRowLayout(input(LANG, 3, 13, 13));
        const at16pt = hrRowLayout(input(LANG, 3, 13, 13, { mathPx: 21.33 }));
        expect(at13pt).toMatchObject({ fontScale: 0.95, wrapChain: false });
        expect(at16pt).toMatchObject({ fontScale: 1, wrapChain: true });
    });

    test('rows outside the 1e9 case never fit or wrap', () => {
        const long = input(KORT, 4, 13, 13);
        expect(hrRowLayout({ ...long, widthPx: 163 })).toMatchObject({ tight: true, fontScale: 1, wrapChain: false });
        expect(hrRowLayout({ ...long, anyRemainder: true })).toMatchObject({ fontScale: 1, wrapChain: false });
        expect(hrRowLayout({ ...long, maxFractionPx: 40 })).toMatchObject({ fontScale: 1, wrapChain: false });
        expect(hrRowLayout({ ...long, maxChars: 9 })).toMatchObject({ fontScale: 1, wrapChain: false });
    });

    test('default-sized rows keep the classic grid: 2-up Kort, 2-up Stappen under 1 000', () => {
        expect(hrRowLayout(input(KORT, 2, 3, 3)).gridCols).toBe(2);
        expect(hrRowLayout(input(STAPPEN, 2, 3, 3)).gridCols).toBe(2);
        expect(hrRowLayout(input(STAPPEN, 2, 5, 5)).gridCols).toBe(1);
        expect(hrRowLayout(input(LANG, 2, 3, 3)).gridCols).toBe(1);
        expect(hrRowLayout(input(KORT, 2, 3, 3, { widthPx: 163 })).gridCols).toBe(1);
    });
});

describe('hrRowStats', () => {
    const eq = (operands: number[], answer: number, extra: Partial<Equation> = {}): Equation =>
        ({ id: String(answer), operands, operator: '+', answer, isManuallyEdited: false, ...extra });

    test('reads the widest operand, answer and chain length at 1e9', () => {
        const s = hrRowStats([eq([999_999_999, 999_999_999, 999_999_999], 2_999_999_997), eq([12, 30], 42)], MATH_PX);
        expect(s).toMatchObject({ maxChars: 11, maxAnswerChars: 13, maxTerms: 3, anyMissingTerm: false, anyRemainder: false, maxFractionPx: 0 });
    });

    test('a missing operand counts its answer as an operand', () => {
        const s = hrRowStats([eq([1_000_000_000, 5], 5, { missingTerm: 'operand2' })], MATH_PX);
        expect(s).toMatchObject({ maxChars: 13, anyMissingTerm: true });
    });

    test('skips empty slots and flags met-rest', () => {
        const s = hrRowStats([null, undefined, eq([21, 4], 5, { operator: ':', remainder: 1 })], MATH_PX);
        expect(s).toMatchObject({ maxChars: 2, maxTerms: 2, anyRemainder: true });
    });
});
