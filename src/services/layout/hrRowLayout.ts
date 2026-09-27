import type { Equation, Fraction } from '../math/types';
import { isFraction } from '../math/types';
import { formatMathNumber } from '../math/formatters';
import { FULL_BLOCK_WIDTH_PX } from '../../components/viewer/BlockWidthContext';

// ── The hoofdrekenen row (MathBlockRenderer) ─────────────────────────────────
// One pure function sizes the row — label column, operand boxes, answer slot, the 2-up
// decision — and the 1e9 fit ladder asks that very function "does the row fit at this
// font step?", so the estimate the ladder trusts is the geometry the viewer draws.
// Estimated from the block, never measured (viewer rule 5).

export type HrLayoutPreset = 'inline-short' | 'inline-long' | 'stepped' | string | undefined;

/** What the block's exercises need, scanned once. */
export interface HrRowStats {
    maxChars: number;        // widest numeric operand (and a missing operand's answer)
    maxAnswerChars: number;  // widest numeric answer
    maxTerms: number;        // at least 2
    maxFractionPx: number;   // widest fraction term in px at `mathPx` (0 = none)
    anyRemainder: boolean;
    anyMissingTerm: boolean;
}

export interface HrRowInput extends HrRowStats {
    widthPx: number;         // useBlockWidth()
    mathPx: number;          // the math token in px (useSheetSizePx('math'))
    layout: HrLayoutPreset;  // after the puntoefening override
    labelChars: number;      // widest item label ("10)" = 3), 0 = no numbering
    compScaffoldOn: boolean; // compenseren tussenstap line under the sum
}

export interface HrRowLayout {
    tight: boolean;
    compact: boolean;
    // Font steps the 1e9 ladder chose: 1 unless the row did not fit.
    fontScale: number;
    // Wrap the chain before its last term (only when even the smallest font did not fit).
    wrapChain: boolean;
    charPx: number;
    labelPx: number;
    labelColPx: number;
    widestTermPx: number;
    termBoxPx: number;
    answerLinePx: number;
    gridCols: 1 | 2;
    colGap: number;
    colJustify: 'center' | 'stretch';
    blankW: number;
    blankM: number;
    opGlyphPx: number;
    opTermGap: number;
    termUnitGap: number;
    eqGap: number;
    answerGap: number;
}

// Third sizing tier. A quarter-width cell is 163px (688 − 3×12 gap, ÷4), and the
// "narrow" tier still spends ~60px on column boxes and operator gaps that the writing
// line needs. Below 200px everything that is air rather than ink gives way: no column
// floors, 6px gaps, a blank sized to the answer, one exercise per row.
const TIGHT_MAX_PX = 200;
// Azeret Mono's advance, 11.06px measured in Chrome at the default 17.33px token.
const HR_CHAR_EM = 0.64;
// Long chains at the 1e9 ceiling: 3-4 terms of 10+ characters ("10 000 000" and up, never
// reachable at a max ≤ 1e6) can outrun even a full-width row — three 13-char terms in Kort
// need ~711px of 688. The math font steps down toward the floor first, then the chain
// wraps before its last term. A row that already fits skips all of it.
const FIT_MIN_CHARS = 10;
// 0.85 = WIDTH_FIT_FLOOR, the smallest size the sheet ever shrinks a block to.
export const HR_FIT_FONT_STEPS = [1, 0.95, 0.9, 0.85] as const;
// The red answer is set at 1.04 × the math token; the viewer draws it with this factor too.
export const HR_SOLUTION_FONT = 1.04;
// Lang / Stappen work line floor (workLine's minWidth outside tight).
const WORKLINE_MIN_PX = 55;
// A met-rest row carries the help column, the "r" and the rest blank on top of the sum:
// ~70px of help box + 8px gap + r + a 30px blank + the gaps around them.
const MET_REST_EXTRA_PX = 160;
// Keep the classic 2-up look as long as two rows fit with at least a 20px gap; the gap
// then stretches up to the traditional 50px when there's room.
const COL_GAP_MIN = 20;
// 2-up Stappen is for numbers under 1 000 only: 3 mono chars, so no thousands separator.
const STEPPED_2UP_MAX_CHARS = 3;
// 26, not 16: both operand cells are right-aligned, so a full-width number butts
// straight against the operator unless the span carries its own padding either side.
const COMPACT_OP_GAP = 26;

// What ONE VerticalFraction occupies: two stacked digit cells whose minWidth is
// (fontSize + 9)/17.33 em of the math token inside 4px of padding either side, plus the
// whole number of a mixed number. SYNC: VerticalFraction's cellMin and FractionDisplay's
// fontSize={15}. 0.62em is a (generous) digit advance at that size.
const FRACTION_FONT_PX = 15;
const FRACTION_CELL_MIN_EM = (FRACTION_FONT_PX + 9) / 17.33;
const FRACTION_DIGIT_EM = 0.62;

