import type { MathBlock, TijdsduurExercise } from '../../services/math/types';
import { formatDigitalTime } from '../../services/clock/clockTypes';
import { formatDuur } from '../../services/tijdsduur/tijdsduurGenerator';
import FragmentableGrid from './FragmentableGrid';
import { solutionText } from './solutionStyle';
import { ANSWER_ROW_H } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SALMON = '#f4cbb8';

// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text), not fixed px
const cell: React.CSSProperties = {
    border: '1px solid #000', minHeight: ANSWER_ROW_H, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)', boxSizing: 'border-box', padding: '2px 6px',
};

export default function TijdsduurViewer({ block, showSolutions }: Props) {
    const exercises: TijdsduurExercise[] = block.tijdsduurExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
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
        return showSolutions ? <span style={{ ...solutionText }}>{value}</span> : '';
    };

    // Column width in `ch` (mono, so exact) off the widest value THIS rep actually prints —
    // was a fixed 180/230/190px split that could only ever be full width (owner review R3).
    // "einde" is sized off "HH:MM" only: "(volgende dag)" is left to wrap onto its own line
    // rather than widen the column for a suffix that only some rows print.
    const HHMM_CHARS = 5;
    const duurChars = Math.max(...exercises.map(ex => formatDuur(ex.endMin - ex.startMin).length));
    const COLS: Array<{ label: string; chars: number }> = [
        { label: 'begin', chars: HHMM_CHARS },
        { label: 'einde', chars: HHMM_CHARS },
        { label: 'duur', chars: duurChars },
    ];
    const grid = COLS.map(c => `${Math.min(14, Math.max(2, c.label.length, c.chars) + 2)}ch`).join(' ');
    // `ch` in gridTemplateColumns resolves against the GRID CONTAINER's own font, not the
    // cells inside it (see VerbandenViewer) — match the cells' own mono/size here.
    const gridFont: React.CSSProperties = { fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.81)' };
    return (
        <FragmentableGrid
            cols={1}
            columnGap={0}
            rowGap={0}
            items={[
                <div key="head" className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content', ...gridFont }}>
                    {COLS.map(c => <div key={c.label} style={{ ...cell, backgroundColor: SALMON, fontWeight: 'bold', fontSize: 'calc(var(--sheet-size-text) * 0.6)' }}>{c.label}</div>)}
                </div>,
                ...exercises.map(ex => (
                    <div key={ex.id} className="print-exercise" style={{ display: 'grid', gridTemplateColumns: grid, width: 'fit-content', ...gridFont, marginBottom: `${Math.max(0, gap - 14)}px` }}>
                        <div style={cell}>{content(ex, 'begin')}</div>
                        <div style={cell}>{content(ex, 'einde')}</div>
                        <div style={cell}>{content(ex, 'duur')}</div>
                    </div>
                )),
            ]}
        />
    );
}
