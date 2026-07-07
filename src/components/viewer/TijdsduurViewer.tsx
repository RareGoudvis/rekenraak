import type { MathBlock, TijdsduurExercise } from '../../services/math/types';
import { formatDigitalTime } from '../../services/clock/clockTypes';
import { formatDuur } from '../../services/tijdsduur/tijdsduurGenerator';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const SALMON = '#f4cbb8';

const cell: React.CSSProperties = {
    border: '1px solid #000', minHeight: '34px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: mono, fontSize: '14px', boxSizing: 'border-box', padding: '2px 10px',
};

export default function TijdsduurViewer({ block, showSolutions }: Props) {
    const exercises: TijdsduurExercise[] = block.tijdsduurExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const clock = (min: number) => formatDigitalTime(Math.floor(min / 60) % 24, min % 60);

    const content = (ex: TijdsduurExercise, col: 'begin' | 'einde' | 'duur') => {
        const value = col === 'begin' ? clock(ex.startMin)
            : col === 'einde' ? clock(ex.endMin)
            : formatDuur(ex.endMin - ex.startMin);
        if (ex.blank !== col) {
            // Passing midnight: mark the end time as next-day so the row stays solvable.
            const nextDay = col === 'einde' && ex.endMin >= 1440 ? ' (volgende dag)' : '';
            return <span>{value}{nextDay}</span>;
        }
        return showSolutions ? <span style={{ color: SOL }}>{value}</span> : '';
    };

    // Fill the page (was 400px = 64%); the wider einde column also fits "(volgende dag)"
    // on one line instead of wrapping and making that row taller.
    const grid = '180px 230px 190px';
    return (
        <FragmentableGrid
            cols={1}
            columnGap={0}
            rowGap={0}
            items={[
                <div key="head" className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content' }}>
                    {['begin', 'einde', 'duur'].map(h => <div key={h} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: '12px' }}>{h}</div>)}
                </div>,
                ...exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content', marginBottom: `${Math.max(0, gap - 14)}px` }}>
                        <div style={cell}>{content(ex, 'begin')}</div>
                        <div style={cell}>{content(ex, 'einde')}</div>
                        <div style={cell}>{content(ex, 'duur')}</div>
                    </div>
                )),
            ]}
        />
    );
}
