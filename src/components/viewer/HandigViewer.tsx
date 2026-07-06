import type { MathBlock, HandigExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';

export default function HandigViewer({ block, showSolutions }: Props) {
    const exercises: HandigExercise[] = block.handigExercises || [];
    const scaffolding: string = block.constraints.scaffolding ?? 'tussenstap';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    const blank = (val: string, width: number, forceShow = false) => (showSolutions || forceShow)
        ? <span style={{ color: SOL, minWidth: `${width}px`, textAlign: 'center', display: 'inline-block' }}>{val}</span>
        : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${width}px`, height: '15px', display: 'inline-block' }} />;

    return (
        <FragmentableGrid
            cols={1}
            columnGap={24}
            rowGap={gap}
            items={exercises.map((ex, idx) => {
                const opGlyph = ex.operator === '+' ? '+' : '−';
                // compenseren: a op tienvoud, dan corrigeren in de ANDERE richting.
                const secondGlyph = ex.strategy === 'compenseren' ? (ex.operator === '+' ? '−' : '+') : opGlyph;
                // 'voorbeeld': first line prints fully worked as model for the rest.
                const worked = scaffolding === 'voorbeeld' && idx === 0;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: '16px', flexWrap: 'nowrap' }}>
                        <span>{formatMathNumber(ex.a)} {opGlyph} {formatMathNumber(ex.b)} =</span>
                        {scaffolding !== 'enkel-antwoord' && (
                            <>
                                <span>{formatMathNumber(ex.a)}</span>
                                <span>{opGlyph}</span>
                                {blank(formatMathNumber(ex.steps[0]), 44, worked)}
                                <span>{secondGlyph}</span>
                                {blank(formatMathNumber(ex.steps[1]), 36, worked)}
                                <span>=</span>
                            </>
                        )}
                        {blank(formatMathNumber(ex.answer), 52, worked)}
                    </div>
                );
            })}
        />
    );
}
