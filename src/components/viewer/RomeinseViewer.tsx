import type { MathBlock, RomeinseExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';

export default function RomeinseViewer({ block, showSolutions }: Props) {
    const exercises: RomeinseExercise[] = block.romeinseExercises || [];
    const subType: string = block.constraints.subType ?? 'herkennen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    // herkennen: Roman → number ; schrijven: number → Roman.
    const herkennen = subType !== 'schrijven';

    return (
        <FragmentableGrid
            cols={2}
            columnGap={28}
            rowGap={gap + 2}
            items={exercises.map(ex => {
                const prompt = herkennen ? ex.roman : formatMathNumber(ex.value);
                const answer = herkennen ? formatMathNumber(ex.value) : ex.roman;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', fontFamily: mono, fontSize: '18px' }}>
                        <span style={{ minWidth: '74px', letterSpacing: '1px' }}>{prompt}</span>
                        <span style={{ alignSelf: 'center' }}>→</span>
                        {/* long line so pupils can add the pieces of the numeral */}
                        {showSolutions
                            ? <span style={{ color: SOL, letterSpacing: '1px', minWidth: '150px' }}>{answer}</span>
                            : <span style={{ borderBottom: '1.5px solid #000', minWidth: '150px', height: '18px', display: 'inline-block' }} />}
                    </div>
                );
            })}
        />
    );
}
