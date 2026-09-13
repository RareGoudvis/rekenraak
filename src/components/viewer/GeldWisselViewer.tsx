import type { MathBlock, GeldWisselExercise } from '../../services/math/types';
import { Bill } from './GeldViewer';
import FragmentableGrid from './FragmentableGrid';
import type { GeldWisselConstraints } from '../../services/math/constraintTypes';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';

// Size below is a factor of the sheet token (--sheet-size-math), not a fixed px
const PX_PER_EM_AT_DEFAULT = 17.33;
// Bill + '=' + a legible draw box (~35mm), plus gaps — the minimum cell a wissel exercise
// needs; scaled with the math token since the bill figure itself is `em`-sized (GeldViewer).
const ITEM_MIN_PX_AT_DEFAULT = 200;

function WisselCell({ ex, boxHeight }: { ex: GeldWisselExercise; boxHeight: number }) {
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', boxSizing: 'border-box' }}>
            <div style={{ flexShrink: 0 }}>
                <Bill valueCents={ex.billValueCents} />
            </div>
            <div style={{ fontSize: 'calc(var(--sheet-size-math) * 1.38)', fontWeight: 'bold', fontFamily: "'Azeret Mono', monospace", flexShrink: 0 }}>
                =
            </div>
            <div style={{ flex: 1, height: `${boxHeight}px`, border: '2px solid #000', boxSizing: 'border-box', borderRadius: '6px' }} />
        </div>
    );
}

interface Props { block: MathBlock; showSolutions: boolean; }

// showSolutions unused — wissel has no solution overlay (student draws the answer).
export default function GeldWisselViewer({ block }: Props) {
    const availableWidth = useBlockWidth();
    const exercises: GeldWisselExercise[] = block.geldWisselExercises || [];
    const gap: number = block.verticalSpacing || 14;
    const c = block.constraints as GeldWisselConstraints;
    const exercisesPerRow: number = c.exercisesPerRow ?? 2;
    const boxHeight: number = c.boxHeight ?? 100;
    const itemMinPx = ITEM_MIN_PX_AT_DEFAULT * (useSheetSizePx('math') / PX_PER_EM_AT_DEFAULT);
    // Was a flat exercisesPerRow that ignored the column and squeezed 2-up into a half —
    // fitCols drops to 1-up there, keeping exercisesPerRow as the full-width preference (owner review R3).
    const cols = fitCols(availableWidth, itemMinPx, exercisesPerRow, gap);

    if (exercises.length === 0) {
        return <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    return (
        <FragmentableGrid
            cols={cols}
            columnGap={gap}
            rowGap={gap}
            items={exercises.map(ex => (
                <WisselCell key={ex.id} ex={ex} boxHeight={boxHeight} />
            ))}
        />
    );
}
