import type { MathBlock, ProcentExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import { useBlockWidth, useSheetSizePx, fitCols, ANSWER_LINE_H } from './BlockWidthContext';
import { monoTextPx } from '../../services/layout/blockLayout';
import type { ProcentenConstraints } from '../../services/math/constraintTypes';
import { solutionText, centerWhenSingle } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
// Row font steps: 0.92 is the sheet size; a narrow cell steps down so the sentence stays on one line.
const ROW_FACTORS = [0.92, 0.85, 0.78, 0.7];
const COL_GAP = 24;
// SYNC: the blank widths below (welk 56 + " %", nemen 70).
const BLANK_PX = { welk: 56, nemen: 70 };
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

export default function ProcentenViewer({ block, showSolutions }: Props) {
    const exercises: ProcentExercise[] = block.procentExercises || [];
    const c = block.constraints as ProcentenConstraints;
    const subType: string = c.subType ?? 'nemen';
    const scaffold: boolean = c.scaffold ?? false;
    const gap = block.verticalSpacing || 14;
    const availableWidth = useBlockWidth();
    const mathPx = useSheetSizePx('math');

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const blank = (val: number | string, width: number) => showSolutions
        ? <span style={{ ...solutionText, minWidth: `${width}px`, textAlign: 'center', display: 'inline-block' }}>{val}</span>
        : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${width}px`, height: ANSWER_LINE_H, display: 'inline-block' }} />;

    // itemMinPx 200 (was 150): a "welk-percent" row is the widest of the two sentence
    // shapes and needs the extra room, which is also what keeps a half column 1-up
    // instead of squeezing two in.
    const procCols = scaffold ? 1 : fitCols(availableWidth, 200, 2, COL_GAP);
    const welk = subType === 'welk-percent';
    const promptOf = (ex: ProcentExercise) => welk
        ? `${formatMathNumber(ex.answer)} van de ${formatMathNumber(ex.base)} =`
        : `${formatMathNumber(ex.percent)} % van ${formatMathNumber(ex.base)} =`;
    // The sentence ("452 van de 904 =") never breaks; the blank drops below it when the line
    // does not fit. The font steps down only as far as the whole line, or else the sentence
    // alone, needs to fit the column.
    const colPx = (availableWidth - COL_GAP * (procCols - 1)) / procCols;
    const promptChars = Math.max(1, ...exercises.map(ex => promptOf(ex).length));
    const answerChars = Math.max(1, ...exercises.map(ex => formatMathNumber(welk ? ex.percent : ex.answer).length));
    const promptPx = (f: number) => monoTextPx(promptChars, f, mathPx);
    const linePx = (f: number) => promptPx(f) + 8 + Math.max(welk ? BLANK_PX.welk : BLANK_PX.nemen, monoTextPx(answerChars, f, mathPx))
        + (welk ? 8 + monoTextPx(1, f, mathPx) : 0);
    const factor = ROW_FACTORS.find(f => linePx(f) <= colPx)
        ?? ROW_FACTORS.find(f => promptPx(f) <= colPx)
        ?? ROW_FACTORS[ROW_FACTORS.length - 1];
    return (
        <FragmentableGrid
            cols={procCols}
            // Columns and the row font both follow useBlockWidth: a wide probe is an allowance.
            shrinks
            columnGap={COL_GAP}
            rowGap={gap}
            justifyItems={centerWhenSingle(procCols)}
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '8px', rowGap: '4px', fontFamily: mono, fontSize: `calc(var(--sheet-size-math) * ${factor})` }}>
                        <span style={{ whiteSpace: 'nowrap' }}>{promptOf(ex)}</span>
                        {welk
                            ? <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '8px', whiteSpace: 'nowrap' }}>
                                {blank(formatMathNumber(ex.percent), BLANK_PX.welk)}
                                <span>%</span>
                            </span>
                            : blank(formatMathNumber(ex.answer), BLANK_PX.nemen)}
                    </div>
                    {scaffold && subType === 'nemen' && (ex.percent % 10 === 0 ? ex.base % 10 === 0 : ex.base % 100 === 0) && (
                        // Tussenstap via 10 % / 1 % — the leerplan mental-math route.
                        // Only shown when the intermediate value is a whole number.
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', fontFamily: mono, fontSize: 'calc(var(--sheet-size-math) * 0.75)', color: '#555', paddingLeft: '16px' }}>
                            <span>{ex.percent % 10 === 0 ? '10' : '1'} % van {formatMathNumber(ex.base)} =</span>
                            {blank(formatMathNumber(ex.percent % 10 === 0 ? ex.base / 10 : ex.base / 100), 56)}
                        </div>
                    )}
                </div>
            ))}
        />
    );
}
