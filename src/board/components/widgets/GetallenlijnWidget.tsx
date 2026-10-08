import { getallenlijnProps } from '../../widgetSizing';
import { formatMathNumber } from '../../../services/math/formatters';
import type { BoardWidget } from '../../boardTypes';

// Empty number line manipulative: axis + ticks, labels per setting
// (alles / enkel uiteinden / geen) — teachers write on it with the pen.
export default function GetallenlijnWidget({ widget }: { widget: BoardWidget }) {
    const p = getallenlijnProps(widget);
    const pad = 30;
    const W = 600, axisY = 34, H = 78;
    const step = (W - 2 * pad) / (p.ticks - 1);
    const valueAt = (i: number) => p.min + (i * (p.max - p.min)) / (p.ticks - 1);
    const showLabel = (i: number) =>
        p.labels === 'alles' || (p.labels === 'uiteinden' && (i === 0 || i === p.ticks - 1));

    return (
        <div style={{ padding: '10px 8px' }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
                <line x1={pad - 14} y1={axisY} x2={W - pad + 14} y2={axisY} stroke="#000" strokeWidth="2" />
                <polygon points={`${W - pad + 14},${axisY} ${W - pad + 5},${axisY - 6} ${W - pad + 5},${axisY + 6}`} fill="#000" />
                {Array.from({ length: p.ticks }, (_, i) => {
                    const x = pad + i * step;
                    return (
                        <g key={i}>
                            <line x1={x} y1={axisY - 9} x2={x} y2={axisY + 9} stroke="#000" strokeWidth="2" />
                            {showLabel(i) && (
                                <text x={x} y={axisY + 30} textAnchor="middle" fontFamily="'Azeret Mono', monospace" fontSize="14" fill="#111">
                                    {formatMathNumber(Math.round(valueAt(i) * 100) / 100)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}
