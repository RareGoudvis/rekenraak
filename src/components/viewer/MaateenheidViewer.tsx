import type { MathBlock, MaateenheidExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import type { MaateenheidConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { ANSWER_LINE_H } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text), not fixed px

export default function MaateenheidViewer({ block, showSolutions }: Props) {
    const exercises: MaateenheidExercise[] = block.maateenheidExercises || [];
    const c = block.constraints as MaateenheidConstraints;
    const subType: string = c.subType ?? 'eenheid';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            columnGap={24}
            rowGap={gap}
            // 1-up: centre the sentence+chip row rather than leave it hugging the left edge.
            justifyItems="center"
            items={exercises.map(ex => {
                // Schatten shows value+unit combos ("180 g / 180 kg"); eenheid shows bare units.
                const chipText = (u: string) => subType === 'schatten' ? `${formatMathNumber(ex.value)} ${u}` : u;
                // The sentence keeps '___' as the gap; schatten replaces value+gap together.
                const sentence = subType === 'schatten'
                    ? ex.sentence.replace(`${String(ex.value).replace('.', ',')} ___`, '___').replace(/\d+(,\d+)? ___/, '___')
                    : ex.sentence;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'calc(var(--sheet-size-text) * 0.75)', flexWrap: 'wrap', minWidth: 0 }}>
                        <span>{sentence.split('___')[0]}
                            {ex.choices
                                ? <span style={{ borderBottom: '1px dotted #999', minWidth: '30px', display: 'inline-block' }} />
                                : showSolutions
                                    ? <span style={{ ...solutionText, fontWeight: 600 }}>{chipText(ex.unit)}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', minWidth: '60px', height: ANSWER_LINE_H, display: 'inline-block' }} />}
                            {sentence.split('___')[1]}
                        </span>
                        {ex.choices && (
                            <span style={{ display: 'inline-flex', gap: '10px', fontFamily: "'Azeret Mono', monospace", fontSize: 'calc(var(--sheet-size-math) * 0.81)' }}>
                                {ex.choices.map(u => (
                                    // Solutions circle the right chip in red (print-safe ring).
                                    <span key={u} style={{
                                        padding: '1px 8px', borderRadius: '10px',
                                        border: showSolutions && u === ex.unit ? `2px solid ${SOL}` : '1px solid transparent',
                                        color: showSolutions && u === ex.unit ? SOL : undefined,
                                    }}>{chipText(u)}</span>
                                ))}
                            </span>
                        )}
                    </div>
                );
            })}
        />
    );
}
