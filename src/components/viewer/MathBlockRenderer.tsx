import { useEffect, useRef, useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { isFraction } from '../../services/math/types';
import type { Equation } from '../../services/math/types';
import { formatMathNumber, opGlyph as printedOp } from '../../services/math/formatters';
import type { MathBlock, Fraction } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';
import { FULL_BLOCK_WIDTH_PX, useBlockWidth, useSheetSizePx, ANSWER_LINE_H, ANSWER_ROW_H } from './BlockWidthContext';
import type { MulDivConstraints, MixedConstraints, MixedVariantId } from '../../services/math/constraintTypes';
import { MIXED_VARIANTS } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { sharedPluginStyles as S } from '../configurator/plugins/sharedPluginStyles';
import { itemLabel, itemLabelChars } from './itemNumbering';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Sheet font sizes below are factors of --sheet-size-math (digits/mono) so the Blad-tab
// sliders rescale every rendered number; screen-only chrome (emptyStateText) is exempt.
const styles = {
    solutionText: { ...solutionText, padding: '0 4px', fontSize: 'calc(var(--sheet-size-math) * 1.04)' } as React.CSSProperties,
    // The fill-in blank shrinks with the cell: 40px inside 6px margins at full width, a
    // narrower line in a quarter-width block where those 52px are a third of the row.
    mathDottedLine: (w = 40, m = 6): React.CSSProperties => ({ borderBottom: '1.5px solid #000', width: `${w}px`, margin: `0 ${m}px`, display: 'inline-block', height: ANSWER_LINE_H }),
    mathInput: { width: '70px', textAlign: 'center', fontSize: 'calc(var(--sheet-size-math) * 1)', fontFamily: 'Azeret Mono, monospace', border: '1px solid transparent', background: 'transparent', outline: 'none', color: '#000', padding: 0 } as React.CSSProperties,
    fractionWrapper: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', fontSize: 'calc(var(--sheet-size-math) * 0.87)' } as React.CSSProperties,
    fractionTop: { borderBottom: '1.5px solid #000', padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    fractionBottom: { padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    wholeNumberStyle: { fontSize: 'calc(var(--sheet-size-math) * 1.04)', marginRight: '4px', color: '#000' } as React.CSSProperties,
    exerciseRow: { display: 'flex', alignItems: 'flex-end', fontSize: 'calc(var(--sheet-size-math) * 1)', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
    // widthPx applies only to the inline-short blank; inline-long and stepped keep their
    // full-width work line, which is writing room rather than an answer-sized slot.
    // In a tight cell the line is FLEXIBLE instead of fixed: it takes whatever the sum
    // leaves it, down to a 40px floor. A fixed answer-sized blank there would push the row
    // past the cell edge, and a line that runs off the paper is worse than a short one.
    workLine: (layout: string | undefined, widthPx = 75, tight = false): React.CSSProperties => ({
        borderBottom: '1.5px solid #000',
        minWidth: `${Math.min(tight ? 40 : 55, widthPx)}px`,
        width: (tight || layout === 'inline-long' || layout === 'stepped') ? '100%' : `${widthPx}px`,
    }),
    emptyStateText: { padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' } as React.CSSProperties,
    // The popup anchors to the glyph itself (an inline span, not a full-width trigger like
    // PopupSelect's), so it can't reuse sharedPluginStyles.selectMenu's left:0/right:0 —
    // that would stretch the menu to the glyph's own (tiny) width instead of its content.
    opSwitchMenu: {
        position: 'absolute', top: 'calc(100% + 2px)', left: '50%', transform: 'translateX(-50%)',
        zIndex: 50, minWidth: '190px', whiteSpace: 'nowrap',
        background: 'var(--bg-surface)', border: '1px solid var(--separator)',
        borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-2)', padding: '4px',
    } as React.CSSProperties,
};

function FractionDisplay({ val, color }: { val: Fraction; color?: string }) {
    return <VerticalFraction value={val} color={color} fontSize={15} />;
}

// Best-effort guess at which variant produced an existing exercise, so the popup can mark
// it active. `Equation` carries no variant id (only `operator`), so when a block offers
// several variants sharing the same operator (e.g. '+' and '+:compenseren') this can't
// tell them apart — it prefers the plain (no-preset) variant, which is what most exercises
// in a mix actually are.
function guessVariant(ex: Equation, options: { id: MixedVariantId; op: string }[]): MixedVariantId | null {
    // The generator tags each exercise with its variant; the operator-only guess below is
    // the fallback for exercises saved before that tag existed.
    if (ex.variant && options.some(o => o.id === ex.variant)) return ex.variant as MixedVariantId;
    const forOp = options.filter(o => o.op === ex.operator);
    if (forOp.length === 0) return null;
    return (forOp.find(o => !o.id.includes(':')) ?? forOp[0]).id;
}

// Clickable operator glyph for a 'gemengd' (mixed-operator) block: opens a tiny popup
// listing the block's chosen variants, and regenerates just this one exercise on pick.
// `.no-print` only wraps the popup itself — the glyph span always renders (plain text
// in print; the `.op-switch` class only adds interactive styling on screen).
function OperatorSwitch({ blockId, exerciseId, glyph, current, options }: {
    blockId: string; exerciseId: string; glyph: string; current: MixedVariantId | null;
    options: { id: MixedVariantId; label: string }[];
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);
    const regenerateExercise = useWorksheetStore((s) => s.regenerateExercise);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, [open]);

    return (
        <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
            <span
                className="op-switch"
                role="button"
                tabIndex={0}
                title="Bewerking wijzigen"
                onClick={() => setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v); }
                }}
            >
                {glyph}
            </span>
            {open && (
                <div className="no-print" role="listbox" style={styles.opSwitchMenu}>
                    {options.map((o) => (
                        <div
                            key={o.id}
                            role="option"
                            aria-selected={o.id === current}
                            onClick={() => { regenerateExercise(blockId, exerciseId, o.id); setOpen(false); }}
                            style={S.selectItem(o.id === current)}
                        >
                            {o.label}
                        </div>
                    ))}
                </div>
            )}
        </span>
    );
}

