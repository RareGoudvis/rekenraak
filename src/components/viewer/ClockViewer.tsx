import type { MathBlock } from '../../services/math/types';
import ClockExerciseItem from './ClockExerciseItem';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Wrapper so the registry can mount a uniform {block, showSolutions} viewer.
// 3-column grid, chunked into break-safe rows so it flows across page breaks.
export default function ClockViewer({ block, showSolutions }: Props) {
    const exercises = block.clockExercises || [];
    const gap = block.verticalSpacing || 14;
    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }
    return (
        <FragmentableGrid
            cols={3}
            columnGap={gap}
            rowGap={gap}
            items={exercises.map((ex) => <ClockExerciseItem key={ex.id} ex={ex} block={block} showSolutions={showSolutions} />)}
        />
    );
}
