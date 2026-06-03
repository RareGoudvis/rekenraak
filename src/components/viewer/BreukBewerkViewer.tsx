import type { MathBlock, BreukBewerkExercise } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import VerticalFraction from './VerticalFraction';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';

// Writing line the pupil writes the answer on (works for both a fraction and a mixed number).
function AnswerSlot({ ex, index, showSolutions }: { ex: BreukBewerkExercise; index: number; showSolutions: boolean }) {
    if (showSolutions) return <VerticalFraction value={ex.answers[index]} color={SOL} fontSize={16} mono />;
    return <span style={{ display: 'inline-block', width: '80px', borderBottom: '1.5px solid #000', height: '20px' }} />;
}

export default function BreukBewerkViewer({ block, showSolutions }: Props) {
    const exercises: BreukBewerkExercise[] = block.breukBewerkExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <FragmentableGrid
            cols={2}
            columnGap={28}
            rowGap={gap + 8}
            items={exercises.map(ex => {
                // gelijknamig has two inputs/answers joined by "en"; the rest are 1→1.
                const isGelijk = ex.subType === 'gelijknamig';
                const sep = isGelijk ? '→' : '=';
                // Grid keeps the fraction(s), the separator and the writing line(s) aligned.
                const cols = isGelijk
                    ? 'auto 22px auto 22px auto 22px auto'   // frac · en · frac · → · line · en · line
                    : 'auto 22px auto';                       // frac · = · line
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'inline-grid', gridTemplateColumns: cols, alignItems: 'center', justifyItems: 'center', columnGap: '8px', fontFamily: mono, fontSize: '18px' }}>
                        <VerticalFraction value={ex.inputs[0]} fontSize={16} mono />
                        {isGelijk && <><span>en</span><VerticalFraction value={ex.inputs[1]} fontSize={16} mono /></>}
                        <span>{sep}</span>
                        <AnswerSlot ex={ex} index={0} showSolutions={showSolutions} />
                        {isGelijk && <><span>en</span><AnswerSlot ex={ex} index={1} showSolutions={showSolutions} /></>}
                    </div>
                );
            })}
        />
    );
}
