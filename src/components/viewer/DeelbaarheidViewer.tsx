import type { MathBlock } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';

export default function DeelbaarheidViewer({ block, showSolutions }: Props) {
    const exercises = block.deelbaarheidExercises || [];
    const layout = block.constraints.layout || 'tabel';
    const divisors: number[] = block.constraints.divisors || [2, 5, 10];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    // ── Veelvouden: a fill-in multiples row per exercise ──────────────────────
    if (layout === 'veelvouden') {
        return (
            <FragmentableGrid
                cols={1}
                rowGap={gap + 4}
                items={exercises.map((ex) => {
                    const seq = ex.sequence || [];
                    const given = ex.givenCount ?? 2;
                    return (
                        <div key={ex.id} className="print-exercise" style={{ fontFamily: mono, fontSize: '16px' }}>
                            <div style={{ marginBottom: '8px' }}>Vul de rij veelvouden van <strong>{ex.base}</strong> aan:</div>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', flexWrap: 'wrap' }}>
                                {seq.map((v, i) => (
                                    <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '6px' }}>
                                        {i > 0 && <span>–</span>}
                                        {i < given
                                            ? <span style={{ fontWeight: 'bold' }}>{v}</span>
                                            : (showSolutions
                                                ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{v}</span>
                                                : <span style={{ borderBottom: '1.5px solid #000', minWidth: '40px', height: '18px', display: 'inline-block' }} />)}
                                    </span>
                                ))}
                                <span>– (enz.)</span>
                            </div>
                        </div>
                    );
                })}
            />
        );
    }

    // ── Tabel: shared header + one tick-row per number ────────────────────────
    const cols = `200px ${divisors.map(() => '64px').join(' ')}`;
    const cell: React.CSSProperties = {
        border: '1px solid #000', height: '34px', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: mono, fontSize: '15px', boxSizing: 'border-box',
    };

    return (
        <div>
            {/* header */}
            <div className="print-row" style={{ display: 'grid', gridTemplateColumns: cols }}>
                <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>deelbaar door:</div>
                {divisors.map(d => (
                    <div key={d} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{d}?</div>
                ))}
            </div>
            {/* rows */}
            {exercises.map((ex) => (
                <div key={ex.id} className="print-row print-exercise" style={{ display: 'grid', gridTemplateColumns: cols }}>
                    <div style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold' }}>{ex.number}</div>
                    {divisors.map(d => (
                        <div key={d} style={{ ...cell, color: '#e11d48', fontWeight: 'bold' }}>
                            {showSolutions ? ((ex.number ?? 0) % d === 0 ? '✓' : '✗') : ''}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
