import type { MathBlock, RekenvolgordeExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
const GLYPH: Record<string, string> = { '+': '+', '-': '−', 'x': '×', ':': ':', '(': '(', ')': ')' };

export default function RekenvolgordeViewer({ block, showSolutions }: Props) {
    const exercises: RekenvolgordeExercise[] = block.rekenvolgordeExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const renderTokens = (tokens: (number | string)[]) => tokens
        .map(t => typeof t === 'number' ? formatMathNumber(t) : GLYPH[t] ?? t)
        .join(' ')
        // Tight brackets read better: "( 4 + 3 )" → "(4 + 3)".
        .replace(/\( /g, '(').replace(/ \)/g, ')');

    return (
        <FragmentableGrid
            cols={2}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px' }}>
                    <span>{renderTokens(ex.tokens)} =</span>
                    {showSolutions
                        ? <span style={{ color: SOL, minWidth: '56px', textAlign: 'center' }}>{formatMathNumber(ex.answer)}</span>
                        : <span style={{ borderBottom: '1.5px solid #000', minWidth: '56px', height: '15px', display: 'inline-block' }} />}
                </div>
            ))}
        />
    );
}
