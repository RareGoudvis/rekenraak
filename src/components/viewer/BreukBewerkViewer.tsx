import type { MathBlock, BreukBewerkExercise } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import VerticalFraction from './VerticalFraction';
import { SOL } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// The row's own fontSize is a factor of --sheet-size-math; VerticalFraction's numeric
// fontSize prop is unchanged — it converts itself to the same token internally.
const mono = "'Azeret Mono', monospace";
// 13pt (the --sheet-size-math default) is 17.33 CSS px: the item minimums below are the px
// an item needs at that default, scaled with the token because the fractions are.
const PX_PER_EM_AT_DEFAULT = 17.33;
// gelijknamig prints four fractions and two "en" on one row; the others are frac = line.
const ITEM_MIN_PX_AT_DEFAULT: Record<string, number> = { gelijknamig: 300 };
const ITEM_MIN_FALLBACK_PX = 140;

// Writing line the pupil writes the answer on (works for both a fraction and a mixed number).
function AnswerSlot({ ex, index, showSolutions }: { ex: BreukBewerkExercise; index: number; showSolutions: boolean }) {
    if (showSolutions) return <VerticalFraction value={ex.answers[index]} color={SOL} fontSize={16} mono />;
    return <span style={{ display: 'inline-block', width: '80px', borderBottom: '1.5px solid #000', height: '20px' }} />;
}

export default function BreukBewerkViewer({ block, showSolutions }: Props) {
    const exercises: BreukBewerkExercise[] = block.breukBewerkExercises || [];
    const availableWidth = useBlockWidth();
    const sheetPx = useSheetSizePx('math');
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // The widest subType in the block decides the column count — a mixed block must fit its
    // longest row, and gemengd/vereenvoudigen are narrow enough for a quarter.
    const itemMinPx = Math.max(...exercises.map(ex =>
        ITEM_MIN_PX_AT_DEFAULT[ex.subType] ?? ITEM_MIN_FALLBACK_PX)) * (sheetPx / PX_PER_EM_AT_DEFAULT);

    return (
        <FragmentableGrid
            cols={fitCols(availableWidth, itemMinPx, 2)}
            columnGap={28}
            rowGap={gap + 8}
            items={exercises.map(ex => {
                // gelijknamig has two inputs/answers joined by "en"; the rest are 1→1.
                const isGelijk = ex.subType === 'gelijknamig';
                const sep = isGelijk ? '→' : '=';
                // Grid keeps the fraction(s), the separator and the writing line(s) aligned.
                // The separators used to sit in fixed 22px columns on top of the 8px gap,
                // which made every row wider than its content for no alignment gain — the
                // grid is inline, so `auto` tracks size to what is actually in them.
                const cols = isGelijk
                    ? 'auto auto auto auto auto auto auto'   // frac · en · frac · → · line · en · line
                    : 'auto auto auto';                      // frac · = · line
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'inline-grid', gridTemplateColumns: cols, alignItems: 'center', justifyItems: 'center', columnGap: '8px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
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
