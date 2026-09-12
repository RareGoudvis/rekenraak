import { useWorksheetStore } from '../../store/useWorksheetStore';
import { isFraction } from '../../services/math/types';
import { formatMathNumber, opGlyph as printedOp } from '../../services/math/formatters';
import type { MathBlock, Fraction } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';
import { FULL_BLOCK_WIDTH_PX, useBlockWidth } from './BlockWidthContext';
import type { MulDivConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';

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
    mathDottedLine: (w = 40, m = 6): React.CSSProperties => ({ borderBottom: '1.5px solid #000', width: `${w}px`, margin: `0 ${m}px`, display: 'inline-block', height: '16px' }),
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
};

function FractionDisplay({ val, color }: { val: Fraction; color?: string }) {
    return <VerticalFraction value={val} color={color} fontSize={15} />;
}

export default function MathBlockRenderer({ block, showSolutions }: Props) {
    const A4_CONTENT_PX = useBlockWidth();
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

    // Adaptive sizing: the classic fixed 85px operand column fits 8 mono chars, so
    // "1 000 000" (9 chars) clipped its last digit. Widen the column to the block's
    // longest formatted operand, and drop the 2-up grid to 1-up when two widened rows
    // no longer fit the printable width (A4 content ≈ 625px).
    const CHAR_PX = 11.1; // Azeret Mono 17px advance (measured 11.06px/char in Chrome)
    let maxChars = 0;
    let maxAnswerChars = 0;
    let maxTerms = 2;
    let anyRemainder = false;
    let anyMissingTerm = false;
    let anyFractionTerm = false;
    for (const ex of block.exercises) {
        if (!ex?.operands) continue;
        maxTerms = Math.max(maxTerms, ex.operands.length);
        if (ex.remainder !== undefined) anyRemainder = true;
        for (const o of ex.operands) {
            if (typeof o === 'number') maxChars = Math.max(maxChars, formatMathNumber(o).length);
            else if (isFraction(o)) anyFractionTerm = true;
        }
        // With a missing operand the (red) solution renders inside the operand cell too.
        const hasMissing = ex.missingIndex !== undefined || ex.missingTerm === 'operand1' || ex.missingTerm === 'operand2';
        if (hasMissing) anyMissingTerm = true;
        if (hasMissing && typeof ex.answer === 'number') maxChars = Math.max(maxChars, formatMathNumber(ex.answer).length);
        if (typeof ex.answer === 'number') maxAnswerChars = Math.max(maxAnswerChars, formatMathNumber(ex.answer).length);
    }
    // The answer blank used to be a flat 75px whatever the answer was, so a block of
    // units and a block of thousands got the same line. It now follows the block's
    // WIDEST answer — one width for the whole block, never per exercise: a blank sized
    // to its own answer would tell the child how many digits to expect.
    // In a tight cell the same blank is sized to the answer alone: 50px is still three
    // handwritten digits, and every px above that comes straight out of the operands.
    const answerLinePx = tight
        ? Math.max(50, Math.ceil(maxAnswerChars * CHAR_PX) + 12)
        : Math.max(75, Math.ceil(maxAnswerChars * CHAR_PX) + 24);
    const cellPx = Math.max(85, Math.ceil(maxChars * CHAR_PX) + 6);
    // One row ≈ operand cells + operator gaps + "=" + answer workline (+ met-rest extras).
    // The compenseren tussenstap line ("= a + ___ − ___") is much wider than the workline.
    const compScaffoldOn = c.preset === 'compenseren'
        && (c.compenserenScaffold ?? 'tussenstap') === 'tussenstap';
    const answerW = compScaffoldOn ? 175 + Math.ceil(maxChars * CHAR_PX) : answerLinePx + 19;
    const rowEstimate = maxTerms * cellPx + (maxTerms - 1) * (maxTerms > 2 ? 20 : 26)
        + 8 + answerW + (anyRemainder ? 90 : 0);
    // A stepped row is sized differently: the answer column is flex:1 with a 100%-wide
    // workline, so what it really needs is writing room for a hand-written tussenstap.
    // That room scales with the block's widest operand instead of the fixed 94px field.
    const worklineMinPx = Math.max(80, Math.ceil(maxChars * CHAR_PX) + 30);
    // In the 2-up stepped grid the operand columns tighten — no 85px alignment floor and a
    // narrower operator gap — so the freed width goes to the work line instead. The wide
    // sizing stays everywhere else, where column alignment matters more than writing room.
    const compactCellPx = Math.max(46, Math.ceil(maxChars * CHAR_PX) + 6);
    // 26, not 16: both operand cells are right-aligned, so a full-width number butts
    // straight against the operator unless the span carries its own padding either side.
    const COMPACT_OP_GAP = 26;
    const steppedRowMin = maxTerms * compactCellPx + (maxTerms - 1) * COMPACT_OP_GAP
        + 8 + 10 /* "=" glyph + its right margin */ + worklineMinPx;
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
    // An operator belongs to the operand AFTER it. `[operator][OP_TERM_GAP][operand]` is
    // therefore laid out as ONE right-aligned unit: the air after the sign is a constant
    // (so "+ 51" and "+315" read identically), the air before it is a constant too, and the
    // operand's last digit still lands on the block's column edge because the unit -- not
    // the operand -- carries the fixed width. Before this the operand sat in a fixed
    // right-aligned cell, so all of its slack fell between the sign and the digits.
    const OP_GLYPH_PX = tight ? 12 : 13;  // one Azeret Mono glyph at 17px (11.06), rounded up
    const OP_TERM_GAP = tight ? 6 : 8;   // sign -> its operand
    const TERM_UNIT_GAP = tight ? 6 : 12; // operand -> the sign of the next one
    // Air around the "=" and between the sum and its answer column. Halved when tight:
    // 4 gaps x 4px is what buys `532 + 342 = ____` its place inside a 163px quarter.
    const EQ_GAP = tight ? 6 : 10;
    const ANSWER_GAP = tight ? 4 : 8;
    const termPx = (chars: number) => Math.ceil(chars * CHAR_PX) + 4;
    // The fill-in blank (mathDottedLine) is 40px wide inside 6px margins; a column box
    // narrower than that would let a blank overrun its neighbour. Fractions size
    // themselves, so a block containing one keeps intrinsic widths throughout.
    const MISSING_BLANK_PX = BLANK_W + 2 * BLANK_M;
    // Tight drops the alignment floor entirely: the box is exactly as wide as the block's
    // longest operand, so columns still line up but nothing is reserved for air.
    const termBoxPx = anyFractionTerm ? undefined
        : Math.max(anyMissingTerm ? MISSING_BLANK_PX : (tight ? 0 : compact ? 24 : 40), termPx(maxChars));
    return (
        <FragmentableGrid
            cols={gridCols}
            gridTemplateColumns={gridCols === 2 ? '1fr 1fr' : '1fr'}
            columnGap={colGap}
            rowGap={block.verticalSpacing || 14}
            justifyItems={colJustify}
            items={block.exercises.map((ex) => {
                if (!ex || !ex.operands) return null;

                // MET REST
                if (ex.remainder !== undefined) {
                    const helpBlank = <div style={{ borderBottom: '1.5px dotted #000', width: '40px', height: '18px', display: 'inline-block', margin: '0 2px' }} />;
                    const qPart = showSolutions
                        ? <span style={solutionText}>{formatMathNumber(ex.answer as number)}</span>
                        : <div style={{ borderBottom: '1.5px solid #000', width: '40px', height: '18px', display: 'inline-block' }} />;
                    const rPart = showSolutions
                        ? <span style={solutionText}>{String(ex.remainder)}</span>
                        : <div style={{ borderBottom: '1.5px solid #000', width: '30px', height: '18px', display: 'inline-block' }} />;
                    return (
                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: 'calc(var(--sheet-size-math) * 1)', fontFamily: 'Azeret Mono, monospace', height: '24px' }}>
                            {/* The "( ___ )" estimate blank is help, not the exercise: in a quarter-width
                                cell it is the first thing to go, so the division itself still fits. */}
                            {!tight && <><span>(</span>{helpBlank}<span>)</span></>}
                            <span style={{ margin: `0 ${tight ? 2 : 4}px` }}>{formatMathNumber(ex.operands[0] as number)}</span>
                            <span>:</span>
                            <span style={{ margin: `0 ${tight ? 2 : 4}px` }}>{formatMathNumber(ex.operands[1] as number)}</span>
                            <span style={{ margin: `0 ${tight ? 2 : 4}px` }}>=</span>
                            {qPart}
                            <span style={{ margin: `0 ${tight ? 2 : 4}px`, fontStyle: 'italic' }}>r</span>
                            {rPart}
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
                        {/* In stepped mode the row is flex-start so extra lines flow below; pin the
                            operand to the first 32px line height + flex-end so it sits ON line 1's
                            baseline instead of floating above it. */}
                        <div style={{ display: 'flex', flexShrink: 0, alignItems: layout === 'stepped' ? 'flex-end' : 'center', ...(layout === 'stepped' && { height: '32px' }) }}>
                            {ex.operands.map((operand, i) => {
                                const chars = typeof operand === 'number' ? formatMathNumber(operand).length : 0;
                                // Unit = the sign plus its operand. The first operand has no sign, so it
                                // is a plain column box. Every unit is right-aligned, which is what keeps
                                // 73 under the 14 of 114 instead of against the operator.
                                const unitPx = termBoxPx === undefined ? undefined
                                    : (i === 0 ? termBoxPx : OP_GLYPH_PX + OP_TERM_GAP + termBoxPx);
                                return (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0,
                                        ...(unitPx !== undefined && { width: `${unitPx}px` }),
                                        ...(i > 0 && { marginLeft: `${TERM_UNIT_GAP}px` }),
                                    }}>
                                        {i > 0 && <span style={{ marginRight: `${OP_TERM_GAP}px`, flexShrink: 0 }}>{opGlyph(i - 1)}</span>}
                                        {renderTerm(operand, isMissing(i), block.id, ex.id, i,
                                            termBoxPx === undefined ? undefined : (i === 0 ? termBoxPx : termPx(chars)))}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ ...((tight || layout !== 'inline-short') && { flex: 1, minWidth: 0 }), display: 'flex', flexDirection: 'column', marginLeft: `${ANSWER_GAP}px`, gap: `${(block.verticalSpacing || 14) * 0.8}px` }}>
                            {compParts && (
                                <div style={{ display: 'flex', alignItems: 'center', height: '32px', whiteSpace: 'nowrap' }}>
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
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '32px' }}>
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
