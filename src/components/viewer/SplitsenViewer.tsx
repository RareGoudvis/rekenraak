import type { MathBlock, SplitsenExercise } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import { useBlockWidth, fitCols, ANSWER_LINE_H, useSheetSizePx } from './BlockWidthContext';
import { formatMathNumber } from '../../services/math/formatters';
import type { SplitsenConstraints } from '../../services/math/constraintTypes';
import { solutionText } from './solutionStyle';
import { monoTextPx, MONO_ADVANCE_EM } from '../../services/layout/blockLayout';

// Every printed digit/mono size below is a factor of --sheet-size-math (the empty-state
// placeholder is screen-only chrome and stays a fixed px).
// Thousands-spaces + comma decimals (nl-BE).
const fmt = (n: number): string => formatMathNumber(n);
// A place's value as a clean string (e.g. tienden digit 3 → "0,3"), rounded against float drift.
const placeValueStr = (digit: number, weight: number): string => formatMathNumber(Math.round(digit * weight * 1e6) / 1e6);

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

export default function SplitsenViewer({ block, showSolutions }: Props) {
    const c = block.constraints as SplitsenConstraints;
    const layout: string = c.layout || 'basic';
    const exercises: SplitsenExercise[] = block.splitsenExercises || [];
    const gap = block.verticalSpacing || 14;
    // Column counts follow the cell width (¼ stacks 1-up), never a fixed 2/4/5-up grid.
    const availableWidth = useBlockWidth();
    const mathPx = useSheetSizePx('math');
    const rowHeight: number = c.rowHeight || 28;

    if (exercises.length === 0) {
        return (
            <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>
                (Nog geen oefeningen — klik Genereer)
            </div>
        );
    }

    if (layout === 'basic') {
        // itemMinPx scales with the widest value in the block (two pair-cells side by side)
        // instead of a flat 160 — a bigger maxGetal (more digits) still fits exactly the
        // preferred column count instead of silently cramming in one extra per row.
        // Coefficients tuned so chars=2 (the common 1–10/1–20 case) gives ~149px: four fit
        // the ~670px full cell (160 just missed and left the row 3-up), two a half, one a
        // quarter; wider values grow it per extra digit.
        const chars = Math.max(2, ...exercises.flatMap(ex => [ex.total, ...ex.pairs.flatMap(p => [p.given, p.answer])]).map(v => fmt(v).length));
        const itemMinPx = Math.round((chars * 0.9 + 2.5) * 2 * mathPx);
        // preferred stays a flat 4 (not capped to exercises.length): width alone decides how
        // many fit per row, so a short block (few exercises) doesn't fall back to fewer, wider
        // 1fr tracks that stretch its boxes — full → 4-up, half → 2-up, quarter → 1-up.
        const cols = fitCols(availableWidth, itemMinPx, 4, gap);
        return (
            <FragmentableGrid
                cols={cols}
                columnGap={gap}
                rowGap={gap}
                items={exercises.map(ex => (
                    <BasicBox key={ex.id} ex={ex} showSolutions={showSolutions} rowHeight={rowHeight} />
                ))}
            />
        );
    }

    if (layout === 'splitsboom') {
        // One box width for the whole block (not per-exercise) so every tree in the block
        // lines up; sized to the WIDEST value anywhere in it rather than a flat 46px, which
        // clipped once numbers grew past two digits.
        const chars = Math.max(2, ...exercises.flatMap(ex => [ex.total, ex.pairs[0]?.given ?? 0, ex.pairs[0]?.answer ?? 0]).map(v => fmt(v).length));
        const boxWidthEm = chars * 0.62 + 0.8;
        const boxMinWidth = `max(46px, calc(${boxWidthEm.toFixed(2)} * var(--sheet-size-math)))`;
        // fitCols needs the tree's REAL rendered width (two boxes + the 18px inner gap), not
        // a flat guess — otherwise a block with big numbers keeps too many trees per row and
        // the sheet shows the "Verklein om te passen" overflow banner instead of wrapping.
        const boxMinWidthPx = Math.max(46, boxWidthEm * mathPx);
        const itemMinPx = boxMinWidthPx * 2 + 18;
        const cols = fitCols(availableWidth, itemMinPx, Math.min(exercises.length, 4), gap + 10);
        return (
            <FragmentableGrid
                cols={cols}
                columnGap={gap + 10}
                rowGap={gap + 14}
                items={exercises.map(ex => (
                    <SplitsboomItem key={ex.id} ex={ex} showSolutions={showSolutions} boxMinWidth={boxMinWidth} />
                ))}
            />
        );
    }

    if (layout === 'mathematic') {
        const allItems = exercises.flatMap(ex =>
            ex.pairs.map((p, i) => ({ ...p, total: ex.total, uid: `${ex.id}-${i}` }))
        );
        return (
            <FragmentableGrid
                cols={fitCols(availableWidth, 150, 2, gap)}
                columnGap={gap}
                rowGap={gap}
                items={allItems.map(item => (
                    <MathematicRow
                        key={item.uid}
                        total={item.total}
                        given={item.given}
                        answer={item.answer}
                        showSolutions={showSolutions}
                    />
                ))}
            />
        );
    }

    if (layout === 'verliefde-harten') {
        const allItems = exercises.flatMap(ex =>
            ex.pairs.map((p, i) => ({ ...p, total: ex.total, uid: `${ex.id}-${i}` }))
        );
        // Fixed grid (not flex-wrap) so screen and the narrower print body share the
        // same column count — otherwise print bumps the last heart to a new row.
        // 5-up: 5 × 120px hearts ≈ the full printable width (~625px), no dead right margin.
        // justifyItems: 'center' used to inflate the min-content probe to the grid CELL's
        // width rather than the heart's own 120px, which pinned this to a wider tier than
        // one heart actually needs.
        return (
            <FragmentableGrid
                cols={fitCols(availableWidth, 120, Math.min(allItems.length, 5), gap)}
                columnGap={gap}
                rowGap={gap}
                items={allItems.map(item => (
                    <HeartItem
                        key={item.uid}
                        pairId={item.uid}
                        total={item.total}
                        given={item.given}
                        answer={item.answer}
                        showSolutions={showSolutions}
                    />
                ))}
            />
        );
    }

    if (layout === 'positie-benen') {
        // The legs fan out from a single point, so the item's real width scales with
        // maxGetal's place count (PositieBenenItem: W = max(120, places * 56)) — the
        // itemMinPx fed to fitCols has to track that or a wide item gets squeezed 2-up.
        const maxGetal = c.maxGetal ?? 1000;
        const [itemMinPx, preferred] = maxGetal <= 100 ? [120, 4] : maxGetal <= 1000 ? [170, 2] : [330, 2];
        // Past a million the legs' real width (from each exercise's own labels) outgrows the table above.
        const geoms = exercises.map(ex => benenGeometry(ex, mathPx, availableWidth));
        const widest = Math.max(itemMinPx, ...geoms.map(g => g.W));
        return (
            <FragmentableGrid cols={fitCols(availableWidth, widest, preferred, gap)} columnGap={gap} rowGap={gap + 10}
                items={exercises.map((ex, i) => <PositieBenenItem key={ex.id} ex={ex} showSolutions={showSolutions} geom={geoms[i]} />)} />
        );
    }

    if (layout === 'positie-tabel') {
        return (
            <FragmentableGrid cols={1} rowGap={gap + 6}
                items={exercises.map(ex => <PositieTabelItem key={ex.id} ex={ex} showSolutions={showSolutions} availableWidth={availableWidth} mathPx={mathPx} />)} />
        );
    }

    if (layout === 'positie-math') {
        // 1-up (was a hardcoded 2): the term chain wraps at `flexWrap: 'wrap'` inside
        // PositieMathRow, so two per row left uneven, overlapping wraps in a narrow column.
        // One left-column width for the whole block so "=" lands at the same x on every row
        // (decompose: the number; compose: the term chain) instead of tracking each row's
        // own content width.
        const leftText = (ex: SplitsenExercise) => {
            if (ex.mathDirection !== 'compose') return fmt(ex.total);
            const raw = ex.placeBreakdown || [];
            const places = ex.placeOrder ? ex.placeOrder.map(k => raw.find(p => p.key === k)).filter((p): p is NonNullable<typeof p> => !!p) : raw;
            const letters = ex.mathForm === 'letters';
            return places.map(p => letters ? `${p.digit}${p.key}` : placeValueStr(p.digit, p.weight)).join(' + ');
        };
        const chars = Math.max(1, ...exercises.map(ex => leftText(ex).length));
        // 0.62em + 0.4 covers up to ~7 glyphs; past that the real 1.04 × 0.65em advance wins, or a
        // million-sized number would overhang its right-aligned column on the left.
        const estEm = chars * 0.62 + 0.4;
        const realEm = chars * MONO_ADVANCE_EM * 1.04;
        const colEm = Math.max(estEm, realEm);
        const estimate = realEm > estEm ? `calc(${realEm.toFixed(3)} * var(--sheet-size-math))` : `calc(${estEm.toFixed(2)} * var(--sheet-size-math))`;
        // A compose chain of nine million-sized terms is wider than the page: cap the column so
        // the chain wraps inside it and leaves the result (or, in 'beide', the other side's
        // chain) room. 32px is the "=" slot plus its two 6px gaps.
        const resultPx = Math.max(60, ...exercises.map(ex => monoTextPx(fmt(ex.total).length, 1.04, mathPx)));
        const capPx = Math.floor(Math.min(availableWidth - 32 - resultPx, availableWidth * 0.6));
        const leftColWidth = colEm * mathPx > capPx ? `min(${estimate}, ${capPx}px)` : estimate;
        return (
            <FragmentableGrid cols={1} columnGap={gap + 20} rowGap={gap + 4}
                items={exercises.map(ex => <PositieMathRow key={ex.id} ex={ex} showSolutions={showSolutions} leftColWidth={leftColWidth} />)} />
        );
    }

    return null;
}

