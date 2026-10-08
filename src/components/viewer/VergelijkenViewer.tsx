import type { MathBlock, VergelijkenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import type { RepKind } from '../../services/vergelijken/representations';
import RepValue from './RepValue';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import { grownColumn, monoTextPx, MONO_ADVANCE_EM } from '../../services/layout/blockLayout';
import type { VergelijkenConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { interactionProps, useViewerInteraction } from './ViewerInteractionContext';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

// Printed digit/mono sizes below are factors of --sheet-size-math (empty-state chrome
// stays fixed px).
const mono = "'Azeret Mono', monospace";

export default function VergelijkenViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const mathPx = useSheetSizePx('math');
    // Oefenmodus: null on the sheet; in the kiosk the pupil taps the number (kiezen).
    const ix = useViewerInteraction();
    const exercises: VergelijkenExercise[] = block.vergelijkenExercises || [];
    const c = block.constraints as VergelijkenConstraints;
    const subType: string = c.subType ?? 'getallen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // ── KIEZEN: circle the largest / smallest ─────────────────────────────────
    if (subType === 'kiezen') {
        // One column width for the whole block (not per-row max-content) sized to the
        // WIDEST number anywhere in it, and right-aligned, so hundreds line up under
        // hundreds across rows instead of each row's chips floating at their own width.
        const parts = exercises.flatMap(ex => ex.numbers || []).map(v => formatMathNumber(v).split(','));
        const intChars = Math.max(2, ...parts.map(p => p[0].length));
        const fracChars = Math.max(0, ...parts.map(p => p[1]?.length ?? 0));
        const chipChars = intChars + (fracChars > 0 ? fracChars + 1 : 0);
        // The chip's real width: its `ch` grid + 16px padding + 4px border, so the 18px gap
        // stays 18px between the rings at every size.
        const chipPx = monoTextPx(chipChars, 1, mathPx) + 20;
        const setSize = Math.max(1, ...exercises.map(ex => ex.numbers?.length ?? 0));
        const CHIP_GAP = 18;
        const rowFits = setSize * chipPx + (setSize - 1) * CHIP_GAP <= availableWidth;
        const chipColWidth = `calc(var(--sheet-size-math) * ${(chipChars * MONO_ADVANCE_EM).toFixed(3)} + 20px)`;
        // A set too wide for one line breaks into equal lines of a block-wide column count,
        // so place values still line up under each other across every exercise.
        const perLine = rowFits ? setSize : Math.max(1, Math.floor((availableWidth + CHIP_GAP) / (chipPx + CHIP_GAP)));
        const lineCols = rowFits ? 0 : Math.ceil(setSize / Math.ceil(setSize / perLine));
        return (
            <FragmentableGrid
                cols={1}
                rowGap={gap}
                items={exercises.map(ex => {
                    const nums = ex.numbers || [];
                    const answer = (ex.target ?? 'grootste') === 'kleinste' ? Math.min(...nums) : Math.max(...nums);
                    return (
                        // C3: same "never wrap" treatment as ordenen — one CSS grid, columns
                        // sized to content, laid out in a single row instead of a flex-wrap
                        // that could break the chip list onto a second line.
                        <div key={ex.id} className="print-exercise" style={{
                            display: 'grid', columnGap: `${CHIP_GAP}px`, justifyContent: 'center', width: '100%',
                            ...(lineCols
                                ? { gridTemplateColumns: `repeat(${lineCols}, ${chipColWidth})`, rowGap: '6px' }
                                : { gridAutoFlow: 'column', gridAutoColumns: chipColWidth }),
                            fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1)',
                        }}>
                            {nums.map((n, i) => {
                                const isAns = showSolutions && n === answer;
                                // Split at the comma so 976,9 and 61,96 line up on it (place value
                                // under place value), not on their right edge.
                                const [int, frac] = formatMathNumber(n).split(',');
                                return (
                                    <span key={i} {...interactionProps(ix, String(i))} style={{
                                        // Kiosk: a taller chip so a wide set still scales to a ≥ 44 px tap target on a phone.
                                        padding: ix ? '7px 8px' : '2px 8px',
                                        display: 'inline-grid', gridTemplateColumns: `${intChars}ch ${fracChars > 0 ? `${fracChars + 1}ch` : ''}`,
                                        border: isAns ? `2px solid ${SOL}` : '2px solid transparent',
                                        borderRadius: '50%',
                                        color: isAns ? SOL : 'inherit',
                                    }}>
                                        <span style={{ textAlign: 'right' }}>{int}</span>
                                        {fracChars > 0 && <span style={{ textAlign: 'left' }}>{frac !== undefined ? `,${frac}` : ''}</span>}
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
        const repCols = hasWoorden ? 1 : fitCols(availableWidth, 230, 2);
        return (
            <FragmentableGrid
                cols={repCols}
                columnGap={24}
                rowGap={gap + 4}
                items={exercises.map(ex => {
                    const a = ex.a ?? 0, b = ex.b ?? 0;
                    return (
                        // 1-up: centre the row in the cell instead of hugging the left edge.
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', justifyContent: repCols === 1 ? 'center' : 'flex-start', gap: '12px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
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
    // Both number spans keep 70px and grow to the block's widest number, so the op boxes stay
    // in one column and a 2-up row of millions is judged at its real width.
    const numChars = Math.max(0, ...exercises.flatMap(ex => [formatMathNumber(ex.a ?? 0).length, formatMathNumber(ex.b ?? 0).length]));
    const numCol = grownColumn(70, numChars, 1.04, mathPx, 0);
    const getallenCols = fitCols(availableWidth, Math.max(220, 2 * numCol.px + 34 + 24), 2, 24);
    return (
        <FragmentableGrid
            cols={getallenCols}
            columnGap={24}
            rowGap={gap}
            items={exercises.map(ex => {
                const a = ex.a ?? 0, b = ex.b ?? 0;
                return (
                    // 1-up: centre the row so the two number spans line up around a centred box
                    // instead of hugging the left edge with empty space on the right.
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'center', justifyContent: getallenCols === 1 ? 'center' : 'flex-start', gap: '12px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
                        <span style={{ minWidth: numCol.css, textAlign: 'right', whiteSpace: 'nowrap' }}>{formatMathNumber(a)}</span>
                        <span style={{
                            width: '34px', height: '34px', border: '1px solid #000', borderRadius: '4px',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            ...solutionText, flexShrink: 0,
                        }}>
                            {showSolutions ? op(a, b) : ''}
                        </span>
                        <span style={{ minWidth: numCol.css, whiteSpace: 'nowrap' }}>{formatMathNumber(b)}</span>
                    </div>
                );
            })}
        />
    );
}
