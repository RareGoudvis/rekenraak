import type { MathBlock, GetallenasExercise } from '../../services/math/types';
import FragmentableGrid from './FragmentableGrid';

interface Props {
    block: MathBlock;
    showSolutions: boolean;
}

const mono = "'Azeret Mono', monospace";

function NumberLine({ ex, showSolutions }: { ex: GetallenasExercise; showSolutions: boolean }) {
    const { start, step, tickCount, blankMask, direction } = ex;
    const pad = 24;
    const gap = 96;
    const W = pad * 2 + gap * (tickCount - 1);
    const H = 70;
    const axisY = 30;
    const arrowLeft = direction === 'left';

    const valueAt = (i: number) => (arrowLeft ? start - i * step : start + i * step);
    const tickX = (i: number) => pad + i * gap;

    return (
        <svg width={W} height={H} style={{ display: 'block', fontFamily: mono }}>
            {/* axis */}
            <line x1={pad - 12} y1={axisY} x2={W - pad + 12} y2={axisY} stroke="#000" strokeWidth="1.5" />
            {/* arrowhead */}
            {arrowLeft
                ? <polygon points={`${pad - 12},${axisY} ${pad - 4},${axisY - 5} ${pad - 4},${axisY + 5}`} fill="#000" />
                : <polygon points={`${W - pad + 12},${axisY} ${W - pad + 4},${axisY - 5} ${W - pad + 4},${axisY + 5}`} fill="#000" />}
            {/* ticks + labels */}
            {Array.from({ length: tickCount }, (_, i) => {
                const x = tickX(i);
                const v = valueAt(i);
                const blank = blankMask[i];
                return (
                    <g key={i}>
                        <line x1={x} y1={axisY - 7} x2={x} y2={axisY + 7} stroke="#000" strokeWidth="1.5" />
                        {blank
                            ? (showSolutions
                                ? <text x={x} y={axisY + 26} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#e11d48">{v}</text>
                                : <line x1={x - 16} y1={axisY + 22} x2={x + 16} y2={axisY + 22} stroke="#000" strokeWidth="1.5" />)
                            : <text x={x} y={axisY + 26} textAnchor="middle" fontSize="15" fontWeight="bold" fill="#000">{v}</text>}
                    </g>
                );
            })}
        </svg>
    );
}

export default function GetallenasViewer({ block, showSolutions }: Props) {
    const exercises = block.getallenasExercises || [];
    const gap = block.verticalSpacing || 14;

    if (exercises.length === 0) {
        return <div className="no-print" style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '14px', padding: '8px 0' }}>(Genereer oefeningen via het rechterpaneel)</div>;
    }

    return (
        <FragmentableGrid
            cols={1}
            rowGap={gap + 10}
            items={exercises.map((ex) => (
                <div key={ex.id} className="print-exercise">
                    <NumberLine ex={ex} showSolutions={showSolutions} />
                </div>
            ))}
        />
    );
}
