import type { MathBlock, RomeinseExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const SOL = '#e11d48';

export default function RomeinseViewer({ block, showSolutions }: Props) {
    const exercises: RomeinseExercise[] = block.romeinseExercises || [];
    const subType: string = block.constraints.subType ?? 'herkennen';
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    // herkennen: Roman → number ; schrijven: number → Roman.
    const herkennen = subType !== 'schrijven';

    // Size the prompt column to the block's actual longest prompt/answer (18px mono
    // ≈ 11.7px/char + 1px letter-spacing) so niveau-4 numerals like MMMCMXCIX don't
    // push the fixed 150px+150px row past the 2-up column (~300px inside the block).
    const maxPromptChars = Math.max(1, ...exercises.map(ex => (herkennen ? ex.roman : formatMathNumber(ex.value)).length));
    const maxAnswerChars = Math.max(1, ...exercises.map(ex => (herkennen ? formatMathNumber(ex.value) : ex.roman).length));
    const promptW = Math.min(150, Math.max(60, Math.ceil(maxPromptChars * 12.7) + 4));
    // Answer line: fill what's left of the 2-up column, at least the longest answer.
    const answerMin = Math.max(Math.ceil(maxAnswerChars * 12.7) + 4, Math.min(150, 297 - promptW - 32));

    return (
        <FragmentableGrid
            cols={2}
            columnGap={28}
            rowGap={gap + 2}
            items={exercises.map(ex => {
                const prompt = herkennen ? ex.roman : formatMathNumber(ex.value);
                const answer = herkennen ? formatMathNumber(ex.value) : ex.roman;
                return (
                    <div key={ex.id} className="print-exercise" style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', fontFamily: mono, fontSize: '18px' }}>
                        {/* Fixed width + right-align pins the prompt's right edge so the arrow
                           and answer line align in a column regardless of numeral length. */}
                        <span style={{ width: `${promptW}px`, textAlign: 'right', whiteSpace: 'nowrap', letterSpacing: '1px', flexShrink: 0 }}>{prompt}</span>
                        <span style={{ alignSelf: 'center' }}>→</span>
                        {/* long line so pupils can add the pieces of the numeral */}
                        {showSolutions
                            ? <span style={{ color: SOL, letterSpacing: '1px', minWidth: `${answerMin}px`, whiteSpace: 'nowrap' }}>{answer}</span>
                            : <span style={{ borderBottom: '1.5px solid #000', minWidth: `${answerMin}px`, height: '18px', display: 'inline-block' }} />}
                    </div>
                );
            })}
        />
    );
}