/** Width in px of one FractionDisplay at the math token `mathPx`. */
export function hrFractionPx(f: Fraction, mathPx: number): number {
    const digits = Math.max(String(f.n).length, String(f.d).length);
    const stack = Math.max(FRACTION_CELL_MIN_EM, digits * FRACTION_DIGIT_EM) * mathPx + 8;
    const whole = f.whole ? String(f.whole).length * FRACTION_DIGIT_EM * mathPx + 4 : 0;
    return Math.ceil(stack + whole);
}

/** Scan a block's exercises for what its row has to hold. */
export function hrRowStats(exercises: readonly (Equation | null | undefined)[], mathPx: number): HrRowStats {
    const s: HrRowStats = { maxChars: 0, maxAnswerChars: 0, maxTerms: 2, maxFractionPx: 0, anyRemainder: false, anyMissingTerm: false };
    for (const ex of exercises) {
        if (!ex?.operands) continue;
        s.maxTerms = Math.max(s.maxTerms, ex.operands.length);
        if (ex.remainder !== undefined) s.anyRemainder = true;
        for (const o of ex.operands) {
            if (typeof o === 'number') s.maxChars = Math.max(s.maxChars, formatMathNumber(o).length);
            else if (isFraction(o)) s.maxFractionPx = Math.max(s.maxFractionPx, hrFractionPx(o, mathPx));
        }
        // With a missing operand the (red) solution renders inside the operand cell too.
        const hasMissing = ex.missingIndex !== undefined || ex.missingTerm === 'operand1' || ex.missingTerm === 'operand2';
        if (hasMissing) s.anyMissingTerm = true;
        if (hasMissing && typeof ex.answer === 'number') s.maxChars = Math.max(s.maxChars, formatMathNumber(ex.answer).length);
        if (hasMissing && isFraction(ex.answer)) s.maxFractionPx = Math.max(s.maxFractionPx, hrFractionPx(ex.answer, mathPx));
        if (typeof ex.answer === 'number') s.maxAnswerChars = Math.max(s.maxAnswerChars, formatMathNumber(ex.answer).length);
    }
    return s;
}

