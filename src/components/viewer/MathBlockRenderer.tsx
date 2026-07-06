import { useWorksheetStore } from '../../store/useWorksheetStore';
import { isFraction } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import type { MathBlock, Fraction } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const styles = {
    solutionText: { color: '#e11d48', padding: '0 4px', fontSize: '18px' } as React.CSSProperties,
    mathDottedLine: { borderBottom: '1.5px solid #000', width: '40px', margin: '0 6px', display: 'inline-block', height: '16px' } as React.CSSProperties,
    mathInput: { width: '70px', textAlign: 'center', fontSize: '17px', fontFamily: 'Azeret Mono, monospace', border: '1px solid transparent', background: 'transparent', outline: 'none', color: '#000', padding: 0 } as React.CSSProperties,
    fractionWrapper: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', fontSize: '15px' } as React.CSSProperties,
    fractionTop: { borderBottom: '1.5px solid #000', padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    fractionBottom: { padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    wholeNumberStyle: { fontSize: '18px', marginRight: '4px', color: '#000' } as React.CSSProperties,
    exerciseRow: { display: 'flex', alignItems: 'flex-end', fontSize: '17px', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
    workLine: (layout: string | undefined): React.CSSProperties => ({ borderBottom: '1.5px solid #000', minWidth: '55px', width: layout === 'inline-long' ? '100%' : (layout === 'stepped' ? '100%' : '75px') }),
    emptyStateText: { padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' } as React.CSSProperties,
};

function FractionDisplay({ val, color }: { val: Fraction; color?: string }) {
    return <VerticalFraction value={val} color={color} fontSize={15} />;
}

export default function MathBlockRenderer({ block, showSolutions }: Props) {
    const blocks = useWorksheetStore((state) => state.blocks);
    const updateExercise = useWorksheetStore((state) => state.updateExercise);

    const renderTerm = (val: number | Fraction | undefined, isMissing: boolean, blockId: string, exId: string, opIdx: number) => {
        if (val === undefined) return null;

        if (isMissing) {
            if (showSolutions) {
                if (isFraction(val)) return <span style={styles.solutionText}><FractionDisplay val={val} /></span>;
                return <span style={styles.solutionText}>{formatMathNumber(val)}</span>;
            }
            return <div style={styles.mathDottedLine}></div>;
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
                style={styles.mathInput}
            />
        );
    };

    const renderGiven = (val: number | Fraction | undefined) => {
        if (val === undefined) return null;
        if (isFraction(val)) return <FractionDisplay val={val} />;
        return <span style={{ fontFamily: 'Azeret Mono, monospace', fontSize: '17px', color: '#000' }}>{formatMathNumber(val as number)}</span>;
    };

    const renderAnswer = (val: number | Fraction | undefined) => {
        if (val === undefined) return null;
        if (isFraction(val)) return <FractionDisplay val={val} color="#e11d48" />;
        return <span style={styles.solutionText}>{formatMathNumber(val)}</span>;
    };

    if (!block.exercises || block.exercises.length === 0) {
        return <div className="no-print" style={styles.emptyStateText}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    // Puntoefeningen (a + . = c) are by definition single short lines — force inline-short
    // regardless of the stored preset (the Kort/Lang/Stappen control is hidden for them).
    const isPunt = block.constraints?.equationType === 'puntoefening';
    const layout = isPunt ? 'inline-short' : block.layoutPreset;
    const isInlineShort = layout === 'inline-short';
    return (
        <FragmentableGrid
            cols={isInlineShort ? 2 : 1}
            gridTemplateColumns={isInlineShort ? '1fr 1fr' : '1fr'}
            columnGap={50}
            rowGap={block.verticalSpacing || 14}
            justifyItems={isInlineShort ? 'center' : 'stretch'}
            items={block.exercises.map((ex) => {
                if (!ex || !ex.operands) return null;

                // MET REST
                if (ex.remainder !== undefined) {
                    const helpBlank = <div style={{ borderBottom: '1.5px dotted #000', width: '40px', height: '18px', display: 'inline-block', margin: '0 2px' }} />;
                    const qPart = showSolutions
                        ? <span style={{ color: '#e11d48', fontWeight: 'normal' }}>{formatMathNumber(ex.answer as number)}</span>
                        : <div style={{ borderBottom: '1.5px solid #000', width: '40px', height: '18px', display: 'inline-block' }} />;
                    const rPart = showSolutions
                        ? <span style={{ color: '#e11d48', fontWeight: 'normal' }}>{String(ex.remainder)}</span>
                        : <div style={{ borderBottom: '1.5px solid #000', width: '30px', height: '18px', display: 'inline-block' }} />;
                    return (
                        <div key={ex.id} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '17px', fontFamily: 'Azeret Mono, monospace', height: '24px' }}>
                            <span>(</span>{helpBlank}<span>)</span>
                            <span style={{ margin: '0 4px' }}>{formatMathNumber(ex.operands[0] as number)}</span>
                            <span>:</span>
                            <span style={{ margin: '0 4px' }}>{formatMathNumber(ex.operands[1] as number)}</span>
                            <span style={{ margin: '0 4px' }}>=</span>
                            {qPart}
                            <span style={{ margin: '0 4px', fontStyle: 'italic' }}>r</span>
                            {rPart}
                        </div>
                    );
                }

                // NORMAL MATH — operands render generically so 2-4-term chains work.
                const isMissing = (i: number) =>
                    ex.missingIndex !== undefined ? ex.missingIndex === i
                        : (ex.missingTerm === 'operand1' && i === 0) || (ex.missingTerm === 'operand2' && i === 1);
                const anyMissing = ex.operands.some((_, i) => isMissing(i));
                const opGlyph = (gap: number) => ex.operators?.[gap] ?? ex.operator ?? '+';
                const multi = ex.operands.length > 2;
                // 2-term keeps the classic fixed 85px columns (aligned worksheets);
                // longer chains use compact auto-width cells so 4 terms still fit a line.
                const cellW = multi ? undefined : '85px';

                // Compenseren-preset tussenstap: "= a + ___ − ___" fill-in under the sum
                // (30 − 1 for 29). Only for plain 2-term numeric +/− with the scaffold on.
                const compScaffold = block.constraints?.preset === 'compenseren'
                    && (block.constraints?.compenserenScaffold ?? 'tussenstap') === 'tussenstap'
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
                    ? <span style={{ color: '#e11d48', padding: '0 4px' }}>{formatMathNumber(v)}</span>
                    : <div style={styles.mathDottedLine}></div>;

                return (
                    <div key={ex.id} style={{ ...styles.exerciseRow, alignItems: layout === 'stepped' ? 'flex-start' : 'flex-end' }}>
                        {/* In stepped mode the row is flex-start so extra lines flow below; pin the
                            operand to the first 32px line height + flex-end so it sits ON line 1's
                            baseline instead of floating above it. */}
                        <div style={{ display: 'flex', alignItems: layout === 'stepped' ? 'flex-end' : 'center', ...(layout === 'stepped' && { height: '32px' }) }}>
                            {ex.operands.map((operand, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                                    {i > 0 && <span style={{ width: multi ? '20px' : '26px', textAlign: 'center', flexShrink: 0 }}>{opGlyph(i - 1)}</span>}
                                    <div style={{ width: cellW, display: 'flex', justifyContent: i === 0 ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
                                        {renderTerm(operand, isMissing(i), block.id, ex.id, i)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ ...(layout !== 'inline-short' && { flex: 1 }), display: 'flex', flexDirection: 'column', marginLeft: '8px', gap: `${(block.verticalSpacing || 14) * 0.8}px` }}>
                            {compParts && (
                                <div style={{ display: 'flex', alignItems: 'center', height: '32px', whiteSpace: 'nowrap' }}>
                                    <span style={{ marginRight: '10px' }}>=</span>
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
                                        <span style={{ marginRight: '10px' }}>=</span>
                                        {(i === 0 && showSolutions) ? renderAnswer(ex.answer) : <div style={styles.workLine(layout)}></div>}
                                    </div>
                                ))
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '24px' }}>
                                    <span style={{ marginRight: '10px' }}>=</span>
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
