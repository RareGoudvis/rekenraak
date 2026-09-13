import type { MathBlock } from '../../services/math/types';
import FractionExerciseItem from './FractionExerciseItem';
import FragmentableGrid from './FragmentableGrid';
import { SHAPE_BUDGET_AT_DEFAULT, PX_PER_EM_AT_DEFAULT } from './FractionShapeSVG';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import type { FractionConstraints } from '../../services/math/constraintTypes';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Wrapper so the registry can mount a uniform {block, showSolutions} viewer.
// Holds the 1-col-vs-2-col grid choice + empty-state that used to live in App.tsx.
export default function FractionViewer({ block, showSolutions }: Props) {
    const c = block.constraints as FractionConstraints;
    const subType = c.subType || 'kleuren';
    const answerFmt = c.answerFormat as string | undefined;
    // These subtypes (and hoeveelheid with breuk-questions) need full width per item.
    const is1Col = subType === 'lijnstuk' || subType === 'veelhoek' || (subType === 'hoeveelheid' && answerFmt === 'met-breukvragen');
    const exList = block.fractionExercises || [];
    const gap = block.verticalSpacing || 14;
    // The figures are drawn in em, so a column is only as wide as the shape budget times the
    // teacher's Lettergrootte setting — at 18pt two of them no longer fit a full-width block.
    // 16px = the item's own 8px padding on both sides.
    const availableWidth = useBlockWidth();
    const itemMinPx = SHAPE_BUDGET_AT_DEFAULT * (useSheetSizePx('math') / PX_PER_EM_AT_DEFAULT) + 16;

    if (exList.length === 0) {
        // Screen-only chrome — not a printed sheet font, so it stays a fixed px size.
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const cols = is1Col ? 1 : fitCols(availableWidth, itemMinPx, 2, gap);
    // The figure has to know the column it lands in, not the whole block: it caps its own
    // font-size there so a bigger Lettergrootte stops growing instead of clipping in print.
    // 16px = the item's own padding on both sides.
    const columnWidth = Math.floor((availableWidth - gap * (cols - 1)) / cols) - 16;

    return (
        <FragmentableGrid
            cols={cols}
            columnGap={gap}
            rowGap={gap}
            items={exList.map((ex) => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', justifyContent: 'center', padding: '8px', boxSizing: 'border-box' }}>
                    <FractionExerciseItem ex={ex} block={block} showSolutions={showSolutions} columnWidth={columnWidth} />
                </div>
            ))}
        />
    );
}
