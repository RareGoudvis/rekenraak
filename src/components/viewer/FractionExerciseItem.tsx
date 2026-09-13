import type { FractionExercise, MathBlock } from '../../services/math/types';
import FractionShapeSVG from './FractionShapeSVG';
import VerticalFraction from './VerticalFraction';
import type { FractionConstraints } from '../../services/math/constraintTypes';
import { SOL, solutionText } from './solutionStyle';
import { SHAPE_BUDGET_AT_DEFAULT, PX_PER_EM_AT_DEFAULT } from './FractionShapeSVG';
import { useSheetSizePx, ANSWER_LINE_H } from './BlockWidthContext';

// Object geometry is written as px at the 13pt default and emitted as em, so the drawn
// hoeveelheid objects follow the Lettergrootte slider.
const em = (px: number): string => `${px / PX_PER_EM_AT_DEFAULT}em`;

interface Props {
    ex: FractionExercise;
    block: MathBlock;
    showSolutions: boolean;
    // Printable width of the grid column this item lands in — the figure caps its own
    // font-size against it (FractionViewer computes it from the block width).
    columnWidth: number;
}

// Object row sizes for the concreet variant. Easier grouping helps starters see the parts.
// - standaard:   rows of 10 (the original fixed layout)
// - gebalanceerd: equal rows, perRow ≤ 10, fewest rows first (18 → 2×9, 24 → 3×8)
// - per-deel:    `denominator` equal rows, so each row is one whole share
// All mono/digit text below is a factor of --sheet-size-math (VerticalFraction's own
// numeric fontSize prop is unchanged — it converts itself to the same token internally).
function groupRows(total: number, denominator: number, mode: string): number[] {
    if (total <= 0) return [];
    if (mode === 'per-deel' && denominator > 0 && total % denominator === 0) {
        return Array(denominator).fill(total / denominator);
    }
    if (mode === 'gebalanceerd') {
        for (let rows = 1; rows <= total; rows++) {
            if (total % rows === 0 && total / rows <= 10) return Array(rows).fill(total / rows);
        }
    }
    // standaard (and fallback): rows of up to 10
    const perRow = 10;
    return Array.from({ length: Math.ceil(total / perRow) }, (_, r) => Math.min(perRow, total - r * perRow));
}

