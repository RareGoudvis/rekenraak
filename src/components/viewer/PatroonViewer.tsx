import type { MathBlock, PatroonExercise } from '../../services/math/types';
import { formatMathNumber, formatSignedInt } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';
import { OP_GLYPH as SYM } from '../../services/math/formatters';
import type { PatroonConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';
import { ANSWER_LINE_H, useBlockWidth, useSheetSizePx } from './BlockWidthContext';
import { monoTextPx } from '../../services/layout/blockLayout';
import KioskCell from './KioskCell';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
// Term font steps: the default 1.04, then smaller until the row fits its column. 0.7 (12px)
// is the legibility floor; a row that does not fit even then wraps onto a second line.
const TERM_FACTORS = [1.04, 0.92, 0.8, 0.7];
const COL_GAP_PX = 2;
// The blank under a term: 46px at the default term font, shrinking with the font steps.
const BLANK_PX = 46;
// The connector glyph is 0.92 of the token next to 1.04 terms; it steps down with them.
const GLYPH_RATIO = 0.92 / 1.04;
// Sizes below are factors of the sheet tokens (--sheet-size-math / --sheet-size-text) so print scales with the docSettings sliders.

export default function PatroonViewer({ block, showSolutions }: Props) {
    // A chain of five numbers laid out left to right needs ~300px, which is why C1 step 0
    // floors getalpatronen/kettingsommen at a half column (326px) — the vertical fallback
    // this used to grow below 200px (a quarter, 163px) can no longer be reached.
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
    const width = useBlockWidth();
    const mathPx = useSheetSizePx('math');

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Nog geen oefeningen — klik Genereer)</div>;
    }

    const opText = (ex: PatroonExercise, i: number) => {
        const step = ex.cycle[i % ex.cycle.length];
        const sym = SYM[step.op] ?? step.op;
        return operatorStyle === 'full' ? `${sym}${formatMathNumber(step.operand)}` : sym;
    };

    // Negative terms read as "-53 – -43" next to a dash, so a block with a negative term
    // separates with the Dutch list separator ";" (as ordenen does) and prints a true minus.
    const negatives = exercises.some(ex => ex.values.some(v => v < 0));
    const fmt = (v: number) => formatSignedInt(v);
    const sep = showArrows ? '→' : negatives ? ';' : '–';
    // Every term column holds the widest term (or blank) in that position across the block on
    // one line, so columns still align across rows; the font steps down until the whole row
    // fits the column it is in.
    const nVals = Math.max(1, ...exercises.map(ex => ex.values.length));
    const opChars = Math.max(1, ...exercises.flatMap(ex => ex.cycle.map((_, i) => opText(ex, i).length)));
    const blankPxAt = (f: number) => Math.round(BLANK_PX * f / TERM_FACTORS[0]);
    const connPxAt = (f: number) => Math.ceil(Math.max(monoTextPx(1, f * GLYPH_RATIO, mathPx), stacked ? Math.max(showArrows ? 26 : 0, monoTextPx(opChars, 0.7, mathPx)) : 0)) + 2;
    // A blank position needs its writing line as well as the answer it may show, whatever
    // Toon oplossingen says, so the layout does not jump when the key is switched on.
    const termPxAt = (f: number, i: number) => Math.ceil(Math.max(monoTextPx(2, f, mathPx), ...exercises.map(ex => {
        const v = ex.values[i];
        if (v === undefined) return 0;
        const text = monoTextPx(fmt(v).length, f, mathPx);
        return ex.blankMask[i] ? Math.max(text, blankPxAt(f)) : text;
    }))) + 1;
    const rowPxAt = (f: number) => Array.from({ length: nVals }, (_, i) => termPxAt(f, i)).reduce((a, b) => a + b, 0)
        + (nVals - 1) * connPxAt(f) + (2 * nVals - 2) * COL_GAP_PX;
    const fitting = TERM_FACTORS.find(f => rowPxAt(f) <= width);
    const factor = fitting ?? TERM_FACTORS[TERM_FACTORS.length - 1];
    const connPx = connPxAt(factor), blankPx = blankPxAt(factor);
    // Even the 0.7 floor too wide (ten 8-glyph terms): the chain wraps after a dash, every line
    // `perLine` terms of the block's widest term column, instead of running off the page.
    const widestTermPx = Math.max(...Array.from({ length: nVals }, (_, i) => termPxAt(factor, i)));
    const perLine = fitting ? nVals : Math.max(2, Math.floor((width + COL_GAP_PX) / (widestTermPx + connPx + 2 * COL_GAP_PX)));
    const columns = (n: number) => perLine < n
        ? `repeat(${perLine}, minmax(${widestTermPx}px, 1fr) minmax(${connPx}px, 1fr))`
        : Array.from({ length: n * 2 - 1 }, (_, i) => `minmax(${i % 2 === 0 ? termPxAt(factor, i / 2) : connPx}px, 1fr)`).join(' ');

    return (
        <FragmentableGrid
            cols={1}
            // The term font follows useBlockWidth, so the full-width probe is an allowance.
            shrinks
            rowGap={gap + 6}
            items={exercises.map(ex => {
                // Alternating number / connector cells in equal (1fr) columns over a per-block floor → all rows align.
                const cells: React.ReactNode[] = [];
                // Oefenmodus: a blank's cell is as wide as the row's longest GIVEN value plus one character (never the answer's own width).
                const cellEm = `${(Math.max(2, ...ex.values.filter((_, i) => !ex.blankMask[i]).map(v => fmt(v).length)) + 1) * 0.62 + 0.4}em`;
                ex.values.forEach((v, i) => {
                    cells.push(
                        <div key={`n${i}`} style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {ex.blankMask[i]
                                ? (showSolutions ? <span style={{ ...solutionText }}>{fmt(v)}</span>
                                    : <KioskCell cellKey={`v${i}`} style={{ width: cellEm, height: 'max(32px, 1.7em)' }}><span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: `${blankPx}px`, height: ANSWER_LINE_H }} /></KioskCell>)
                                : fmt(v)}
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
                        cells.push(
                            <div key={`c${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', fontSize: 'calc(var(--sheet-size-math) * 0.7)' }}>
                                {stacked && <span style={{ height: '15px', display: 'flex', alignItems: 'flex-end' }}>{top}</span>}
                                <span style={{ fontSize: `calc(var(--sheet-size-math) * ${(factor * GLYPH_RATIO).toFixed(3)})`, lineHeight: 1 }}>{sep}</span>
                            </div>
                        );
                    }
                });
                return (
                    <div key={ex.id} className="print-exercise" style={{
                        display: 'grid', gridTemplateColumns: columns(ex.values.length),
                        alignItems: 'end', columnGap: `${COL_GAP_PX}px`, fontFamily: mono, fontSize: `calc(var(--sheet-size-math) * ${factor})`,
                    }}>
                        {cells}
                    </div>
                );
            })}
        />
    );
}