// The row's geometry at one font step, plus the 1-up width it needs (wrapped or not).
function geometry(inp: HrRowInput, fontScale: number, wrapChain: boolean) {
    const { widthPx, mathPx, layout, labelChars, maxChars, maxAnswerChars, maxTerms, maxFractionPx, anyRemainder, anyMissingTerm, compScaffoldOn } = inp;
    const tight = widthPx < TIGHT_MAX_PX;
    const isInlineShort = layout === 'inline-short';
    const blankW = tight ? 30 : 40;
    const blankM = tight ? 3 : 6;
    // An operator belongs to the operand AFTER it: `[operator][opTermGap][operand]` is one
    // unit, so the air after the sign is a constant and "+ 51" reads like "+315".
    const opGlyphPx = tight ? 12 : 13;  // one Azeret Mono glyph at 17px (11.06), rounded up
    // The same air on both sides of a sign: the owner reads "72   + 1" as jitter.
    const opTermGap = tight ? 6 : 10;
    const termUnitGap = opTermGap;
    // Halved when tight: 4 gaps x 4px is what buys `532 + 342 = ____` its place in a 163px quarter.
    const eqGap = tight ? 6 : 10;
    const answerGap = tight ? 4 : 8;

    const charPx = mathPx * HR_CHAR_EM * fontScale;
    // ONE label column for the whole block, sized to its longest label, so "1)" and "10)"
    // still leave the "=" of every row on the same x. +4px of air after the widest label.
    const labelPx = labelChars > 0 ? Math.ceil(labelChars * charPx) + 4 : 0;
    const labelColPx = labelPx > 0 ? labelPx + opTermGap : 0;
    // ONE term width for the whole block, fractions included, so "=" and the answer line
    // don't wander from row to row.
    const widestTermPx = Math.max(Math.ceil(maxChars * charPx), maxFractionPx);
    // The answer blank follows the block's WIDEST answer — one width for the whole block:
    // a blank sized to its own answer would tell the child how many digits to expect.
    // Tight: sized to the answer alone; a ≤3-digit answer (tafels) gets a 40px line, which
    // is what puts "7 x 8 = ___" inside a 163px quarter.
    const tightAnswerFloor = maxAnswerChars <= 3 ? 40 : 50;
    const answerLinePx = tight
        ? Math.max(tightAnswerFloor, Math.ceil(maxAnswerChars * charPx) + 12)
        : Math.max(75, Math.ceil(maxAnswerChars * charPx) + 24);

    // The Kort 2-up estimate. Its 85px cell floor already overstates a default row by
    // ~100px, so it does NOT charge the label column: that pushed default blocks to 1-up.
    const cellPx = Math.max(85, widestTermPx + 6);
    // The compenseren tussenstap line ("= a + ___ − ___") is much wider than the workline.
    const answerW = compScaffoldOn ? 175 + widestTermPx : answerLinePx + 19;
    const rowEstimate = maxTerms * cellPx + (maxTerms - 1) * (maxTerms > 2 ? 20 : 26)
        + 8 + answerW + (anyRemainder ? MET_REST_EXTRA_PX : 0);
    // A stepped row needs writing room for a hand-written tussenstap, scaled with the
    // widest operand; in its 2-up grid the operand columns tighten (no 85px floor).
    const worklineMinPx = Math.max(80, widestTermPx + 30);
    const compactCellPx = Math.max(46, widestTermPx + 6);
    const steppedRowMin = maxTerms * compactCellPx + (maxTerms - 1) * COMPACT_OP_GAP
        + 8 + 10 /* "=" glyph + its right margin */ + worklineMinPx + labelColPx;
    const twoUpShort = !tight && isInlineShort && rowEstimate * 2 + COL_GAP_MIN <= widthPx;
    // Met-rest rows ignore layout and the compenseren line is far wider than a workline:
    // both stay 1-up. Longer term chains stay eligible and fall out on width alone.
    const twoUpStepped = !tight && layout === 'stepped' && !anyRemainder && !compScaffoldOn
        && maxChars <= STEPPED_2UP_MAX_CHARS
        && steppedRowMin * 2 + COL_GAP_MIN <= widthPx;
    const gridCols: 1 | 2 = (twoUpShort || twoUpStepped) ? 2 : 1;
    const rowWidthUsed = twoUpShort ? rowEstimate : steppedRowMin;
    const colGap = gridCols === 2 ? Math.min(50, widthPx - 2 * rowWidthUsed) : 50;
    // Centring a stepped row would collapse its flex:1 workline — only the intrinsically
    // sized inline-short rows get centred inside their column.
    const colJustify: 'center' | 'stretch' = gridCols === 2 && isInlineShort ? 'center' : 'stretch';
    // In a narrow cell the 85px operand columns eat the width the ANSWER line needs, so
    // the operands tighten and the writing line keeps the space.
    const compact = twoUpStepped || widthPx < FULL_BLOCK_WIDTH_PX - 20;
    // The fill-in blank is blankW inside blankM margins; a narrower box would let it overrun
    // its neighbour. Tight drops the alignment floor: the box is the longest operand alone.
    const termBoxPx = Math.max(anyMissingTerm ? blankW + 2 * blankM : (tight ? 0 : compact ? 24 : 40), widestTermPx + 4);

    // The 1-up row as drawn: label column, first box, one [gap][sign][gap][box] unit per
    // later term, then [gap]"="[gap] and the answer slot — Kort's blank, Lang/Stappen's
    // work-line floor, or the red answer if that is wider.
    const unitPx = termUnitGap + opGlyphPx + opTermGap + termBoxPx;
    const slotPx = isInlineShort ? answerLinePx : WORKLINE_MIN_PX;
    const answerColPx = answerGap + charPx + eqGap + Math.max(slotPx, Math.ceil(maxAnswerChars * charPx * HR_SOLUTION_FONT) + 8);
    const rowNeedPx = wrapChain
        ? labelColPx + termBoxPx + Math.max((maxTerms - 2) * unitPx, unitPx + answerColPx)
        : labelColPx + termBoxPx + (maxTerms - 1) * unitPx + answerColPx;

    const layoutOut: HrRowLayout = {
        tight, compact, fontScale, wrapChain, charPx, labelPx, labelColPx, widestTermPx, termBoxPx, answerLinePx,
        gridCols, colGap, colJustify, blankW, blankM, opGlyphPx, opTermGap, termUnitGap, eqGap, answerGap,
    };
    return { layout: layoutOut, rowNeedPx };
}

/** The 1-up row width the ladder tests at one font step, wrapped or not. */
export function hrRowNeedPx(inp: HrRowInput, fontScale: number, wrapChain: boolean): number {
    return geometry(inp, fontScale, wrapChain).rowNeedPx;
}

/** Size the hoofdrekenen row and pick its fit: full font, a smaller step, or a wrapped chain. */
export function hrRowLayout(inp: HrRowInput): HrRowLayout {
    const full = geometry(inp, 1, false);
    const fitCandidate = !full.layout.tight && inp.maxTerms >= 3 && inp.maxChars >= FIT_MIN_CHARS
        && inp.maxFractionPx === 0 && !inp.anyRemainder;
    if (!fitCandidate || full.rowNeedPx <= inp.widthPx) return full.layout;
    for (const wrap of [false, true]) {
        for (const f of HR_FIT_FONT_STEPS) {
            const g = geometry(inp, f, wrap);
            if (g.rowNeedPx <= inp.widthPx) return g.layout;
        }
    }
    // Nothing fits: draw it as before at full size and let the measured clamp refuse the width.
    return full.layout;
}