export default function FractionExerciseItem({ ex, block, showSolutions, columnWidth }: Props) {
    const subType = ex.subType;
    const c = block.constraints as FractionConstraints;
    const answerFormat: string = c.answerFormat || 'fraction-questions';
    const sheetSizePx = useSheetSizePx('math');
    // A figure `figureUnits` wide at the 13pt default may only grow until it fills the
    // column; past that the slider would push it off the page instead of enlarging it.
    const figureFont = (figureUnits: number): React.CSSProperties =>
        ({ fontSize: `${Math.min(sheetSizePx, (columnWidth / Math.max(1, figureUnits)) * PX_PER_EM_AT_DEFAULT)}px` });
    const sol = (text: string) => <span style={{ ...solutionText, fontSize: 'calc(var(--sheet-size-math) * 0.81)' }}>{text}</span>;
    const blank = (w = 40) => <div style={{ borderBottom: '1.5px solid #000', width: `${w}px`, height: ANSWER_LINE_H, display: 'inline-block', margin: '0 2px' }} />;

    const vertFrac = (n: number, d: number, color?: string) => (
        <VerticalFraction value={{ n, d }} color={color} fontSize={13} mono />
    );

    // ── SHAPE-BASED (kleuren / herkennen) ────────────────────────────────────
    if (subType === 'kleuren' || subType === 'herkennen') {
        const showColored = subType === 'herkennen';
        // Static size: keep the shape a fixed cm size across denominators. 1cm ≈ 37.8px @96dpi.
        const CM = 37.8;
        const staticProps = c.staticSize ? {
            fixedWidthPx: (c.staticW ?? 4) * CM,
            fixedHeightPx: (c.staticH ?? 3) * CM,
            fixedSidePx: (c.staticSide ?? 4) * CM,
            fixedDiameterPx: (c.staticDiam ?? 4) * CM,
        } : {};
        // Cap the shape at the 2-up column budget (units at the 13pt default; the em box
        // scales it) so prime denominators that only render as a 1×d strip (7, 11, 13)
        // shrink their cells instead of running off the page; grids ≤ 6 columns keep the
        // classic 38px cell. SYNC: FractionViewer sizes its columns from the same budget.
        const gridCols = ex.gridCols ?? ex.denominator;
        const cappedCell = Math.min(38, Math.floor(SHAPE_BUDGET_AT_DEFAULT / Math.max(1, gridCols)));
        // When width-capped, pin the height back to the classic 38px per row so narrow
        // strip cells stay tall enough to color in.
        const heightProp = cappedCell < 38 && !c.staticSize
            ? { fixedHeightPx: 38 * (ex.gridRows ?? 1) } : {};
        // What the SVG below draws, in viewBox units: a circle adds its 6px margin twice.
        const shapeUnitsW = ex.shape === 'circle' ? (staticProps.fixedDiameterPx ?? 88) + 12
            : ex.shape === 'square' ? (staticProps.fixedSidePx ?? 90)
            : (staticProps.fixedWidthPx ?? gridCols * cappedCell);
        const shape = (
            <FractionShapeSVG
                numerator={ex.numerator} denominator={ex.denominator}
                shape={ex.shape ?? 'rectangle'} coloredIndices={ex.coloredIndices ?? []}
                gridRows={ex.gridRows ?? 1} gridCols={gridCols}
                showColored={showColored} cellSize={cappedCell}
                physicalSize={!!c.staticSize}
                style={c.staticSize ? undefined : figureFont(shapeUnitsW)}
                {...heightProp}
                {...staticProps}
            />
        );

        if (subType === 'kleuren') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace', fontWeight: 'normal' }}>
                        <span>Kleur</span>
                        {vertFrac(ex.numerator, ex.denominator)}
                        <span>in:</span>
                    </div>
                    <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shape}
                    </div>
                </div>
            );
        }

        // herkennen — build answer area based on format
        let answerArea: React.ReactNode;
        if (answerFormat === 'fraction-questions') {
            const qLine = (text: string, answer: React.ReactNode) => (
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '4px' }}>
                    <span>{text}</span>
                    {answer}
                </div>
            );
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <div style={{ minHeight: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {shape}
                    </div>
                    <div style={{ fontSize: 'calc(var(--sheet-size-math) * 0.7)', fontFamily: 'Azeret Mono, monospace', width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {qLine('In hoeveel gelijke delen is de figuur verdeeld?', showSolutions ? sol(String(ex.denominator)) : blank(28))}
                        {qLine('Hoeveel gelijke delen zijn ingekleurd?', showSolutions ? sol(String(ex.numerator)) : blank(28))}
                    </div>
                </div>
            );
        } else if (answerFormat === 'phrase') {
            answerArea = (
                <div style={{ fontSize: 'calc(var(--sheet-size-math) * 0.7)', fontFamily: 'Azeret Mono, monospace', lineHeight: '2', marginTop: '6px' }}>
                    <div>
                        Er zijn {showSolutions ? sol(String(ex.numerator)) : <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: '24px' }}>&nbsp;</span>} van de{' '}
                        {ex.denominator} gelijke delen gekleurd. Dat is{' '}
                        {showSolutions ? vertFrac(ex.numerator, ex.denominator, SOL)
                            : <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: 'calc(var(--sheet-size-math) * 0.75)', verticalAlign: 'middle' }}>
                                <div style={{ borderBottom: '1.5px solid #000', minWidth: '24px', height: ANSWER_LINE_H }} />
                                <div style={{ minWidth: '24px', height: ANSWER_LINE_H }} />
                              </div>
                        }.
                    </div>
                </div>
            );
        } else if (answerFormat === 'blank-fraction') {
            answerArea = (
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px', fontSize: 'calc(var(--sheet-size-math) * 1.15)', fontFamily: 'Azeret Mono, monospace', fontWeight: 'normal' }}>
                    <div style={{ borderBottom: '2px solid #000', minWidth: '32px', textAlign: 'center', paddingBottom: '2px', color: showSolutions ? SOL : 'transparent' }}>{ex.numerator}</div>
                    <div style={{ minWidth: '32px', textAlign: 'center', paddingTop: '2px', color: showSolutions ? SOL : 'transparent' }}>{ex.denominator}</div>
                </div>
            );
        } else {
            answerArea = <div style={{ marginTop: '8px' }}>{showSolutions ? sol(`${ex.numerator}/${ex.denominator}`) : blank(80)}</div>;
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', width: '100%' }}>
                {shape}
                {answerArea}
            </div>
        );
    }

    // ── AMOUNT CONCREET (hoeveelheid) ───────────────────────────────────────
    if (subType === 'hoeveelheid') {
        const total = ex.total ?? 0;
        const coloredCount = Math.round(total * ex.numerator / ex.denominator);
        const objSize = 22, objGap = 4;
        const groupingMode: string = c.groupingMode ?? 'standaard';
        // Row sizes (objects per row) drive how objects group — easier grouping helps starters.
        const rowSizes = groupRows(total, ex.denominator, groupingMode);

        const objEl = (idx: number, colored: boolean) => ex.objectShape === 'circle'
            ? <svg key={idx} width={em(objSize)} height={em(objSize)} viewBox={`0 0 ${objSize} ${objSize}`}><circle cx={objSize/2} cy={objSize/2} r={objSize/2-1.5} fill={colored ? '#93c5fd' : 'white'} stroke="#000" strokeWidth={1.5}/></svg>
            : <svg key={idx} width={em(objSize)} height={em(objSize)} viewBox={`0 0 ${objSize} ${objSize}`}><rect x={1.5} y={1.5} width={objSize-3} height={objSize-3} fill={colored ? '#93c5fd' : 'white'} stroke="#000" strokeWidth={1.5}/></svg>;

        const simpleGrid = (
            // One font-size wrapper per figure: the object svgs and the gaps between them are
            // em, so the whole hoeveelheid grid scales as a unit with the sheet font.
            <div style={{ display: 'flex', flexDirection: 'column', gap: em(objGap), ...figureFont(Math.max(...rowSizes, 1) * (objSize + objGap) - objGap) }}>
                {rowSizes.map((n, r) => {
                    const start = rowSizes.slice(0, r).reduce((a, b) => a + b, 0);
                    return (
                        <div key={r} style={{ display: 'flex', gap: em(objGap) }}>
                            {Array.from({ length: n }, (_, c) => {
                                const idx = start + c;
                                return objEl(idx, showSolutions && idx < coloredCount);
                            })}
                        </div>
                    );
                })}
            </div>
        );

        // Unified task line across all concreet scaffolds (no "van deze hoeveelheid").
        const taskLine = (
            <div style={{ fontSize: 'calc(var(--sheet-size-math) * 0.7)', fontFamily: 'Azeret Mono, monospace', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Verdeel en kleur</span>{vertFrac(ex.numerator, ex.denominator)}
            </div>
        );

        const fracLabel = (
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontSize: 'calc(var(--sheet-size-math) * 0.81)', fontFamily: 'Azeret Mono, monospace', lineHeight: 1.2 }}>
                <span style={{ borderBottom: '1.5px solid #000', minWidth: '18px', textAlign: 'center', paddingLeft: '4px', paddingRight: '4px' }}>{ex.numerator}</span>
                <span style={{ minWidth: '18px', textAlign: 'center', paddingLeft: '4px', paddingRight: '4px' }}>{ex.denominator}</span>
            </div>
        );

        const questionLine = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'calc(var(--sheet-size-math) * 0.81)', fontFamily: 'Azeret Mono, monospace' }}>
                {fracLabel}<span>van {total} =</span>{showSolutions ? sol(String(coloredCount)) : blank()}
            </div>
        );

        const gridWrap = (
            <div style={{ minHeight: '52px', display: 'flex', alignItems: 'center' }}>
                {simpleGrid}
            </div>
        );

        if (answerFormat === 'met-hulp') {
            // One grid for the figure and both calc rows: the figure spans all 5 columns,
            // then each calc line's cells land in those same 5 columns (a fragment's
            // children become direct grid items, no wrapper element) — so the two "="
            // signs share a column and line up instead of drifting with each row's
            // differently-sized blanks. rowGap follows the block's own spacing setting
            // rather than a fixed 4px, like the rest of the sheet.
            const gap = block.verticalSpacing || 14;
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, auto)', columnGap: '3px', rowGap: `${Math.min(gap, 10)}px`, alignItems: 'center', width: '100%' }}>
                    <div style={{ gridColumn: '1 / -1' }}>{taskLine}</div>
                    <div style={{ gridColumn: '1 / -1', minHeight: '52px', display: 'flex', alignItems: 'center' }}>{simpleGrid}</div>
                    {blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}
                    {blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}
                </div>
            );
        }

        if (answerFormat === 'met-breukvragen') {
            const qRow = (question: string, answer: React.ReactNode) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <div style={{ fontWeight: 'normal', fontSize: 'calc(var(--sheet-size-math) * 0.64)', fontFamily: 'Azeret Mono, monospace', width: '195px', flexShrink: 0 }}>{question}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace' }}>{answer}</div>
                </div>
            );
            return (
                <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                    <div style={{ flexShrink: 0 }}>
                        {taskLine}
                        {gridWrap}
                    </div>
                    <div style={{ flex: 1, marginTop: '18px' }}>
                        {qRow('Hoe groot is het geheel?', blank())}
                        {qRow('In hoeveel gelijke delen verdeel ik?', blank())}
                        {qRow('Hoe groot is één deel?', <>{blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}</>)}
                        {qRow('Hoeveel gelijke delen neem ik?', blank())}
                        {qRow('Hoeveel is dat samen?', <>{blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}</>)}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace', marginTop: '4px' }}>
                            {showSolutions ? vertFrac(ex.numerator, ex.denominator, SOL) : vertFrac(ex.numerator, ex.denominator)}
                            <span> van </span>{blank(28)}<span> is </span>{blank(28)}
                        </div>
                    </div>
                </div>
            );
        }

        // zonder-hulp: same task as met-hulp + grid + blank working lines
        return (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                {taskLine}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '52px' }}>
                    {simpleGrid}
                </div>
                {questionLine}
                <div style={{ borderBottom: '1.5px solid #000', width: '100%', height: ANSWER_LINE_H }} />
                <div style={{ borderBottom: '1.5px solid #000', width: '100%', height: ANSWER_LINE_H }} />
            </div>
        );
    }

    // ── AMOUNT RECHTHOEK (hoeveelheid-rechthoek) ─────────────────────────────
    if (subType === 'hoeveelheid-rechthoek') {
        const total = ex.total ?? 0;
        const rectCalcLines = (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace', marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(28)}<span>:</span>{blank(24)}<span>=</span>{blank(28)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {blank(24)}<span>×</span>{blank(28)}<span>=</span>{blank(28)}
                </div>
            </div>
        );
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-math) * 0.81)', fontFamily: 'Azeret Mono, monospace' }}>
                    {vertFrac(ex.numerator, ex.denominator)}<span> van {total} =</span>{blank()}
                </div>
                {/* Draw box sized to handwriting needs. 1cm ≈ 37.8px; default ≈ 3cm (≈113px). */}
                <div style={{
                    border: '2px solid #000',
                    width: c.drawBoxW ? `${c.drawBoxW * 37.8}px` : '100%',
                    minHeight: `${(c.drawBoxH ?? 3) * 37.8}px`,
                    backgroundColor: 'white',
                }} />
                {answerFormat === 'met-berekening' && rectCalcLines}
            </div>
        );
    }

    // ── AMOUNT ABSTRACT (hoeveelheid-abstract) ───────────────────────────────
    if (subType === 'hoeveelheid-abstract') {
        const total = ex.total ?? 0;
        const groupSize = parseFloat((total / ex.denominator).toFixed(4));
        const coloredCount = parseFloat((groupSize * ex.numerator).toFixed(4));
        const answerMode: string = c.answerMode ?? 'berekeningslijnen';
        const sv = (v: number) => showSolutions ? sol(String(v)) : blank(28);

        const questionLine = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-math) * 0.81)', fontFamily: 'Azeret Mono, monospace', flexWrap: 'wrap' }}>
                {vertFrac(ex.numerator, ex.denominator)}<span> van {total} is</span>{showSolutions ? sol(String(coloredCount)) : blank(36)}
            </div>
        );

        if (answerMode === 'structuurlijnen') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {questionLine}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>:</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>×</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                    </div>
                </div>
            );
        }

        if (answerMode === 'blanco') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {questionLine}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: ANSWER_LINE_H }} />
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: ANSWER_LINE_H }} />
                    </div>
                </div>
            );
        }

        const calcRow = (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace', flexWrap: 'wrap' }}>
                {sv(total)}<span>:</span>{sv(ex.denominator)}<span>=</span>{sv(groupSize)}
                <span style={{ margin: '0 6px' }}>en</span>
                {sv(ex.numerator)}<span>×</span>{sv(groupSize)}<span>=</span>{showSolutions ? sol(String(coloredCount)) : blank(28)}
            </div>
        );
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {questionLine}
                {calcRow}
            </div>
        );
    }

    // ── LIJNSTUK ─────────────────────────────────────────────────────────────
    if (subType === 'lijnstuk') {
        const cm = ex.lineLength ?? 10;
        const answerMode: string = c.answerMode ?? 'berekeningslijnen';
        const partLength = parseFloat((cm / ex.denominator).toFixed(2));
        const arcLength  = parseFloat((partLength * ex.numerator).toFixed(2));

        // To-scale (1cm = 38px) until it would eat more than half the column, at which
        // point it caps there and is a drawn line to a REDUCED scale rather than to true
        // size — a 15cm segment in a 163px quarter cell can't be both to-scale and legible.
        const lineWidth = Math.min(cm * 38, columnWidth * 0.5);

        // Borders (not background-color) so the segment line always prints, even with
        // the print dialog's "Background graphics" off.
        const lineEl = (
            <div style={{ width: `${lineWidth}px`, display: 'flex', alignItems: 'center', margin: '10px 0' }}>
                <div style={{ width: 0, height: '16px', borderLeft: '2px solid #000' }} />
                <div style={{ flex: 1, height: 0, borderTop: '2px solid #000' }} />
                <div style={{ width: 0, height: '16px', borderLeft: '2px solid #000' }} />
            </div>
        );

        const instructions = (
            <div style={{ fontSize: 'calc(var(--sheet-size-math) * 0.7)', fontFamily: 'Azeret Mono, monospace', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span>Verdeel het lijnstuk in gelijke delen.</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Teken een boogje boven{' '}
                    <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}>{vertFrac(ex.numerator, ex.denominator)}</span>
                    {' '}van het lijnstuk.
                </span>
            </div>
        );

        if (answerMode === 'structuurlijnen') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {instructions}
                    {lineEl}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>:</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace' }}>
                            {blank(56)}<span>×</span>{blank(56)}<span>=</span>{blank(72)}
                        </div>
                    </div>
                </div>
            );
        }

        if (answerMode === 'blanco') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {instructions}
                    {lineEl}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: ANSWER_LINE_H }} />
                        <div style={{ borderBottom: '1.5px solid #000', width: '227px', height: ANSWER_LINE_H }} />
                    </div>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                {instructions}
                {lineEl}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {showSolutions ? sol(String(cm)) : blank(28)}<span>cm</span><span>:</span>{showSolutions ? sol(String(ex.denominator)) : blank(24)}<span>=</span>{showSolutions ? sol(String(partLength)) : blank(28)}<span>cm</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {showSolutions ? sol(String(ex.numerator)) : blank(24)}<span>×</span>{showSolutions ? sol(String(partLength)) : blank(28)}<span>cm</span><span>=</span>{showSolutions ? sol(String(arcLength)) : blank(28)}<span>cm</span>
                    </div>
                </div>
            </div>
        );
    }

    // ── VEELHOEK ─────────────────────────────────────────────────────────────
    if (subType === 'veelhoek') {
        const w = ex.rectangleWidth ?? 3;
        const h = ex.rectangleHeight ?? 3;
        // Grid off → hide internal cell lines, keep outline + colored region, cells of 1cm (≈37.8px).
        const showGrid = c.showGrid !== false;
        const cellSize = showGrid ? 32 : 37.8;
        const totalCells = w * h;
        const cellsPerPart = totalCells / ex.denominator;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                <div style={{ fontSize: 'calc(var(--sheet-size-math) * 0.75)', fontFamily: 'Azeret Mono, monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Verdeel en kleur <span style={{ display: 'inline-flex' }}>{vertFrac(ex.numerator, ex.denominator)}</span> van deze figuur.
                </div>
                <div style={{ outline: '3px solid #000', width: 'fit-content' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${w}, ${cellSize}px)` }}>
                        {Array.from({ length: totalCells }, (_, i) => (
                            <div key={i} style={{
                                width: `${cellSize}px`, height: `${cellSize}px`,
                                border: showGrid ? '0.5px solid #93c5fd' : 'none', boxSizing: 'border-box',
                                backgroundColor: showSolutions && i < cellsPerPart * ex.numerator ? '#93c5fd' : 'white',
                            }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return <></>;
}
