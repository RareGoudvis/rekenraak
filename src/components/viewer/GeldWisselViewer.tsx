import type { MathBlock, GeldWisselExercise } from '../../services/math/types';
import { Bill } from './GeldViewer';
import FragmentableGrid from './FragmentableGrid';

function WisselCell({ ex, boxHeight }: { ex: GeldWisselExercise; boxHeight: number }) {
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', boxSizing: 'border-box' }}>
            <div style={{ flexShrink: 0 }}>
                <Bill valueCents={ex.billValueCents} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', fontFamily: "'Azeret Mono', monospace", flexShrink: 0 }}>
                =
            </div>
            <div style={{ flex: 1, height: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box', borderRadius: '6px' }} />
        </div>
    );
}

interface Props { block: MathBlock; showSolutions: boolean; }

// showSolutions unused — wissel has no solution overlay (student draws the answer).
export default function GeldWisselViewer({ block }: Props) {
    const exercises: GeldWisselExercise[] = block.geldWisselExercises || [];
    const gap: number = block.verticalSpacing || 14;
    const exercisesPerRow: number = block.constraints.exercisesPerRow ?? 2;
    const boxHeight: number = block.constraints.boxHeight ?? 100;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <FragmentableGrid
            cols={exercisesPerRow}
            columnGap={gap}
            rowGap={gap}
            items={exercises.map(ex => (
                <WisselCell key={ex.id} ex={ex} boxHeight={boxHeight} />
            ))}
        />
    );
}
