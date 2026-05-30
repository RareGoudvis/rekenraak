import type { MathBlock, SplitsenExercise } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';
import { formatMathNumber } from '../../services/math/formatters';

// Thousands-spaces + comma decimals (nl-BE).
const fmt = (n: number): string => formatMathNumber(n);
// A place's value as a clean string (e.g. tienden digit 3 → "0,3"), rounded against float drift.
const placeValueStr = (digit: number, weight: number): string => formatMathNumber(Math.round(digit * weight * 1e6) / 1e6);

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

export default function SplitsenViewer({ block, showSolutions }: Props) {
    const layout: string = block.constraints.layout || 'basic';
    const exercises: SplitsenExercise[] = block.splitsenExercises || [];
    const gap = block.verticalSpacing || 14;
    const rowHeight: number = block.constraints.rowHeight || 28;

    if (exercises.length === 0) {
        return (
            <div className="no-print" style={{ padding: '8px 0', fontStyle: 'italic', color: '#999', fontSize: '14px' }}>
                (Genereer oefeningen via het rechterpaneel)
            </div>
        );
    }

    if (layout === 'basic') {
        const cols = Math.min(exercises.length, 4);
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

    if (layout === 'mathematic') {
        const allItems = exercises.flatMap(ex =>
            ex.pairs.map((p, i) => ({ ...p, total: ex.total, uid: `${ex.id}-${i}` }))
        );
        return (
            <FragmentableGrid
                cols={2}
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
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', rowGap: `${gap}px`, justifyContent: 'space-evenly' }}>
                {allItems.map(item => (
                    <HeartItem
                        key={item.uid}
                        pairId={item.uid}
                        total={item.total}
                        given={item.given}
                        answer={item.answer}
                        showSolutions={showSolutions}
                    />
                ))}
            </div>
        );
    }

    if (layout === 'positie-benen') {
        return (
            <FragmentableGrid cols={2} columnGap={gap} rowGap={gap + 10}
                items={exercises.map(ex => <PositieBenenItem key={ex.id} ex={ex} showSolutions={showSolutions} />)} />
        );
    }

    if (layout === 'positie-tabel') {
        return (
            <FragmentableGrid cols={1} rowGap={gap + 6}
                items={exercises.map(ex => <PositieTabelItem key={ex.id} ex={ex} showSolutions={showSolutions} />)} />
        );
    }

    if (layout === 'positie-math') {
        return (
            <FragmentableGrid cols={2} columnGap={gap + 20} rowGap={gap + 4}
                items={exercises.map(ex => <PositieMathRow key={ex.id} ex={ex} showSolutions={showSolutions} />)} />
        );
    }

    return null;
}

// ── Place-value: blank vs solution helpers ────────────────────────────────────

const SOL: React.CSSProperties = { color: '#e11d48', fontWeight: 'normal' };
const blankLine = (w = 44) => <span style={{ borderBottom: '1.5px solid #000', display: 'inline-block', width: `${w}px`, height: '18px' }} />;

// ── Place-value: splitsbenen (legs) ───────────────────────────────────────────

function PositieBenenItem({ ex, showSolutions }: { ex: SplitsenExercise; showSolutions: boolean }) {
    const places = ex.placeBreakdown || [];
    const topBlank = ex.blankSide === 'top';
    const W = Math.max(120, places.length * 56);
    const xs = places.map((_, i) => ((i + 0.5) / places.length) * W);

    return (
        <div className="print-exercise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', fontFamily: "'Azeret Mono', monospace", fontSize: '18px' }}>
            {/* top number */}
            <div style={{ height: '26px', display: 'flex', alignItems: 'center' }}>
                {topBlank
                    ? (showSolutions ? <span style={SOL}>{fmt(ex.total)}</span> : blankLine(60))
                    : <span style={{ fontWeight: 'normal' }}>{fmt(ex.total)}</span>}
            </div>
            {/* legs */}
            <svg width={W} height="26" style={{ display: 'block' }}>
                {xs.map((x, i) => <line key={i} x1={W / 2} y1="2" x2={x} y2="24" stroke="#000" strokeWidth="1.5" />)}
            </svg>
            {/* place boxes — 'value' shows the whole value (30); 'letters' shows digit + key (3T) */}
            <div style={{ display: 'flex', justifyContent: 'space-around', width: W }}>
                {places.map((p, i) => {
                    const asValue = ex.notation === 'value';
                    const shown = asValue ? placeValueStr(p.digit, p.weight) : String(p.digit);
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                            {topBlank
                                ? <span style={{ fontWeight: 'normal' }}>{shown}</span>
                                : (showSolutions ? <span style={SOL}>{shown}</span> : blankLine(asValue ? 40 : 24))}
                            {!asValue && <span style={{ fontWeight: 'normal' }}>{p.key}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Place-value: positietabel (word → digit grid) ─────────────────────────────

function PositieTabelItem({ ex, showSolutions }: { ex: SplitsenExercise; showSolutions: boolean }) {
    const cols = ex.placeBreakdown || [];
    const cell: React.CSSProperties = {
        border: '1px solid #000', width: '42px', height: '36px', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: "'Azeret Mono', monospace", fontSize: '16px', boxSizing: 'border-box',
    };
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', width: '100%' }}>
            {/* Word fills the left; tables pin to the far right so all line up with room to spare. */}
            <div style={{ flex: 1, minWidth: 0, fontFamily: "'Azeret Mono', monospace", fontSize: '16px' }}>{ex.words}</div>
            <div style={{ flexShrink: 0 }}>
                <div style={{ display: 'flex' }}>
                    {cols.map(p => <div key={p.key} style={{ ...cell, backgroundColor: '#f4cbb8', fontWeight: 'bold' }}>{p.key}</div>)}
                </div>
                <div style={{ display: 'flex' }}>
                    {cols.map(p => <div key={p.key} style={{ ...cell, color: '#e11d48', fontWeight: 'normal' }}>{showSolutions ? p.digit : ''}</div>)}
                </div>
            </div>
        </div>
    );
}

// ── Place-value: mathematical (letters / expanded × decompose / compose) ──────

function PositieMathRow({ ex, showSolutions }: { ex: SplitsenExercise; showSolutions: boolean }) {
    const places = ex.placeBreakdown || [];
    const letters = ex.mathForm === 'letters';
    const compose = ex.mathDirection === 'compose';

    const termGiven = (p: { digit: number; key: string; weight: number }) =>
        <span>{letters ? `${p.digit}${p.key}` : placeValueStr(p.digit, p.weight)}</span>;
    const termBlank = (p: { key: string }) =>
        showSolutions
            ? <span style={SOL}>{letters ? `${(places.find(x => x.key === p.key)?.digit)}${p.key}` : placeValueStr(places.find(x => x.key === p.key)?.digit ?? 0, places.find(x => x.key === p.key)?.weight ?? 1)}</span>
            : <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '1px' }}>{blankLine(letters ? 24 : 40)}{letters && <span>{p.key}</span>}</span>;

    const result = () => showSolutions ? <span style={SOL}>{fmt(ex.total)}</span> : blankLine(60);

    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap', fontFamily: "'Azeret Mono', monospace", fontSize: '18px' }}>
            {compose ? (
                <>
                    {places.map((p, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>{i > 0 && <span>+</span>}{termGiven(p)}</span>)}
                    <span>=</span>{result()}
                </>
            ) : (
                <>
                    <span style={{ fontWeight: 'normal' }}>{fmt(ex.total)}</span><span>=</span>
                    {places.map((p, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '6px' }}>{i > 0 && <span>+</span>}{termBlank(p)}</span>)}
                </>
            )}
        </div>
    );
}

// ── Basic box layout ──────────────────────────────────────────────────────────

function BasicBox({ ex, showSolutions, rowHeight }: { ex: SplitsenExercise; showSolutions: boolean; rowHeight: number }) {
    const cellBase: React.CSSProperties = {
        border: '1px solid #000',
        fontSize: '14px',
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
            <div style={{ ...cellBase, fontWeight: 'normal', fontSize: '15px', borderBottom: '1px solid #000', width: '100%' }}>
                {fmt(ex.total)}
            </div>
            {/* Pair rows */}
            {ex.pairs.map((pair, i) => (
                <div key={i} style={{ display: 'flex', borderTop: i > 0 ? '1px solid #000' : undefined, width: '100%' }}>
                    <div style={{ ...cellBase, flex: 1, borderRight: '1px solid #000' }}>{fmt(pair.given)}</div>
                    <div style={{ ...cellBase, flex: 1, color: showSolutions ? '#e11d48' : 'transparent', fontWeight: 'normal' }}>
                        {fmt(pair.answer)}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Mathematic row layout ─────────────────────────────────────────────────────

function MathematicRow({ total, given, answer, showSolutions }: {
    total: number; given: number; answer: number; showSolutions: boolean;
}) {
    return (
        <div className="print-exercise" style={{ display: 'flex', alignItems: 'flex-end', fontSize: '17px', fontFamily: "'Azeret Mono', monospace" }}>
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
                    ? <span style={{ color: '#e11d48', fontWeight: 'normal' }}>{fmt(answer)}</span>
                    : <div style={{ borderBottom: '1.5px solid #000', width: '52px', height: '18px' }} />
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
            <span style={{ fontSize: '14px', fontFamily: "'Azeret Mono', monospace", fontWeight: 'normal', marginBottom: '-16px', zIndex: 1, position: 'relative' }}>{fmt(total)}</span>
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
                    <span style={{ fontSize: '16px', fontWeight: 'normal', fontFamily: "'Azeret Mono', monospace" }}>{fmt(given)}</span>
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
                        <span style={{ fontSize: '16px', fontWeight: 'normal', fontFamily: "'Azeret Mono', monospace", color: '#e11d48' }}>{fmt(answer)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
