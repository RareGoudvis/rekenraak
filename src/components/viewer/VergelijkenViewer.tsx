import type { MathBlock, VergelijkenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import type { RepKind } from '../../services/vergelijken/representations';
import RepValue from './RepValue';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth } from './BlockWidthContext';
import type { VergelijkenConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Printed digit/mono sizes below are factors of --sheet-size-math (empty-state chrome
// stays fixed px).
const mono = "'Azeret Mono', monospace";

export default function VergelijkenViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const exercises: VergelijkenExercise[] = block.vergelijkenExercises || [];
    const c = block.constraints as VergelijkenConstraints;
    const subType: string = c.subType ?? 'getallen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // ── KIEZEN: circle the largest / smallest ─────────────────────────────────
    if (subType === 'kiezen') {
        return (
            <FragmentableGrid
                cols={1}
                rowGap={gap}
                items={exercises.map(ex => {
                    const nums = ex.numbers || [];
                    const answer = (ex.target ?? 'grootste') === 'kleinste' ? Math.min(...nums) : Math.max(...nums);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', justifyContent: 'space-between', width: '100%', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1)' }}>
                            {nums.map((n, i) => {
                                const isAns = showSolutions && n === answer;
                                return (
                                    <span key={i} style={{
                                        padding: '2px 8px',
                                        border: isAns ? `2px solid ${SOL}` : '2px solid transparent',
                                        borderRadius: '50%',
                                        color: isAns ? SOL : 'inherit',
                                        // A wrapped flex line can otherwise report an intrinsic width wider than the cell.
                                        minWidth: 0,
                                    }}>
                                        {formatMathNumber(n)}
                                    </span>
                                );
                            })}
                        </div>
                    );
                })}
            />
        );
    }

    const op = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');

    // ── REPRESENTATIES: each side in a chosen representation, fill <, > or = ────
    if (subType === 'representaties') {
        const leftRep: RepKind = c.leftRep ?? 'breuk';
        const rightRep: RepKind = c.rightRep ?? 'kommagetal';
        // 'woorden' spells a value out ("9 honderdtallen 8 tientallen …") and wraps to
        // several lines in a 2-up track — keep those comparisons full width (1-up).
        const hasWoorden = leftRep === 'woorden' || rightRep === 'woorden';
        return (
            <FragmentableGrid
                cols={hasWoorden ? 1 : fitCols(availableWidth, 230, 2)}
                columnGap={24}
                rowGap={gap + 4}
                items={exercises.map(ex => {
                    const a = ex.a ?? 0, b = ex.b ?? 0;
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
                            <span style={{ minWidth: '80px', display: 'inline-flex', justifyContent: 'flex-end', alignItems: 'center' }}><RepValue value={a} rep={leftRep} frac={ex.aFrac} /></span>
                            <span style={{
                                width: '34px', height: '34px', border: '1px solid #000', borderRadius: '4px',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                ...solutionText, flexShrink: 0,
                            }}>
                                {showSolutions ? op(a, b) : ''}
                            </span>
                            <span style={{ minWidth: '80px', display: 'inline-flex', alignItems: 'center' }}><RepValue value={b} rep={rightRep} frac={ex.bFrac} /></span>
                        </div>
                    );
                })}
            />
        );
    }

    // ── GETALLEN: fill <, > or = between two numbers ──────────────────────────
    // Row is two 70px number spans + a 34px op box + gaps ≈ 210px; 220px keeps 2-up at
    // full width but forces 1-up in a ½ cell (~334px) so it can't spill into the neighbour.
    return (
        <FragmentableGrid
            cols={fitCols(availableWidth, 220, 2, 24)}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                const a = ex.a ?? 0, b = ex.b ?? 0;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
                        <span style={{ minWidth: '70px', textAlign: 'right' }}>{formatMathNumber(a)}</span>
                        <span style={{
                            width: '34px', height: '34px', border: '1px solid #000', borderRadius: '4px',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            ...solutionText,
                        }}>
                            {showSolutions ? op(a, b) : ''}
                        </span>
                        <span style={{ minWidth: '70px' }}>{formatMathNumber(b)}</span>
                    </div>
                );
            })}
        />
    );
}
