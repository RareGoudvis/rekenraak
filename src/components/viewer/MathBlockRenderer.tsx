import { useEffect, useRef, useState } from 'react';
import { useWorksheetStore } from '../../store/useWorksheetStore';
import { isFraction } from '../../services/math/types';
import type { Equation } from '../../services/math/types';
import { formatMathNumber, opGlyph as printedOp } from '../../services/math/formatters';
import type { MathBlock, Fraction } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';
import { useBlockWidth, useShowScaffold, useSheetSizePx, ANSWER_LINE_H, ANSWER_ROW_H } from './BlockWidthContext';
import type { MulDivConstraints, MixedConstraints, MixedVariantId } from '../../services/math/constraintTypes';
import { MIXED_VARIANTS } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { sharedPluginStyles as S } from '../configurator/plugins/sharedPluginStyles';
import { itemLabel, itemLabelChars } from './itemNumbering';
import { hrRowLayout, hrRowStats, HR_SOLUTION_FONT } from '../../services/layout/hrRowLayout';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Sheet font sizes below are factors of --sheet-size-math (digits/mono) so the Blad-tab
// sliders rescale every rendered number; screen-only chrome (emptyStateText) is exempt.
const styles = {
    solutionText: { ...solutionText, padding: '0 4px' } as React.CSSProperties,
    // The fill-in blank shrinks with the cell: 40px inside 6px margins at full width, a
    // narrower line in a quarter-width block where those 52px are a third of the row.
    mathDottedLine: (w = 40, m = 6): React.CSSProperties => ({ borderBottom: '1.5px solid #000', width: `${w}px`, margin: `0 ${m}px`, display: 'inline-block', height: ANSWER_LINE_H }),
    mathInput: { width: '70px', textAlign: 'center', fontFamily: 'Azeret Mono, monospace', border: '1px solid transparent', background: 'transparent', outline: 'none', color: '#000', padding: 0 } as React.CSSProperties,
    fractionWrapper: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', fontSize: 'calc(var(--sheet-size-math) * 0.87)' } as React.CSSProperties,
    fractionTop: { borderBottom: '1.5px solid #000', padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    fractionBottom: { padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    wholeNumberStyle: { fontSize: 'calc(var(--sheet-size-math) * 1.04)', marginRight: '4px', color: '#000' } as React.CSSProperties,
    exerciseRow: { display: 'flex', alignItems: 'flex-end', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
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
    const blockPx = useBlockWidth();
    const scaffold = useShowScaffold();
    // The math token in px, so the column widths follow the Lettergrootte slider.
    const sheetPx = useSheetSizePx('math');
    const updateExercise = useWorksheetStore((state) => state.updateExercise);

    if (!block.exercises || block.exercises.length === 0) {
        return <div className="no-print" style={styles.emptyStateText}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // Puntoefeningen (a + . = c) are by definition single short lines — force inline-short
    // regardless of the stored preset (the Kort/Lang/Stappen control is hidden for them).
    const c = block.constraints as MulDivConstraints;
    const isPunt = c.equationType === 'puntoefening';
    const layout = isPunt ? 'inline-short' : block.layoutPreset;

    // 'Gemengd' (mixed-operator) block: NOT a typeId check — any family whose constraints
    // carry a `variants` array gets the per-exercise operator switch (only hr-std-gemengd
    // does today, but a future family that reuses this shape gets it for free).
    const mixedC = block.constraints as MixedConstraints;
    const mixedOptions = Array.isArray(mixedC.variants)
        ? MIXED_VARIANTS.filter(v => mixedC.variants.includes(v.id))
        : null;

    const compScaffoldOn = scaffold && c.preset === 'compenseren'
        && (c.compenserenScaffold ?? 'tussenstap') === 'tussenstap';
    const {
        tight, fontScale, wrapChain, labelPx, labelColPx, termBoxPx, answerLinePx,
        gridCols, colGap, colJustify, blankW: BLANK_W, blankM: BLANK_M,
        opGlyphPx: OP_GLYPH_PX, opTermGap: OP_TERM_GAP, termUnitGap: TERM_UNIT_GAP, eqGap: EQ_GAP, answerGap: ANSWER_GAP, charPx,
    } = hrRowLayout({
        ...hrRowStats(block.exercises, sheetPx),
        widthPx: blockPx, mathPx: sheetPx, layout, compScaffoldOn,
        labelChars: itemLabelChars(block.itemNumbering, block.exercises.length),
    });
    // A style at `factor` × the math token, scaled by the fit ladder's font step.
    const atFont = (style: React.CSSProperties, factor: number): React.CSSProperties =>
        ({ ...style, fontSize: `calc(var(--sheet-size-math) * ${Math.round(factor * fontScale * 1000) / 1000})` });
    const termPx = (chars: number) => Math.ceil(chars * charPx) + 4;

    const renderTerm = (val: number | Fraction | undefined, isMissing: boolean, blockId: string, exId: string, opIdx: number, widthPx?: number) => {
        if (val === undefined) return null;

        if (isMissing) {
            if (showSolutions) {
                if (isFraction(val)) return <span style={atFont(styles.solutionText, HR_SOLUTION_FONT)}><FractionDisplay val={val} /></span>;
                return <span style={atFont(styles.solutionText, HR_SOLUTION_FONT)}>{formatMathNumber(val)}</span>;
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
                        // Read at edit time: a `blocks` subscription re-rendered every hoofdrekenen viewer on any block's edit.
                        const currentEx = useWorksheetStore.getState().blocks.find(b => b.id === blockId)?.exercises.find(ex => ex.id === exId);
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
                style={{ ...atFont(styles.mathInput, 1), textAlign: 'right', width: widthPx === undefined ? undefined : `${widthPx}px` }}
            />
        );
    };

    const renderGiven = (val: number | Fraction | undefined) => {
        if (val === undefined) return null;
        if (isFraction(val)) return <FractionDisplay val={val} />;
        return <span style={atFont({ fontFamily: 'Azeret Mono, monospace', color: '#000' }, 1)}>{formatMathNumber(val as number)}</span>;
    };

    const renderAnswer = (val: number | Fraction | undefined) => {
        if (val === undefined) return null;
        if (isFraction(val)) return <FractionDisplay val={val} color={SOL} />;
        return <span style={atFont(styles.solutionText, HR_SOLUTION_FONT)}>{formatMathNumber(val)}</span>;
    };

    // Met-rest extras. The quotient and rest blanks are one width for the whole block (a
    // blank sized to its own answer would tell the child how many digits to expect), and
    // the help column is the "(" + dotted blank + ")" measured as a box so it can be a
    // fixed column rather than inline content that shifts the sum.
    const HELP_BLANK_PX = 40;
    const QUOTIENT_BLANK_PX = 40;
    const REST_BLANK_PX = 30;
    const HELP_COL_PX = 2 * OP_GLYPH_PX + HELP_BLANK_PX + 4;
    const labelCell = (i: number) => {
        const text = itemLabel(block.itemNumbering, i);
        if (!text) return null;
        return <span style={{ width: `${labelPx}px`, flexShrink: 0, textAlign: 'right', marginRight: `${OP_TERM_GAP}px`, whiteSpace: 'nowrap' }}>{text}</span>;
    };
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
                            {!tight && scaffold && (
                                <div style={{ display: 'flex', alignItems: 'center', width: `${HELP_COL_PX}px`, flexShrink: 0, marginRight: `${ANSWER_GAP}px` }}>
                                    <span>(</span>
                                    <div style={{ borderBottom: '1.5px dotted #000', width: `${HELP_BLANK_PX}px`, height: ANSWER_LINE_H, display: 'inline-block', margin: '0 2px' }} />
                                    <span>)</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, width: `${termBoxPx}px` }}>
                                <span>{formatMathNumber(ex.operands[0] as number)}</span>
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexShrink: 0,
                                marginLeft: `${TERM_UNIT_GAP}px`,
                                width: `${OP_GLYPH_PX + OP_TERM_GAP + termBoxPx}px`,
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
                const compScaffold = compScaffoldOn
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

                // Unit = the sign plus its operand, in a box as wide as the block's widest
                // operand plus the sign. The first operand is right-aligned in its box (last
                // digits line up); every later unit is LEFT-aligned, so the sign sits in a
                // fixed column and "=" stays put whatever the operand's width — a
                // right-aligned unit let the "+" drift with 1- vs 2-digit operands.
                const unitAt = (operand: number | Fraction, i: number) => {
                    const chars = typeof operand === 'number' ? formatMathNumber(operand).length : 0;
                    const unitPx = i === 0 ? termBoxPx : OP_GLYPH_PX + OP_TERM_GAP + termBoxPx;
                    return (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: i === 0 ? 'flex-end' : 'flex-start', flexShrink: 0,
                            width: `${unitPx}px`,
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
                                i === 0 ? termBoxPx : termPx(chars))}
                        </div>
                    );
                };
                // In stepped mode the row is flex-start so extra lines flow below; pin the
                // operand to the first working-row height (ANSWER_ROW_H) + flex-end so it sits ON line 1's
                // baseline instead of floating above it.
                const operandBox = (units: React.ReactNode) => (
                    <div style={{ display: 'flex', flexShrink: 0, alignItems: layout === 'stepped' ? 'flex-end' : 'center', ...(layout === 'stepped' && { height: ANSWER_ROW_H }) }}>
                        {units}
                    </div>
                );
                // Stepped rows are flex-start, so the label is pinned to line 1's height
                // like the operand box next to it instead of floating to the top.
                const labelBox = labelPx > 0 && (
                    <div style={{ display: 'flex', flexShrink: 0, alignItems: layout === 'stepped' ? 'flex-end' : 'center', ...(layout === 'stepped' && { height: ANSWER_ROW_H }) }}>
                        {labelCell(exIndex)}
                    </div>
                );
                // A wrapped chain puts all but its last term on a line of their own; the last
                // unit then sits under the second one, so the signs keep their column.
                const lastI = ex.operands.length - 1;
                const wrapHere = wrapChain && lastI >= 2;
                const row = (
                    <div key={ex.id} style={{
                        ...atFont(styles.exerciseRow, 1),
                        alignItems: layout === 'stepped' ? 'flex-start' : 'flex-end',
                        // The step lines of one exercise sit 32px apart. Without extra room
                        // underneath, the next exercise sits exactly as far away as the next
                        // step line, so the grouping disappears and three steps of one sum
                        // read as three separate sums.
                        ...(layout === 'stepped' ? { paddingBottom: '16px' } : {}),
                    }}>
                        {wrapHere ? labelColPx > 0 && <div style={{ width: `${labelColPx}px`, flexShrink: 0 }} /> : labelBox}
                        {operandBox(wrapHere
                            ? [<div key="lead" style={{ width: `${termBoxPx}px`, flexShrink: 0 }} />, unitAt(ex.operands[lastI], lastI)]
                            : ex.operands.map(unitAt))}

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
                if (!wrapHere) return row;
                return (
                    <div key={ex.id} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ ...atFont(styles.exerciseRow, 1), alignItems: 'flex-end' }}>
                            {labelBox}
                            {operandBox(ex.operands.slice(0, lastI).map(unitAt))}
                        </div>
                        {row}
                    </div>
                );
            })}
        />
    );
}