// ── Place-value: blank vs solution helpers ────────────────────────────────────

const blankLine = (w = 44) => <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: `${w}px`, height: ANSWER_LINE_H }} />;

// ── Place-value: splitsbenen (legs) ───────────────────────────────────────────

type BenenGeometry = { W: number; slot: number | null; stagger: boolean; rowPx: number; pad: number };

// The width a splitsbenen item needs from its own labels. Up to a thousand every label fits the
// 56px slot and the old spaced-around row stands (slot null); a wider label gets a fixed slot per
// leg so each leg still ends at its label, and when even that is wider than the cell the labels
// alternate between two rows so neighbours only need half a slot each.
function benenGeometry(ex: SplitsenExercise, mathPx: number, availableWidth: number): BenenGeometry {
    const places = ex.placeBreakdown || [];
    const n = Math.max(1, places.length);
    const ch = monoTextPx(1, 1.04, mathPx);
    const asValue = ex.notation === 'value';
    // Widest label, blank or filled: value text vs its 40px line, or digit/24px line + 2px + key.
    const labelPx = Math.max(0, ...places.map(p => asValue
        ? Math.max(40, placeValueStr(p.digit, p.weight).length * ch)
        : Math.max(24, ch) + 2 + p.key.length * ch));
    const rowPx = Math.round(mathPx * 1.5);
    if (labelPx + 8 <= 56) return { W: Math.max(120, places.length * 56), slot: null, stagger: false, rowPx, pad: 0 };
    // A glyph of air either side: the thousands spaces inside "700 000" must not read as the gap between labels.
    const need = Math.ceil(labelPx + 2 * ch);
    const single = Math.max(120, n * need);
    if (single <= availableWidth || n < 3) return { W: single, slot: need, stagger: false, rowPx, pad: 0 };
    // Same-row neighbours sit two slots apart (8px of air keeps nine 100-million labels on a full
    // row); the end labels overhang their half slot, so the item is padded by that overhang.
    const half = Math.max(56, Math.ceil(labelPx / 2 + 4));
    const pad = Math.max(0, Math.ceil((labelPx - half) / 2));
    return { W: n * half + 2 * pad, slot: half, stagger: true, rowPx, pad };
}

