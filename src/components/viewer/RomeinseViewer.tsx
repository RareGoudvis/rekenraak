import type { MathBlock, RomeinseExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import { fitCols, useBlockWidth, useSheetSizePx, ANSWER_LINE_H } from './BlockWidthContext';
import { monoTextPx } from '../../services/layout/blockLayout';
import type { RomeinseConstraints } from '../../services/math/constraintTypes';
import { solutionText, centerWhenSingle } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.
// Row text is 1.04 x the math token with 1px letter-spacing; the column widths are derived from it.
const ROW_FONT = 1.04;
const COL_GAP = 28;

export default function RomeinseViewer({ block, showSolutions }: Props) {
    const availableWidth = useBlockWidth();
    const mathPx = useSheetSizePx('math');
    const exercises: RomeinseExercise[] = block.romeinseExercises || [];
    const c = block.constraints as RomeinseConstraints;
    const subType: string = c.subType ?? 'herkennen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // herkennen: Roman → number ; schrijven: number → Roman.
    const herkennen = subType !== 'schrijven';

    // Size the prompt column to the block's actual longest prompt/answer (mono at the row
    // font + 1px letter-spacing per glyph) so niveau-4 numerals like MMMCMXCIX don't push
    // the 150px+150px row past the 2-up column.
    const glyphPx = monoTextPx(1, ROW_FONT, mathPx) + 1;
    const maxPromptChars = Math.max(1, ...exercises.map(ex => (herkennen ? ex.roman : formatMathNumber(ex.value)).length));
    const maxAnswerChars = Math.max(1, ...exercises.map(ex => (herkennen ? formatMathNumber(ex.value) : ex.roman).length));
    const promptW = Math.max(60, Math.ceil(maxPromptChars * glyphPx) + 4);

    const romCols = fitCols(availableWidth, 250, 2);
    // Answer line: fill what's left of the column (less the arrow and its two 10px gaps and
    // ~13px of air), at least the longest answer. 297 at the default 2-up full width.
    const colPx = (availableWidth - COL_GAP * (romCols - 1)) / romCols;
    const answerMin = Math.max(Math.ceil(maxAnswerChars * glyphPx) + 4, Math.min(150, colPx - 33 - promptW - 32));
    return (
        <FragmentableGrid
            cols={romCols}
            columnGap={COL_GAP}
            rowGap={gap + 2}
            justifyItems={centerWhenSingle(romCols)}
            items={exercises.map(ex => {
                const prompt = herkennen ? ex.roman : formatMathNumber(ex.value);
                const answer = herkennen ? formatMathNumber(ex.value) : ex.roman;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', fontFamily: mono, fontSize: `calc(var(--sheet-size-math) * ${ROW_FONT})` }}>
                        {/* Fixed width + right-align pins the prompt's right edge so the arrow
                           and answer line align in a column regardless of numeral length. */}
                        <span style={{ width: `${promptW}px`, textAlign: 'right', whiteSpace: 'nowrap', letterSpacing: '1px', flexShrink: 0 }}>{prompt}</span>
                        <span style={{ alignSelf: 'center' }}>→</span>
                        {/* long line so pupils can add the pieces of the numeral */}
                        {showSolutions
                            ? <span style={{ ...solutionText, letterSpacing: '1px', minWidth: `${answerMin}px`, whiteSpace: 'nowrap' }}>{answer}</span>
                            : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${answerMin}px`, height: ANSWER_LINE_H, display: 'inline-block' }} />}
                    </div>
                );
            })}
        />
    );
}
