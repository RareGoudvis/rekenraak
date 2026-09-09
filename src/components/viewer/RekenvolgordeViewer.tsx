import type { MathBlock, RekenvolgordeExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import { OP_GLYPH } from '../../services/math/formatters';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';
// Same operator glyphs as everywhere else, plus the brackets this viewer alone prints.
const GLYPH: Record<string, string> = { ...OP_GLYPH, '(': '(', ')': ')' };

export default function RekenvolgordeViewer({ block, showSolutions }: Props) {
    const exercises: RekenvolgordeExercise[] = block.rekenvolgordeExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const renderTokens = (tokens: (number | string)[]) => tokens
        .map(t => typeof t === 'number' ? formatMathNumber(t) : GLYPH[t] ?? t)
        .join(' ')
        // Tight brackets read better: "( 4 + 3 )" → "(4 + 3)".
        .replace(/\( /g, '(').replace(/ \)/g, ')');

    // Every row gets the same expression column, sized to the block's longest expression and
    // right-aligned, so the "=" and the writing line land at one x instead of tracking each
    // expression's own length.
    const A4_CONTENT_PX = 625;
    const CHAR_PX = 10.4;   // Azeret Mono 16px advance (11.06px measured at 17px, scaled)
    const COL_GAP = 24;
    const LINE_PX = 56;
    const exprs = exercises.map(ex => renderTokens(ex.tokens));
    const exprW = Math.ceil(Math.max(...exprs.map(e => e.length)) * CHAR_PX);
    // "=" (8px gap + ~10px glyph + 8px gap) then the answer line. A 4-bewerkingen expression
    // at maximum 1 000 is too wide for a half column, so drop to 1-up rather than overflow.
    const rowPx = exprW + 8 + 10 + 8 + LINE_PX;
    const cols = rowPx * 2 + COL_GAP <= A4_CONTENT_PX ? 2 : 1;

    return (
        <FragmentableGrid
            cols={cols}
            gridTemplateColumns={cols === 2 ? '1fr 1fr' : '1fr'}
            columnGap={COL_GAP}
            rowGap={gap}
            items={exercises.map((ex, i) => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px' }}>
                    <span style={{ width: `${exprW}px`, textAlign: 'right', whiteSpace: 'pre', flexShrink: 0 }}>{exprs[i]}</span>
                    <span>=</span>
                    {showSolutions
                        ? <span style={{ color: SOL, minWidth: `${LINE_PX}px`, textAlign: 'center' }}>{formatMathNumber(ex.answer)}</span>
                        : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${LINE_PX}px`, height: '15px', display: 'inline-block' }} />}
                </div>
            ))}
        />
    );
}
