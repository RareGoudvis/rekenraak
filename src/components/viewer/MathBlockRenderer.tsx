import { useWorksheetStore } from '../../store/useWorksheetStore';
import { isFraction } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import type { MathBlock, Fraction } from '../../services/math/types';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const styles = {
    solutionText: { color: '#e11d48', fontWeight: 'bold', padding: '0 4px', fontSize: '18px' } as React.CSSProperties,
    mathDottedLine: { borderBottom: '1.5px solid #000', width: '40px', margin: '0 6px', display: 'inline-block', height: '16px' } as React.CSSProperties,
    mathInput: { width: '70px', textAlign: 'center', fontSize: '17px', fontFamily: 'Azeret Mono, monospace', border: '1px solid transparent', background: 'transparent', outline: 'none', color: '#000', padding: 0 } as React.CSSProperties,
    fractionWrapper: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '0 4px', fontSize: '15px' } as React.CSSProperties,
    fractionTop: { borderBottom: '1.5px solid #000', padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    fractionBottom: { padding: '0 4px', minWidth: '24px', textAlign: 'center' } as React.CSSProperties,
    wholeNumberStyle: { fontSize: '18px', marginRight: '4px', fontWeight: 'bold', color: '#000' } as React.CSSProperties,
    exerciseRow: { display: 'flex', alignItems: 'flex-end', fontSize: '17px', fontFamily: 'Azeret Mono, monospace' } as React.CSSProperties,
    workLine: (layout: string | undefined): React.CSSProperties => ({ borderBottom: '1.5px solid #000', minWidth: '55px', width: layout === 'inline-long' ? '100%' : (layout === 'stepped' ? '100%' : '75px') }),
    emptyStateText: { padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' } as React.CSSProperties,
};

function FractionDisplay({ val, color }: { val: Fraction; color?: string }) {
    const hasWhole = val.whole !== undefined && val.whole > 0;
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', ...(color ? { color, fontWeight: 'bold' } : {}) }}>
            {hasWhole && <span style={{ ...styles.wholeNumberStyle, ...(color ? { color } : {}) }}>{val.whole}</span>}
            <div style={styles.fractionWrapper}>
                <span style={{ ...styles.fractionTop, ...(color ? { borderBottomColor: color } : {}) }}>{val.n}</span>
                <span style={styles.fractionBottom}>{val.d}</span>
            </div>
        </div>
    );
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
                            const newOps = opIdx === 0 ? [nVal, currentEx.operands[1]] : [currentEx.operands[0], nVal];
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

    return (
        <div style={{ display: 'grid', gridTemplateColumns: block.layoutPreset === 'inline-short' ? '1fr 1fr' : '1fr', justifyItems: block.layoutPreset === 'inline-short' ? 'center' : 'stretch', columnGap: '50px', rowGap: `${block.verticalSpacing || 14}px` }}>
            {block.exercises.map((ex) => {
                if (!ex || !ex.operands) return null;

                // MET REST
                if (ex.remainder !== undefined) {
                    const helpBlank = <div style={{ borderBottom: '1.5px dotted #000', width: '40px', height: '18px', display: 'inline-block', margin: '0 2px' }} />;
                    const qPart = showSolutions
                        ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{formatMathNumber(ex.answer as number)}</span>
                        : <div style={{ borderBottom: '1.5px solid #000', width: '40px', height: '18px', display: 'inline-block' }} />;
                    const rPart = showSolutions
                        ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{String(ex.remainder)}</span>
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

                // NORMAL MATH
                const isMissing1 = ex.missingTerm === 'operand1';
                const isMissing2 = ex.missingTerm === 'operand2';

                return (
                    <div key={ex.id} style={{ ...styles.exerciseRow, alignItems: block.layoutPreset === 'stepped' ? 'flex-start' : 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ width: '85px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                                {renderTerm(ex.operands[0], isMissing1, block.id, ex.id, 0)}
                            </div>
                            <span style={{ width: '26px', textAlign: 'center', flexShrink: 0 }}>{ex.operator || '+'}</span>
                            <div style={{ width: '85px', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                                {renderTerm(ex.operands[1], isMissing2, block.id, ex.id, 1)}
                            </div>
                        </div>

                        <div style={{ ...(block.layoutPreset !== 'inline-short' && { flex: 1 }), display: 'flex', flexDirection: 'column', marginLeft: '8px', gap: `${(block.verticalSpacing || 14) * 0.8}px` }}>
                            {(!isMissing1 && !isMissing2) ? (
                                Array.from({ length: block.layoutPreset === 'stepped' ? (block.steppedLines || 1) : 1 }).map((_, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-end', width: '100%', height: '32px' }}>
                                        <span style={{ marginRight: '10px' }}>=</span>
                                        {(i === 0 && showSolutions) ? renderAnswer(ex.answer) : <div style={styles.workLine(block.layoutPreset)}></div>}
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
        </div>
    );
}
