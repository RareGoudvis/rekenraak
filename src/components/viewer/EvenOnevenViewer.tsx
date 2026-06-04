import type { MathBlock, EvenOnevenExercise } from '../../services/math/types';
import { formatMathNumber } from '../../services/math/formatters';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";
const FILL = '#93c5fd';

export default function EvenOnevenViewer({ block, showSolutions }: Props) {
    const exercises: EvenOnevenExercise[] = block.evenOnevenExercises || [];
    const subType: string = block.constraints.subType ?? 'rooster';
    const target: string = block.constraints.target ?? 'even';
    const perRow: number = block.constraints.perRow ?? 10;   // 'Getallen per rij' — fixed grid width
    const gap = block.verticalSpacing || 14;
    const isTarget = (n: number) => (target === 'even' ? n % 2 === 0 : n % 2 !== 0);

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    // ── CIRKELS: pair up the circles to decide even/oneven ────────────────────
    if (subType === 'cirkels') {
        const objSize = 22, gapPx = 4;
        return (
            <FragmentableGrid
                cols={2}
                columnGap={24}
                rowGap={gap + 6}
                items={exercises.map(ex => {
                    const n = ex.number ?? 0;
                    const cols = Math.ceil(n / 2);
                    return (
                        <div key={ex.id} className="print-exercise" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* 2 rows; an odd count leaves one unpaired circle in the bottom row */}
                            <div style={{ display: 'flex', gap: `${gapPx}px` }}>
                                {Array.from({ length: cols }, (_, c) => {
                                    const idx = c * 2;        // top-row circle
                                    const odd = idx >= n;
                                    return <Circle key={c} size={objSize} ghost={odd} solved={showSolutions} highlight={false} />;
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: `${gapPx}px` }}>
                                {Array.from({ length: cols }, (_, c) => {
                                    const idx = c * 2 + 1;    // bottom-row circle (the pair partner)
                                    const missing = idx >= n;
                                    // the lone leftover (odd number) is highlighted in the solution
                                    const leftover = missing && (c * 2) < n;
                                    if (missing && !leftover) return <span key={c} style={{ width: objSize, height: objSize, display: 'inline-block' }} />;
                                    return <Circle key={c} size={objSize} ghost={false} solved={showSolutions} highlight={showSolutions && leftover} />;
                                })}
                            </div>
                            <div style={{ fontFamily: mono, fontSize: '14px', display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
                                <span>{n} is</span>
                                {showSolutions
                                    ? <span style={{ color: '#e11d48' }}>{n % 2 === 0 ? 'even' : 'oneven'}</span>
                                    : <span style={{ borderBottom: '1.5px solid #000', minWidth: '70px', height: '16px', display: 'inline-block' }} />}
                            </div>
                        </div>
                    );
                })}
            />
        );
    }

    // ── ROOSTER: colour the even (or oneven) numbers ──────────────────────────
    // Fixed `perRow`-column grid (NOT width-based flex-wrap) so cells align and the
    // 'Getallen per rij' setting is honoured. marginLeft/-Top:-1 collapse shared borders.
    const cellW = 46, cellH = 34;
    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap}
            items={exercises.map(ex => (
                <div key={ex.id} className="print-exercise" style={{
                    display: 'grid', gridTemplateColumns: `repeat(${perRow}, ${cellW}px)`, width: 'fit-content',
                }}>
                    {(ex.numbers || []).map((num, i) => (
                        <div key={i} style={{
                            width: cellW, height: cellH, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid #000', boxSizing: 'border-box', fontFamily: mono, fontSize: '14px',
                            // collapse with left neighbour (same row) and the row above
                            marginLeft: i % perRow === 0 ? 0 : -1, marginTop: i >= perRow ? -1 : 0,
                            backgroundColor: showSolutions && isTarget(num) ? FILL : 'white',
                        }}>
                            {formatMathNumber(num)}
                        </div>
                    ))}
                </div>
            ))}
        />
    );
}

function Circle({ size, ghost, solved, highlight }: { size: number; ghost: boolean; solved: boolean; highlight: boolean }) {
    if (ghost) return <span style={{ width: size, height: size, display: 'inline-block' }} />;
    const fill = highlight ? '#e11d48' : (solved ? FILL : 'white');
    return (
        <svg width={size} height={size}>
            <circle cx={size / 2} cy={size / 2} r={size / 2 - 1.5} fill={fill} stroke="#000" strokeWidth={1.5} />
        </svg>
    );
}