function PositieBenenItem({ ex, showSolutions, geom }: { ex: SplitsenExercise; showSolutions: boolean; geom: BenenGeometry }) {
    const places = ex.placeBreakdown || [];
    const topBlank = ex.blankSide === 'top';
    const { W, stagger, rowPx, pad } = geom;
    const xs = places.map((_, i) => pad + ((i + 0.5) / places.length) * (W - 2 * pad));
    const asValue = ex.notation === 'value';
    const label = (p: { digit: number; key: string; weight: number }) => {
        const shown = asValue ? placeValueStr(p.digit, p.weight) : String(p.digit);
        return (
            <>
                {topBlank
                    ? <span style={{ fontWeight: 'normal' }}>{shown}</span>
                    : (showSolutions ? <span style={solutionText}>{shown}</span> : blankLine(asValue ? 40 : 24))}
                {!asValue && <span style={{ fontWeight: 'normal' }}>{p.key}</span>}
            </>
        );
    };
    // Odd legs of a staggered item drop straight down one label row further, in the gap between
    // two even labels, so no leg crosses a label on its way.
    const legEnd = (i: number) => 24 + (stagger && i % 2 === 1 ? rowPx : 0);
    const svgH = stagger ? 26 + rowPx : 26;

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: "'Azeret Mono', monospace", fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
            {/* top number */}
            <div style={{ height: '26px', display: 'flex', alignItems: 'center' }}>
                {topBlank
                    ? (showSolutions ? <span style={solutionText}>{fmt(ex.total)}</span> : blankLine(60))
                    : <span style={{ fontWeight: 'normal' }}>{fmt(ex.total)}</span>}
            </div>
            {stagger ? (
                <div style={{ position: 'relative', width: W, height: svgH + rowPx }}>
                    <svg width={W} height={svgH} style={{ display: 'block' }}>
                        {xs.map((x, i) => <polyline key={i} points={`${W / 2},2 ${x},24 ${x},${legEnd(i)}`} fill="none" stroke="#000" strokeWidth="1.5" />)}
                    </svg>
                    {places.map((p, i) => (
                        <div key={i} style={{ position: 'absolute', left: xs[i], top: legEnd(i) + 2, transform: 'translateX(-50%)', display: 'flex', alignItems: 'baseline', gap: '2px', whiteSpace: 'nowrap' }}>
                            {label(p)}
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    {/* legs */}
                    <svg width={W} height="26" style={{ display: 'block' }}>
                        {xs.map((x, i) => <line key={i} x1={W / 2} y1="2" x2={x} y2="24" stroke="#000" strokeWidth="1.5" />)}
                    </svg>
                    {/* place boxes — 'value' shows the whole value (30); 'letters' shows digit + key (3T) */}
                    <div style={{ display: 'flex', justifyContent: 'space-around', width: W }}>
                        {places.map((p, i) => (
                            <div key={i} style={geom.slot === null
                                ? { display: 'flex', alignItems: 'baseline', gap: '2px' }
                                : { display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '2px', width: geom.slot, whiteSpace: 'nowrap' }}>
                                {label(p)}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Place-value: positietabel (word → digit grid) ─────────────────────────────

// Break opportunities after each number-word morpheme: Dutch writes 999 999 as one 60-letter word.
const WORD_BREAKS = /(honderd|duizend|miljoen|miljard)/;

function PositieTabelItem({ ex, showSolutions, availableWidth, mathPx }: { ex: SplitsenExercise; showSolutions: boolean; availableWidth: number; mathPx: number }) {
    const cols = ex.placeBreakdown || [];
    // Only a word that cannot sit beside the table unbroken gets break points (and, past those,
    // any-letter breaks), so the width probe sees a column that can narrow instead of overflow.
    const longestWord = Math.max(0, ...(ex.words ?? '').split(' ').map(w => w.length));
    const breakWords = monoTextPx(longestWord, 0.92, mathPx) + 20 + cols.length * 42 > availableWidth;
    const words = breakWords
        ? (ex.words ?? '').split(new RegExp(WORD_BREAKS.source, 'g')).filter(Boolean).map((part, i) => <span key={i}>{part}{WORD_BREAKS.test(part) && <wbr />}</span>)
        : ex.words;
    const cell: React.CSSProperties = {
        border: '1px solid #000', width: '42px', height: '36px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: "'Azeret Mono', monospace", fontSize: 'calc(var(--sheet-size-math) * 0.92)', boxSizing: 'border-box',
    };
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', width: '100%' }}>
            {/* Word fills the left; tables pin to the far right so all line up with room to spare. */}
            <div style={{ flex: 1, minWidth: 0, fontFamily: "'Azeret Mono', monospace", fontSize: 'calc(var(--sheet-size-math) * 0.92)', ...(breakWords && { overflowWrap: 'anywhere' }) }}>{words}</div>
            <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex' }}>
                    {cols.map(p => <div key={p.key} style={{ ...cell, backgroundColor: '#f4cbb8', fontWeight: 'bold' }}>{p.key}</div>)}
                </div>
                <div style={{ display: 'flex' }}>
                    {cols.map(p => <div key={p.key} style={{ ...cell, ...solutionText }}>{showSolutions ? p.digit : ''}</div>)}
                </div>
            </div>
        </div>
    );
}

// ── Place-value: mathematical (letters / expanded × decompose / compose) ──────

function PositieMathRow({ ex, showSolutions, leftColWidth }: { ex: SplitsenExercise; showSolutions: boolean; leftColWidth: string }) {
    // mathOrder: 'gehusseld' shuffled the term order once at generation (ex.placeOrder);
    // 'volgorde' (no placeOrder) renders place-value order as generated.
    const raw = ex.placeBreakdown || [];
    const places = ex.placeOrder ? ex.placeOrder.map(k => raw.find(p => p.key === k)).filter((p): p is NonNullable<typeof p> => !!p) : raw;
    const letters = ex.mathForm === 'letters';
    const compose = ex.mathDirection === 'compose';

    const termGiven = (p: { digit: number; key: string; weight: number }) =>
        <span>{letters ? `${p.digit}${p.key}` : placeValueStr(p.digit, p.weight)}</span>;
    const termBlank = (p: { key: string }) =>
        showSolutions
            ? <span style={solutionText}>{letters ? `${(places.find(x => x.key === p.key)?.digit)}${p.key}` : placeValueStr(places.find(x => x.key === p.key)?.digit ?? 0, places.find(x => x.key === p.key)?.weight ?? 1)}</span>
            : <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '1px' }}>{blankLine(letters ? 24 : 40)}{letters && <span>{p.key}</span>}</span>;

    // Thousands spaces are ordinary spaces (formatMathNumber), so every number and term holds itself together.
    const result = () => showSolutions ? <span style={{ ...solutionText, whiteSpace: 'nowrap' }}>{fmt(ex.total)}</span> : blankLine(60);

    // Left/right of "=" swap with direction, but both sit in fixed-width grid columns (sized
    // to the block's widest left-side content) so the "=" itself lands at the same x on
    // every row, whichever term order (gehusseld or not) the terms come in.
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', fontFamily: "'Azeret Mono', monospace", fontSize: 'calc(var(--sheet-size-math) * 1.04)' }}>
            <span style={{ display: 'inline-flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '6px', minWidth: leftColWidth }}>
                {compose
                    ? places.map((p, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', whiteSpace: 'nowrap' }}>{i > 0 && <span>+</span>}{termGiven(p)}</span>)
                    : <span style={{ fontWeight: 'normal', whiteSpace: 'nowrap' }}>{fmt(ex.total)}</span>}
            </span>
            <span style={{ width: '20px', textAlign: 'center', flexShrink: 0 }}>=</span>
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                {compose
                    ? result()
                    : places.map((p, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px', whiteSpace: 'nowrap' }}>{i > 0 && <span>+</span>}{termBlank(p)}</span>)}
            </span>
        </div>
    );
}

// ── Basic box layout ──────────────────────────────────────────────────────────

function BasicBox({ ex, showSolutions, rowHeight }: { ex: SplitsenExercise; showSolutions: boolean; rowHeight: number }) {
    const cellBase: React.CSSProperties = {
        border: '1px solid #000',
        fontSize: 'calc(var(--sheet-size-math) * 0.81)',
        fontFamily: "'Azeret Mono', monospace",
        textAlign: 'center',
        height: `${rowHeight}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
    };

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', border: '1px solid #000', width: '100%' }}>
            {/* Total — spans full width */}
            <div style={{ ...cellBase, fontWeight: 'normal', fontSize: 'calc(var(--sheet-size-math) * 0.87)', borderBottom: '1px solid #000', width: '100%' }}>
                {fmt(ex.total)}
            </div>
            {/* Pair rows */}
            {ex.pairs.map((pair, i) => (
                <div key={i} style={{ display: 'flex', borderTop: i > 0 ? '1px solid #000' : undefined, width: '100%' }}>
                    <div style={{ ...cellBase, flex: 1, borderRight: '1px solid #000' }}>{fmt(pair.given)}</div>
                    <div style={{ ...cellBase, flex: 1, ...(showSolutions ? solutionText : { color: 'transparent' }) }}>
                        {fmt(pair.answer)}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Splitsboom layout (single split-tree, one blank slot) ─────────────────────

function SplitsboomItem({ ex, showSolutions, boxMinWidth }: { ex: SplitsenExercise; showSolutions: boolean; boxMinWidth: string }) {
    const left = ex.pairs[0]?.given ?? 0;
    const right = ex.pairs[0]?.answer ?? 0;
    const blank: 'top' | 'left' | 'right' = ex.blankPos ?? 'right';

    const box = (value: number, isBlank: boolean) => (
        <div style={{
            border: '1.5px solid #000', borderRadius: '4px', minWidth: boxMinWidth, height: '38px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Azeret Mono', monospace", fontSize: 'calc(var(--sheet-size-math) * 1.04)', boxSizing: 'border-box', padding: '0 6px',
        }}>
            {isBlank ? (showSolutions ? <span style={solutionText}>{fmt(value)}</span> : '') : fmt(value)}
        </div>
    );

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
            {box(ex.total, blank === 'top')}
            <svg width="92" height="26" style={{ display: 'block' }}>
                <line x1="46" y1="2" x2="16" y2="24" stroke="#000" strokeWidth="1.5" />
                <line x1="46" y1="2" x2="76" y2="24" stroke="#000" strokeWidth="1.5" />
            </svg>
            <div style={{ display: 'flex', gap: '18px' }}>
                {box(left, blank === 'left')}
                {box(right, blank === 'right')}
            </div>
        </div>
    );
}

// ── Mathematic row layout ─────────────────────────────────────────────────────

function MathematicRow({ total, given, answer, showSolutions }: {
    total: number; given: number; answer: number; showSolutions: boolean;
}) {
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'flex-end', fontSize: 'calc(var(--sheet-size-math) * 1)', fontFamily: "'Azeret Mono', monospace" }}>
            <div style={{ width: '64px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <span style={{ fontWeight: 'normal' }}>{fmt(total)}</span>
            </div>
            <span style={{ width: '26px', textAlign: 'center', flexShrink: 0 }}>=</span>
            <div style={{ width: '64px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <span>{fmt(given)}</span>
            </div>
            <span style={{ width: '26px', textAlign: 'center', flexShrink: 0 }}>+</span>
            <div style={{ width: '64px', display: 'flex', alignItems: 'flex-end' }}>
                {showSolutions
                    ? <span style={solutionText}>{fmt(answer)}</span>
                    : <div style={{ borderBottom: '1.5px solid #000', width: '52px', height: ANSWER_LINE_H }} />
                }
            </div>
        </div>
    );
}

// ── Verliefde harten layout ───────────────────────────────────────────────────

const HEART_PATH = 'M50 80 C8 55 5 15 27 15 A23 23 0 0 1 50 36 A23 23 0 0 1 73 15 C95 15 92 55 50 80Z';

function HeartItem({ pairId, total, given, answer, showSolutions }: {
    pairId: string; total: number; given: number; answer: number; showSolutions: boolean;
}) {
    const leftId = `hl-${pairId}`;
    const rightId = `hr-${pairId}`;
    const W = 120, H = 114;

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0px' }}>
            <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.81)', fontFamily: "'Azeret Mono', monospace", fontWeight: 'normal', marginBottom: '-16px', zIndex: 1, position: 'relative' }}>{fmt(total)}</span>
            {/* position:relative wrapper so number divs stack on top of SVG */}
            <div style={{ position: 'relative', width: W, height: H }}>
                <svg viewBox="0 0 100 95" width={W} height={H} style={{ display: 'block' }}>
                    <defs>
                        <clipPath id={leftId}>
                            <rect x="0" y="0" width="50" height="95" />
                        </clipPath>
                        <clipPath id={rightId}>
                            <rect x="50" y="0" width="50" height="95" />
                        </clipPath>
                    </defs>
                    <path d={HEART_PATH} fill="#bfdbfe" clipPath={`url(#${leftId})`} />
                    <path d={HEART_PATH} fill={showSolutions ? '#fecaca' : 'white'} clipPath={`url(#${rightId})`} />
                    <path d={HEART_PATH} fill="none" stroke="#000" strokeWidth="1.5" />
                    <line x1="50" y1="36" x2="50" y2="78" stroke="#000" strokeWidth="1.5" />
                </svg>
                {/* Left half number — positioned at heart visual centroid (~43% from top) */}
                <div style={{
                    position: 'absolute', top: '43%', left: '8px',
                    width: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex', justifyContent: 'center',
                    pointerEvents: 'none',
                }}>
                    <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.92)', fontWeight: 'normal', fontFamily: "'Azeret Mono', monospace" }}>{fmt(given)}</span>
                </div>
                {/* Right half number */}
                {showSolutions && (
                    <div style={{
                        position: 'absolute', top: '43%', right: '3px',
                        width: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex', justifyContent: 'center',
                        pointerEvents: 'none',
                    }}>
                        <span style={{ fontSize: 'calc(var(--sheet-size-math) * 0.92)', fontFamily: "'Azeret Mono', monospace", ...solutionText }}>{fmt(answer)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
