import type { MathBlock, Fraction } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const fmt = (v: number | Fraction): string => {
    if (typeof v === 'number') return v.toLocaleString('nl-BE');
    return `${v.whole ? v.whole + ' ' : ''}${v.n}/${v.d}`;
};

const mono = "'Azeret Mono', monospace";

export default function OrdenenViewer({ block, showSolutions }: Props) {
    const exercises = block.ordenenExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 6}
            items={exercises.map((ex) => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: mono, fontSize: '17px' }}>
                    {/* shuffled prompt numbers */}
                    <div style={{ fontWeight: 'bold' }}>{ex.display.map(fmt).join(', ')}</div>
                    {/* ordered blanks */}
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                        {ex.values.map((v, i) => (
                            <span key={i} style={{ display: 'inline-flex', alignItems: 'flex-end', gap: '10px' }}>
                                {i > 0 && <span style={{ fontWeight: 'bold' }}>{ex.operator}</span>}
                                {showSolutions
                                    ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{fmt(v)}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', minWidth: '64px', height: '18px', display: 'inline-block' }} />}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        />
    );
}
