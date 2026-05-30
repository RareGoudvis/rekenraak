import type { MathBlock } from '../../services/math/types';
import FractionExerciseItem from './FractionExerciseItem';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Wrapper so the registry can mount a uniform {block, showSolutions} viewer.
// Holds the 1-col-vs-2-col grid choice + empty-state that used to live in App.tsx.
export default function FractionViewer({ block, showSolutions }: Props) {
    const subType = block.constraints.subType || 'kleuren';
    const answerFmt = block.constraints.answerFormat as string | undefined;
    // These subtypes (and hoeveelheid with breuk-questions) need full width per item.
    const is1Col = subType === 'lijnstuk' || subType === 'veelhoek' || (subType === 'hoeveelheid' && answerFmt === 'met-breukvragen');
    const exList = block.fractionExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exList.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <FragmentableGrid
            cols={is1Col ? 1 : 2}
            columnGap={gap}
            rowGap={gap}
            items={exList.map((ex) => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', justifyContent: 'center', padding: '8px', boxSizing: 'border-box' }}>
                    <FractionExerciseItem ex={ex} block={block} showSolutions={showSolutions} />
                </div>
            ))}
        />
    );
}
