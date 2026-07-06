import type { MathBlock, VerbandExercise, VerbandRep } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import { fractionToDecimal, fractionToPercent } from '../../services/verbanden/verbandenGenerator';
import VerticalFraction from './VerticalFraction';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';
const REP_LABEL: Record<VerbandRep, string> = { breuk: 'breuk', decimaal: 'kommagetal', procent: 'procent' };

export default function VerbandenViewer({ block, showSolutions }: Props) {
    const exercises: VerbandExercise[] = block.verbandExercises || [];
    const subType: string = block.constraints.subType ?? 'tabel';
    const reps: VerbandRep[] = block.constraints.reps ?? ['breuk', 'decimaal', 'procent'];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const renderRep = (ex: VerbandExercise, rep: VerbandRep, solution: boolean) => {
        const color = solution ? SOL : undefined;
        if (rep === 'breuk') return <VerticalFraction value={ex.fraction} color={color} fontSize={13} mono />;
        if (rep === 'decimaal') return <span style={{ color }}>{formatMathNumber(fractionToDecimal(ex.fraction))}</span>;
        return <span style={{ color }}>{formatMathNumber(fractionToPercent(ex.fraction))} %</span>;
    };

    // ── PAREN: "3/4 = ___ %" aligned lines ─────────────────────────────────────
    if (subType === 'paren') {
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap}
                items={exercises.map(ex => {
                    const target = ex.target ?? reps.find(r => r !== ex.given) ?? 'decimaal';
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: mono, fontSize: '15px' }}>
                            <span style={{ minWidth: '64px', display: 'inline-flex', justifyContent: 'flex-end' }}>{renderRep(ex, ex.given, false)}</span>
                            <span>=</span>
                            {showSolutions
                                ? renderRep(ex, target, true)
                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: '15px', display: 'inline-block' }} />}
                            {!showSolutions && <span style={{ fontSize: '11px', color: '#555' }}>({REP_LABEL[target]})</span>}
                        </div>
                    );
                })}
            />
        );
    }

    // ── TABEL: rooster breuk | kommagetal | procent, one cell given per row ────
    const cell: React.CSSProperties = {
        border: '1px solid #000', minHeight: '38px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: '14px', boxSizing: 'border-box', padding: '2px 6px',
    };
    return (
        <div className="print-exercise" style={{ width: 'fit-content' }}>
            <div style={{ display: 'grid', gridTemplateColumns: reps.map(() => '110px').join(' ') }}>
                {reps.map(rep => <div key={rep} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: '12px' }}>{REP_LABEL[rep]}</div>)}
            </div>
            {exercises.map(ex => (
                <div key={ex.id} style={{ display: 'grid', gridTemplateColumns: reps.map(() => '110px').join(' ') }}>
                    {reps.map(rep => (
                        <div key={rep} style={cell}>
                            {rep === ex.given ? renderRep(ex, rep, false) : showSolutions ? renderRep(ex, rep, true) : ''}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
