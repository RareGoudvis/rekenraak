import type { MathBlock, RekenvolgordeExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import { OP_GLYPH } from '../../services/math/formatters';
import { useBlockWidth, ANSWER_ROW_H } from './BlockWidthContext';
import { solutionText } from './solutionStyle';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
// Same operator glyphs as everywhere else, plus the brackets this viewer alone prints.
const GLYPH: Record<string, string> = { ...OP_GLYPH, '(': '(', ')': ')' };
// SYNC: keep the mono face, the *1 size factor and CHAR_PX aligned with MathBlockRenderer —
// a rekenvolgorde sum and a hoofdrekenen sum on the same sheet must print at one size.
// CHAR_PX stays a raw px shrink-to-fit constant (measured Azeret Mono advance, not a style).

export default function RekenvolgordeViewer({ block, showSolutions }: Props) {
    const exercises: RekenvolgordeExercise[] = block.rekenvolgordeExercises || [];
    const gap = block.verticalSpacing || 14;
    const availablePx = useBlockWidth();

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const renderTokens = (tokens: (number | string)[]) => tokens
        .map(t => typeof t === 'number' ? formatMathNumber(t) : GLYPH[t] ?? t)
        .join(' ')
        // Tight brackets read better: "( 4 + 3 )" → "(4 + 3)".
        .replace(/\( /g, '(').replace(/ \)/g, ')');

    // Every row gets the same expression column, sized to the block's longest expression and
    // right-aligned, so the "=" and the writing line land at one x instead of tracking each
    // expression's own length.
    const CHAR_PX = 11.1;   // Azeret Mono 17px advance (measured 11.06px/char in Chrome)
    const COL_GAP = 24;
    const LINE_PX = 56;
    // Same three answer-line presets as hoofdrekenen: Kort (2-up, answer-sized blank),
    // Lang (1-up, the line runs to the cell edge), Stappen (1-up + N blank working lines).
    const layout = block.layoutPreset ?? 'inline-short';
    const exprs = exercises.map(ex => renderTokens(ex.tokens));
    const exprW = Math.ceil(Math.max(...exprs.map(e => e.length)) * CHAR_PX);
    // "=" (8px gap + ~10px glyph + 8px gap) then the answer line. A 4-bewerkingen expression
    // at maximum 1 000 is too wide for a half column, so drop to 1-up rather than overflow.
    const rowPx = exprW + 8 + 10 + 8 + LINE_PX;
    // Stappen is 2-up whenever two rows fit with real writing room — the same rule
    // MathBlockRenderer applies, so a stepped rekenvolgorde block is the same height as a
    // stepped hoofdrekenen one instead of running off the bottom of the page.
    // SYNC: MathBlockRenderer's `worklineMinPx` floor (80px = room for a hand-written step).
    const WORKLINE_MIN_PX = 80;
    const steppedRowPx = exprW + 8 + 10 + 8 + WORKLINE_MIN_PX;
    const twoUpPx = layout === 'stepped' ? steppedRowPx : rowPx;
    // Lang gives the answer line the whole cell, which only means something 1-up.
    const cols = layout !== 'inline-long' && twoUpPx * 2 + COL_GAP <= availablePx ? 2 : 1;
    // Stappen: the lines a child writes the tussenstappen on, 32px apart like hoofdrekenen's.
    const stepCount = layout === 'stepped' ? (block.steppedLines || 1) : 1;
    const stretch = layout !== 'inline-short';

    const answerLine = <div style={{
        borderBottom: '1.5px solid #000', minWidth: `${LINE_PX}px`,
        width: stretch ? '100%' : `${LINE_PX}px`,
        // Kort/Lang share one baseline with the expression, so the blank needs a body to sit
        // on; a Stappen line is bottom-aligned inside its own working row and needs none.
        ...(layout === 'stepped' ? {} : { height: '15px', display: 'inline-block' }),
    }} />;

    return (
        <FragmentableGrid
            cols={cols}
            gridTemplateColumns={cols === 2 ? '1fr 1fr' : '1fr'}
            columnGap={COL_GAP}
            rowGap={gap}
            items={exercises.map((ex, i) => (
                <div key={ex.id} className="print-exercise" style={{
                    display: 'flex',
                    // Stappen stacks extra lines below the first, so the expression pins to the
                    // top of the row instead of sharing one baseline with a multi-line column.
                    alignItems: layout === 'stepped' ? 'flex-start' : 'baseline',
                    gap: '8px',
                    fontFamily: mono,
                    fontSize: 'calc(var(--sheet-size-math) * 1)',
                    // Without extra room underneath, the next exercise sits exactly as far away
                    // as the next step line and three steps of one sum read as three sums.
                    ...(layout === 'stepped' ? { paddingBottom: '16px' } : {}),
                }}>
                    <span style={{
                        width: `${exprW}px`, textAlign: 'right', whiteSpace: 'pre', flexShrink: 0,
                        // Pin the expression ON line 1's baseline rather than letting it float
                        // above the stack of step lines.
                        ...(layout === 'stepped' ? { display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', height: ANSWER_ROW_H } : {}),
                    }}>{exprs[i]}</span>
                    <div style={{
                        display: 'flex', flexDirection: 'column', gap: `${gap * 0.8}px`,
                        ...(stretch ? { flex: 1, minWidth: 0 } : {}),
                    }}>
                        {Array.from({ length: stepCount }).map((_, s) => (
                            <div key={s} style={{
                                display: 'flex', gap: '8px', width: '100%',
                                ...(layout === 'stepped'
                                    ? { alignItems: 'flex-end', height: ANSWER_ROW_H }
                                    : { alignItems: 'baseline' }),
                            }}>
                                <span style={{ flexShrink: 0 }}>=</span>
                                {(s === 0 && showSolutions)
                                    ? <span style={{ ...solutionText, minWidth: `${LINE_PX}px`, textAlign: 'center' }}>{formatMathNumber(ex.answer)}</span>
                                    : answerLine}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        />
    );
}
