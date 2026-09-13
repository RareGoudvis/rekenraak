import type { MathBlock } from '../../services/math/types';
import ClockExerciseItem from './ClockExerciseItem';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// 13pt = 17.33 CSS px: the clock face is sized in em off --sheet-size-math, so the item's
// minimum width grows with the Lettergrootte slider and the column count must follow it.
const PX_PER_EM_AT_DEFAULT = 17.33;
const ITEM_MIN_PX_AT_DEFAULT = 150;   // widest clock item (24h face + padding) at 13pt

// Wrapper so the registry can mount a uniform {block, showSolutions} viewer.
// 3-column grid, chunked into break-safe rows so it flows across page breaks.
export default function ClockViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const sheetPx = useSheetSizePx('math');
    const exercises = block.clockExercises || [];
    const gap = block.verticalSpacing || 14;
    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }
    return (
        <FragmentableGrid
            cols={fitCols(availableWidth, ITEM_MIN_PX_AT_DEFAULT * (sheetPx / PX_PER_EM_AT_DEFAULT), 3)}
            columnGap={gap}
            rowGap={gap}
            items={exercises.map((ex) => <ClockExerciseItem key={ex.id} ex={ex} block={block} showSolutions={showSolutions} />)}
        />
    );
}
