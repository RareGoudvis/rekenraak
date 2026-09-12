import type { MathBlock, PatroonExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import { useBlockWidth } from './BlockWidthContext';
import { OP_GLYPH as SYM } from '../../services/math/formatters';
import type { PatroonConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";

export default function PatroonViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    // A chain of five numbers laid out left to right needs ~300px; a quarter-width cell is
    // 163px. Below 200px the chain turns a quarter turn and runs DOWN the cell instead —
    // the arrows still say "and then", and nothing has to shrink to fit.
    const stackVertically = availableWidth < 200;
    const exercises: PatroonExercise[] = block.patroonExercises || [];
    const gap = block.verticalSpacing || 14;
    const c = block.constraints as PatroonConstraints;
    const showArrows: boolean = c.showArrows ?? false;
    const showOperators: boolean = c.showOperators ?? false;
    const operatorsShown: number = c.operatorsShown ?? 0;
    const operatorStyle: string = c.operatorStyle ?? 'symbol';
    // Any scaffold row above the line → reserve a top slot on every connector so the row
    // stays uniform and the numbers/line stay aligned.
    const stacked = showArrows || showOperators;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const opText = (ex: PatroonExercise, i: number) => {
        const step = ex.cycle[i % ex.cycle.length];
        const sym = SYM[step.op] ?? step.op;
        return operatorStyle === 'full' ? `${sym}${formatMathNumber(step.operand)}` : sym;
    };

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 6}
            items={exercises.map(ex => {
                // Alternating number / connector cells in equal (1fr) columns → all rows align.
                const cells: React.ReactNode[] = [];
                ex.values.forEach((v, i) => {
                    cells.push(
                        <div key={`n${i}`} style={{ textAlign: 'center' }}>
                            {ex.blankMask[i]
                                ? (showSolutions ? <span style={{ ...solutionText }}>{formatMathNumber(v)}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '46px', height: '18px' }} />)
                                : formatMathNumber(v)}
                        </div>
                    );
                    if (i < ex.values.length - 1) {
                        const filled = showOperators && i < operatorsShown;
                        const top = filled
                            ? <span>{opText(ex, i)}</span>
                            : showArrows
                                ? (showSolutions ? <span style={{ ...solutionText }}>{opText(ex, i)}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '26px', height: '13px' }} />)
                                : null;
                        cells.push(stackVertically
                            // Stacked: the scaffold sits BESIDE the arrow rather than above it,
                            // so a chain of six steps stays six short lines instead of twelve.
                            ? (
                                <div key={`c${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '20px', fontSize: '12px' }}>
                                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{showArrows ? '↓' : '│'}</span>
                                    {stacked && <span style={{ display: 'flex', alignItems: 'center' }}>{top}</span>}
                                </div>
                            )
                            : (
                                <div key={`c${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', fontSize: '12px' }}>
                                    {stacked && <span style={{ height: '15px', display: 'flex', alignItems: 'flex-end' }}>{top}</span>}
                                    <span style={{ fontSize: '16px', lineHeight: 1 }}>{showArrows ? '→' : '–'}</span>
                                </div>
                            ));
                    }
                });
                return (
                    <div key={ex.id} className="print-exercise" style={stackVertically
                        ? { display: 'flex', flexDirection: 'column', alignItems: 'center', rowGap: '2px', fontFamily: mono, fontSize: '18px' }
                        : {
                            display: 'grid', gridTemplateColumns: `repeat(${ex.values.length * 2 - 1}, 1fr)`,
                            alignItems: 'end', columnGap: '2px', fontFamily: mono, fontSize: '18px',
                        }}>
                        {cells}
                    </div>
                );
            })}
        />
    );
}
