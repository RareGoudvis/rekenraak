import type { MathBlock, SplitsenExercise } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';

const fmt = (n: number): string =>
    String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

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

    return null;
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
            <div style={{ ...cellBase, fontWeight: 'bold', fontSize: '15px', borderBottom: '1px solid #000', width: '100%' }}>
                {fmt(ex.total)}
            </div>
            {/* Pair rows */}
            {ex.pairs.map((pair, i) => (
                <div key={i} style={{ display: 'flex', borderTop: i > 0 ? '1px solid #000' : undefined, width: '100%' }}>
                    <div style={{ ...cellBase, flex: 1, borderRight: '1px solid #000' }}>{fmt(pair.given)}</div>
                    <div style={{ ...cellBase, flex: 1, color: showSolutions ? '#e11d48' : 'transparent', fontWeight: 'bold' }}>
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
                <span style={{ fontWeight: 'bold' }}>{fmt(total)}</span>
            </div>
            <span style={{ width: '26px', textAlign: 'center', flexShrink: 0 }}>=</span>
            <div style={{ width: '64px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <span>{fmt(given)}</span>
            </div>
            <span style={{ width: '26px', textAlign: 'center', flexShrink: 0 }}>+</span>
            <div style={{ width: '64px', display: 'flex', alignItems: 'flex-end' }}>
                {showSolutions
                    ? <span style={{ color: '#e11d48', fontWeight: 'bold' }}>{fmt(answer)}</span>
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
            <span style={{ fontSize: '14px', fontFamily: "'Azeret Mono', monospace", fontWeight: 'bold', marginBottom: '-16px', zIndex: 1, position: 'relative' }}>{fmt(total)}</span>
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
                    <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: "'Azeret Mono', monospace" }}>{fmt(given)}</span>
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
                        <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: "'Azeret Mono', monospace", color: '#e11d48' }}>{fmt(answer)}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
