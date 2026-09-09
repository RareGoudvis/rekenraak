import type { MathBlock, MaateenheidExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const SOL = '#e11d48';

export default function MaateenheidViewer({ block, showSolutions }: Props) {
    const exercises: MaateenheidExercise[] = block.maateenheidExercises || [];
    const subType: string = block.constraints.subType ?? 'eenheid';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                // Schatten shows value+unit combos ("180 g / 180 kg"); eenheid shows bare units.
                const chipText = (u: string) => subType === 'schatten' ? `${formatMathNumber(ex.value)} ${u}` : u;
                // The sentence keeps '___' as the gap; schatten replaces value+gap together.
                const sentence = subType === 'schatten'
                    ? ex.sentence.replace(`${String(ex.value).replace('.', ',')} ___`, '___').replace(/\d+(,\d+)? ___/, '___')
                    : ex.sentence;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', flexWrap: 'wrap' }}>
                        <span>{sentence.split('___')[0]}
                            {ex.choices
                                ? <span style={{ borderBottom: '1px dotted #999', minWidth: '30px', display: 'inline-block' }} />
                                : showSolutions
                                    ? <span style={{ color: SOL, fontWeight: 600 }}>{chipText(ex.unit)}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', minWidth: '60px', height: '15px', display: 'inline-block' }} />}
                            {sentence.split('___')[1]}
                        </span>
                        {ex.choices && (
                            <span style={{ display: 'inline-flex', gap: '10px', fontFamily: "'Azeret Mono', monospace", fontSize: '14px' }}>
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