export default function MathBlockRenderer({ block, showSolutions }: Props) {
    const A4_CONTENT_PX = useBlockWidth();
    // The math token in px, so the column widths below follow the Lettergrootte slider.
    const sheetPx = useSheetSizePx('math');
    // Third sizing tier. A quarter-width cell is 163px (688 − 3×12 gap, ÷4), and the
    // "narrow" tier below still spends ~60px on column boxes and operator gaps that the
    // writing line needs. Below 200px everything that is air rather than ink gives way:
    // no column floors, 6px gaps, a blank sized to the answer, one exercise per row.
    const TIGHT_MAX_PX = 200;
    const tight = A4_CONTENT_PX < TIGHT_MAX_PX;
    const BLANK_W = tight ? 30 : 40;
    const BLANK_M = tight ? 3 : 6;
    const blocks = useWorksheetStore((state) => state.blocks);
    const updateExercise = useWorksheetStore((state) => state.updateExercise);

    const renderTerm = (val: number | Fraction | undefined, isMissing: boolean, blockId: string, exId: string, opIdx: number, widthPx?: number) => {
        if (val === undefined) return null;

        if (isMissing) {
            if (showSolutions) {
                if (isFraction(val)) return <span style={styles.solutionText}><FractionDisplay val={val} /></span>;
                return <span style={styles.solutionText}>{formatMathNumber(val)}</span>;
            }
            return <div style={styles.mathDottedLine(BLANK_W, BLANK_M)}></div>;
        }

        if (isFraction(val)) return <FractionDisplay val={val} />;

        return (
            <input
                type="text"
                value={formatMathNumber(val)}
                onChange={(e) => {
                    const cleanVal = e.target.value.replace(/\s/g, '').replace(',', '.');
                    const nVal = Number(cleanVal);
                    if (!isNaN(nVal)) {
                        const currentEx = blocks.find(b => b.id === blockId)?.exercises.find(ex => ex.id === exId);
                        if (currentEx) {
                            const newOps = currentEx.operands.map((o, i) => (i === opIdx ? nVal : o));
                            updateExercise(blockId, exId, { operands: newOps });
                        }
                    }
                }}
                // The input is exactly as wide as the number it holds (or as wide as the
                // block's column box, for the first operand). A fixed 70px box with centred
                // text is what pushed a short second operand away from its operator and a
                // long one flush against it: the width, not the spacing, was the bug.
                style={{ ...styles.mathInput, textAlign: 'right', width: widthPx === undefined ? undefined : `${widthPx}px` }}
            />
        );
    };

    const renderGiven = (val: number | Fraction | undefined) => {
        if (val === undefined) return null;
        if (isFraction(val)) return <FractionDisplay val={val} />;
        return <span style={{ fontFamily: 'Azeret Mono, monospace', fontSize: 'calc(var(--sheet-size-math) * 1)', color: '#000' }}>{formatMathNumber(val as number)}</span>;
    };

    const renderAnswer = (val: number | Fraction | undefined) => {
        if (val === undefined) return null;
        if (isFraction(val)) return <FractionDisplay val={val} color={SOL} />;
        return <span style={styles.solutionText}>{formatMathNumber(val)}</span>;
    };

    if (!block.exercises || block.exercises.length === 0) {
        return <div className="no-print" style={styles.emptyStateText}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // Puntoefeningen (a + . = c) are by definition single short lines — force inline-short
    // regardless of the stored preset (the Kort/Lang/Stappen control is hidden for them).
    const c = block.constraints as MulDivConstraints;
    const isPunt = c.equationType === 'puntoefening';
    const layout = isPunt ? 'inline-short' : block.layoutPreset;
    const isInlineShort = layout === 'inline-short';

    // 'Gemengd' (mixed-operator) block: NOT a typeId check — any family whose constraints
    // carry a `variants` array gets the per-exercise operator switch (only hr-std-gemengd
    // does today, but a future family that reuses this shape gets it for free).
    const mixedC = block.constraints as MixedConstraints;
    const mixedOptions = Array.isArray(mixedC.variants)
        ? MIXED_VARIANTS.filter(v => mixedC.variants.includes(v.id))
        : null;

    // Adaptive sizing: the classic fixed 85px operand column fits 8 mono chars, so
    // "1 000 000" (9 chars) clipped its last digit. Widen the column to the block's
    // longest formatted operand, and drop the 2-up grid to 1-up when two widened rows
    // no longer fit the printable width (A4 content ≈ 625px).
    // Azeret Mono's advance is 0.64em (11.06px measured in Chrome at the default 17.33px
    // token), so the operand columns follow the Lettergrootte slider instead of freezing
    // at 13pt the way a hardcoded 11.1 did.
    const CHAR_PX = sheetPx * 0.64;
    // ONE label column for the whole block, sized to its longest label, so "1)" and "10)"
    // still leave the "=" of every row on the same x. +4px of air after the widest label.
    const labelChars = itemLabelChars(block.itemNumbering, block.exercises.length);
    const labelPx = labelChars > 0 ? Math.ceil(labelChars * CHAR_PX) + 4 : 0;
    // What ONE VerticalFraction occupies: two stacked digit cells whose minWidth is
    // (fontSize + 9)/17.33 em of the math token inside 4px of padding either side, plus the
    // whole number of a mixed number. SYNC: VerticalFraction's cellMin and FractionDisplay's
    // fontSize={15}. A digit there is not mono, so 0.62em is the (generous) advance.
    const FRACTION_FONT_PX = 15;
    const FRACTION_CELL_MIN_EM = (FRACTION_FONT_PX + 9) / 17.33;
    const FRACTION_DIGIT_EM = 0.62;
    const fractionPx = (f: Fraction): number => {
        const digits = Math.max(String(f.n).length, String(f.d).length);
        const stack = Math.max(FRACTION_CELL_MIN_EM, digits * FRACTION_DIGIT_EM) * sheetPx + 8;
        const whole = f.whole ? String(f.whole).length * FRACTION_DIGIT_EM * sheetPx + 4 : 0;
        return Math.ceil(stack + whole);
    };
    let maxChars = 0;
    let maxAnswerChars = 0;
    let maxTerms = 2;
    let anyRemainder = false;
    let anyMissingTerm = false;
    let maxFractionPx = 0;
    for (const ex of block.exercises) {
        if (!ex?.operands) continue;
        maxTerms = Math.max(maxTerms, ex.operands.length);
        if (ex.remainder !== undefined) anyRemainder = true;
        for (const o of ex.operands) {
            if (typeof o === 'number') maxChars = Math.max(maxChars, formatMathNumber(o).length);
            else if (isFraction(o)) maxFractionPx = Math.max(maxFractionPx, fractionPx(o));
        }
        // With a missing operand the (red) solution renders inside the operand cell too.
        const hasMissing = ex.missingIndex !== undefined || ex.missingTerm === 'operand1' || ex.missingTerm === 'operand2';
        if (hasMissing) anyMissingTerm = true;
        if (hasMissing && typeof ex.answer === 'number') maxChars = Math.max(maxChars, formatMathNumber(ex.answer).length);
        if (hasMissing && isFraction(ex.answer)) maxFractionPx = Math.max(maxFractionPx, fractionPx(ex.answer));
        if (typeof ex.answer === 'number') maxAnswerChars = Math.max(maxAnswerChars, formatMathNumber(ex.answer).length);
    }
    // ONE term width for the whole block, fractions included. A block with a fraction used
    // to fall back to intrinsic widths for every term, so "=" and the answer line wandered
    // from row to row: 10/10 x 10/7 pushed them far right of 3/6 x 1/8.
    const widestTermPx = Math.max(Math.ceil(maxChars * CHAR_PX), maxFractionPx);
    // The answer blank used to be a flat 75px whatever the answer was, so a block of
    // units and a block of thousands got the same line. It now follows the block's
    // WIDEST answer — one width for the whole block, never per exercise: a blank sized
    // to its own answer would tell the child how many digits to expect.
    // In a tight cell the same blank is sized to the answer alone: 50px is still three
    // handwritten digits, and every px above that comes straight out of the operands.
    // A tafels block answers in at most three digits, and a 40px line is still three
    // handwritten ones — the 10px that buys is what puts "7 x 8 = ___" inside a 163px
    // quarter. Read off the block's own answers, not off multiplicationMode: the rule is
    // about how much the child writes, not about which mode produced it.
    const tightAnswerFloor = maxAnswerChars <= 3 ? 40 : 50;
    const answerLinePx = tight
        ? Math.max(tightAnswerFloor, Math.ceil(maxAnswerChars * CHAR_PX) + 12)
        : Math.max(75, Math.ceil(maxAnswerChars * CHAR_PX) + 24);
    const cellPx = Math.max(85, widestTermPx + 6);
    // An operator belongs to the operand AFTER it. `[operator][OP_TERM_GAP][operand]` is
    // therefore laid out as ONE right-aligned unit: the air after the sign is a constant
    // (so "+ 51" and "+315" read identically), the air before it is a constant too, and the
    // operand's last digit still lands on the block's column edge because the unit -- not
    // the operand -- carries the fixed width. Before this the operand sat in a fixed
    // right-aligned cell, so all of its slack fell between the sign and the digits.
    const OP_GLYPH_PX = tight ? 12 : 13;  // one Azeret Mono glyph at 17px (11.06), rounded up
    // The same air on both sides of a sign: the owner reads "72   + 1" as jitter.
    const OP_TERM_GAP = tight ? 6 : 10;   // sign -> its operand
    const TERM_UNIT_GAP = OP_TERM_GAP;    // operand -> the sign of the next one
    // Air around the "=" and between the sum and its answer column. Halved when tight:
    // 4 gaps x 4px is what buys `532 + 342 = ____` its place inside a 163px quarter.
    const EQ_GAP = tight ? 6 : 10;
    const ANSWER_GAP = tight ? 4 : 8;
    const labelCell = (i: number) => {
        const text = itemLabel(block.itemNumbering, i);
        if (!text) return null;
        return <span style={{ width: `${labelPx}px`, flexShrink: 0, textAlign: 'right', marginRight: `${OP_TERM_GAP}px`, whiteSpace: 'nowrap' }}>{text}</span>;
    };
    // The label column is real width. The stepped estimate pays for it; the Kort estimate
    // does NOT: its 85px cellPx floor already overstates a default row by ~100px, and
    // charging the label on top pushed a default 2-up block to 1-up for no visible reason.
    const labelColPx = labelPx > 0 ? labelPx + OP_TERM_GAP : 0;
    // One row ≈ operand cells + operator gaps + "=" + answer workline (+ met-rest extras).
    // The compenseren tussenstap line ("= a + ___ − ___") is much wider than the workline.
    const compScaffoldOn = c.preset === 'compenseren'
        && (c.compenserenScaffold ?? 'tussenstap') === 'tussenstap';
    const answerW = compScaffoldOn ? 175 + widestTermPx : answerLinePx + 19;
    // A met-rest row carries the help column, the "r" and the rest blank on top of the sum:
    // ~70px of help box + 8px gap + r + a 30px blank + the gaps around them.
    const MET_REST_EXTRA_PX = 160;
    const rowEstimate = maxTerms * cellPx + (maxTerms - 1) * (maxTerms > 2 ? 20 : 26)
        + 8 + answerW + (anyRemainder ? MET_REST_EXTRA_PX : 0);
    // A stepped row is sized differently: the answer column is flex:1 with a 100%-wide
    // workline, so what it really needs is writing room for a hand-written tussenstap.
    // That room scales with the block's widest operand instead of the fixed 94px field.
    const worklineMinPx = Math.max(80, widestTermPx + 30);
    // In the 2-up stepped grid the operand columns tighten — no 85px alignment floor and a
    // narrower operator gap — so the freed width goes to the work line instead. The wide
    // sizing stays everywhere else, where column alignment matters more than writing room.
    const compactCellPx = Math.max(46, widestTermPx + 6);
    // 26, not 16: both operand cells are right-aligned, so a full-width number butts
    // straight against the operator unless the span carries its own padding either side.
    const COMPACT_OP_GAP = 26;
    const steppedRowMin = maxTerms * compactCellPx + (maxTerms - 1) * COMPACT_OP_GAP
        + 8 + 10 /* "=" glyph + its right margin */ + worklineMinPx + labelColPx;
    // Keep the classic 2-up look as long as two rows fit with at least a 20px gap;
    // the gap then stretches up to the traditional 50px when there's room.
    const COL_GAP_MIN = 20;
    const twoUpShort = !tight && isInlineShort && rowEstimate * 2 + COL_GAP_MIN <= A4_CONTENT_PX;
    // 2-up Stappen is for numbers under 1 000 only: 3 mono chars, so no thousands separator.
    // A pure width test would also let 4-digit operands through, but then the tussenstap line
    // is too short to write on. Met-rest rows ignore layout entirely and the compenseren
    // tussenstap line is far wider than a workline — both stay 1-up. Longer term chains stay
    // eligible and fall out on width alone.
    const STEPPED_2UP_MAX_CHARS = 3;
    const twoUpStepped = !tight && layout === 'stepped' && !anyRemainder && !compScaffoldOn
        && maxChars <= STEPPED_2UP_MAX_CHARS
        && steppedRowMin * 2 + COL_GAP_MIN <= A4_CONTENT_PX;
    const gridCols = (twoUpShort || twoUpStepped) ? 2 : 1;
    const rowWidthUsed = twoUpShort ? rowEstimate : steppedRowMin;
    const colGap = gridCols === 2 ? Math.min(50, A4_CONTENT_PX - 2 * rowWidthUsed) : 50;
    // Centring a stepped row would collapse its flex:1 workline — only the
    // intrinsically-sized inline-short rows get centred inside their column.
    const colJustify = gridCols === 2 && isInlineShort ? 'center' : 'stretch';
    // In a narrow cell the classic 85px operand columns and 26px operator gaps eat the
    // width the ANSWER line needs. A worksheet exists so pupils can write on it, so the
    // operands tighten and the writing line keeps the space instead.
    const isNarrow = A4_CONTENT_PX < FULL_BLOCK_WIDTH_PX - 20;
    const compact = twoUpStepped || isNarrow;
    const termPx = (chars: number) => Math.ceil(chars * CHAR_PX) + 4;
    // Met-rest extras. The quotient and rest blanks are one width for the whole block (a
    // blank sized to its own answer would tell the child how many digits to expect), and
    // the help column is the "(" + dotted blank + ")" measured as a box so it can be a
    // fixed column rather than inline content that shifts the sum.
    const HELP_BLANK_PX = 40;
    const QUOTIENT_BLANK_PX = 40;
    const REST_BLANK_PX = 30;
    const HELP_COL_PX = 2 * OP_GLYPH_PX + HELP_BLANK_PX + 4;
    // The fill-in blank (mathDottedLine) is 40px wide inside 6px margins; a column box
    // narrower than that would let a blank overrun its neighbour. Fractions size
    // themselves, so a block containing one keeps intrinsic widths throughout.
    const MISSING_BLANK_PX = BLANK_W + 2 * BLANK_M;
    // Tight drops the alignment floor entirely: the box is exactly as wide as the block's
    // longest operand, so columns still line up but nothing is reserved for air.
    const termBoxPx = Math.max(anyMissingTerm ? MISSING_BLANK_PX : (tight ? 0 : compact ? 24 : 40), widestTermPx + 4);
    return (
        <FragmentableGrid
            cols={gridCols}
            shrinks={!tight}
            gridTemplateColumns={gridCols === 2 ? '1fr 1fr' : '1fr'}
            columnGap={colGap}
            rowGap={block.verticalSpacing || 14}
            justifyItems={colJustify}
            items={block.exercises.map((ex, exIndex) => {
                if (!ex || !ex.operands) return null;

                // MET REST — same unit boxes as a normal row (dividend in the block's term
                // box, ':' + divisor as one left-aligned unit, "=" after a fixed gap), so
                // "21 : 4" and "77 : 10" put their ':', '=' and blanks on the same x.
                // Before this the row was bare spans with 2-4px margins, and every row of a
                // block started its sum at whatever x its own dividend happened to end.
                if (ex.remainder !== undefined) {
                    const slot = (w: number, val: string) => showSolutions
                        ? <span style={{ ...solutionText, padding: 0, width: `${w}px`, display: 'inline-block', textAlign: 'center' }}>{val}</span>
                        : <div style={{ borderBottom: '1.5px solid #000', width: `${w}px`, height: ANSWER_LINE_H, display: 'inline-block' }} />;
                    return (
                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', fontSize: 'calc(var(--sheet-size-math) * 1)', fontFamily: 'Azeret Mono, monospace', height: '24px' }}>
                            {labelCell(exIndex)}
                            {/* The "( ___ )" estimate blank is help, not the exercise: in a quarter-width
                                cell it is the first thing to go, so the division itself still fits.
                                It gets its OWN fixed column so the dividends below it still line up. */}
                            {!tight && (
                                <div style={{ display: 'flex', alignItems: 'center', width: `${HELP_COL_PX}px`, flexShrink: 0, marginRight: `${ANSWER_GAP}px` }}>
                                    <span>(</span>
                                    <div style={{ borderBottom: '1.5px dotted #000', width: `${HELP_BLANK_PX}px`, height: ANSWER_LINE_H, display: 'inline-block', margin: '0 2px' }} />
                                    <span>)</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, ...(termBoxPx !== undefined && { width: `${termBoxPx}px` }) }}>
                                <span>{formatMathNumber(ex.operands[0] as number)}</span>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0,
                                marginLeft: `${TERM_UNIT_GAP}px`,
                                ...(termBoxPx !== undefined && { width: `${OP_GLYPH_PX + OP_TERM_GAP + termBoxPx}px` }),
                            }}>
                                <span style={{ marginRight: `${OP_TERM_GAP}px`, flexShrink: 0 }}>:</span>
                                <span>{formatMathNumber(ex.operands[1] as number)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: `${ANSWER_GAP}px` }}>
                                <span style={{ marginRight: `${EQ_GAP}px` }}>=</span>
                                {slot(QUOTIENT_BLANK_PX, formatMathNumber(ex.answer as number))}
                                <span style={{ margin: `0 ${EQ_GAP}px`, fontStyle: 'italic' }}>r</span>
                                {slot(REST_BLANK_PX, String(ex.remainder))}
                            </div>
                        </div>
                    );
                }

                // NORMAL MATH — operands render generically so 2-4-term chains work.
                const isMissing = (i: number) =>
                    ex.missingIndex !== undefined ? ex.missingIndex === i
                        : (ex.missingTerm === 'operand1' && i === 0) || (ex.missingTerm === 'operand2' && i === 1);
                const anyMissing = ex.operands.some((_, i) => isMissing(i));
                const opGlyph = (gap: number) => printedOp(ex.operators?.[gap] ?? ex.operator ?? '+');

                // Compenseren-preset tussenstap: "= a + ___ − ___" fill-in under the sum
                // (30 − 1 for 29). Only for plain 2-term numeric +/− with the scaffold on.
                const compScaffold = c.preset === 'compenseren'
                    && (c.compenserenScaffold ?? 'tussenstap') === 'tussenstap'
                    && !anyMissing && ex.operands.length === 2
                    && typeof ex.operands[0] === 'number' && typeof ex.operands[1] === 'number';
                let compParts: { tienvoud: number; delta: number } | null = null;
                if (compScaffold) {
                    const b = ex.operands[1] as number;
                    const unit = (100 - (b % 100)) % 100 <= 2 && b > 90 ? 100 : 10;
                    const tienvoud = b + ((unit - (b % unit)) % unit);
                    compParts = { tienvoud, delta: tienvoud - b };
                }
                const compBlank = (v: number) => showSolutions
                    ? <span style={{ ...solutionText, padding: '0 4px' }}>{formatMathNumber(v)}</span>
                    : <div style={styles.mathDottedLine(BLANK_W, BLANK_M)}></div>;

                return (
                    <div key={ex.id} style={{
                        ...styles.exerciseRow,
                        alignItems: layout === 'stepped' ? 'flex-start' : 'flex-end',
                        // The step lines of one exercise sit 32px apart. Without extra room
                        // underneath, the next exercise sits exactly as far away as the next
                        // step line, so the grouping disappears and three steps of one sum
                        // read as three separate sums.
                        ...(layout === 'stepped' ? { paddingBottom: '16px' } : {}),
                    }}>
                        {/* Stepped rows are flex-start, so the label is pinned to line 1's height
                            like the operand box next to it instead of floating to the top. */}
                        {labelPx > 0 && (
                            <div style={{ display: 'flex', flexShrink: 0, alignItems: layout === 'stepped' ? 'flex-end' : 'center', ...(layout === 'stepped' && { height: ANSWER_ROW_H }) }}>
                                {labelCell(exIndex)}
                            </div>
                        )}
                        {/* In stepped mode the row is flex-start so extra lines flow below; pin the
                            operand to the first working-row height (ANSWER_ROW_H) + flex-end so it sits ON line 1's
                            baseline instead of floating above it. */}
                        <div style={{ display: 'flex', flexShrink: 0, alignItems: layout === 'stepped' ? 'flex-end' : 'center', ...(layout === 'stepped' && { height: ANSWER_ROW_H }) }}>
                            {ex.operands.map((operand, i) => {
                                const chars = typeof operand === 'number' ? formatMathNumber(operand).length : 0;
                                // Unit = the sign plus its operand, in a box as wide as the block's widest
                                // operand plus the sign. The first operand is right-aligned in its box (last
                                // digits line up); every later unit is LEFT-aligned, so the sign sits in a
                                // fixed column and "=" stays put whatever the operand's width — a
                                // right-aligned unit let the "+" drift with 1- vs 2-digit operands.
                                const unitPx = termBoxPx === undefined ? undefined
                                    : (i === 0 ? termBoxPx : OP_GLYPH_PX + OP_TERM_GAP + termBoxPx);
                                return (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: i === 0 ? 'flex-end' : 'flex-start', flexShrink: 0,
                                        ...(unitPx !== undefined && { width: `${unitPx}px` }),
                                        ...(i > 0 && { marginLeft: `${TERM_UNIT_GAP}px` }),
                                    }}>
                                        {i > 0 && (
                                            <span style={{ marginRight: `${OP_TERM_GAP}px`, flexShrink: 0 }}>
                                                {mixedOptions ? (
                                                    <OperatorSwitch
                                                        blockId={block.id}
                                                        exerciseId={ex.id}
                                                        glyph={opGlyph(i - 1)}
                                                        current={guessVariant(ex, mixedOptions)}
                                                        options={mixedOptions}
                                                    />
                                                ) : opGlyph(i - 1)}
                                            </span>
                                        )}
                                        {renderTerm(operand, isMissing(i), block.id, ex.id, i,
                                            termBoxPx === undefined ? undefined : (i === 0 ? termBoxPx : termPx(chars)))}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ ...((tight || layout !== 'inline-short') && { flex: 1, minWidth: 0 }), display: 'flex', flexDirection: 'column', marginLeft: `${ANSWER_GAP}px`, gap: `${(block.verticalSpacing || 14) * 0.8}px` }}>
                            {compParts && (
                                // flex-end like the answer lines: the operand row pins its digits to the
                                // bottom of a working row, so a centred tussenstap floated half a line above it.
                                <div style={{ display: 'flex', alignItems: 'flex-end', height: ANSWER_ROW_H, whiteSpace: 'nowrap' }}>
                                    <span style={{ marginRight: `${EQ_GAP}px` }}>=</span>
                                    <span>{formatMathNumber(ex.operands[0] as number)}</span>
                                    <span style={{ margin: '0 6px' }}>{ex.operator === '-' ? '−' : '+'}</span>
                                    {compBlank(compParts.tienvoud)}
                                    <span style={{ margin: '0 6px' }}>{ex.operator === '-' ? '+' : '−'}</span>
                                    {compBlank(compParts.delta)}
                                </div>
                            )}
                            {!anyMissing ? (
                                Array.from({ length: layout === 'stepped' ? (block.steppedLines || 1) : 1 }).map((_, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: ANSWER_ROW_H }}>
                                        <span style={{ marginRight: `${EQ_GAP}px` }}>=</span>
                                        {(i === 0 && showSolutions) ? renderAnswer(ex.answer) : <div style={styles.workLine(layout, answerLinePx, tight)}></div>}
                                    </div>
                                ))
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px' }}>
                                    <span style={{ marginRight: `${EQ_GAP}px` }}>=</span>
                                    {renderGiven(ex.answer)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        />
    );
}
