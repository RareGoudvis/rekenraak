import React from 'react';

interface Props {
    numerator: number;
    denominator: number;
    shape: 'square' | 'rectangle' | 'circle';
    coloredIndices: number[];
    gridRows: number;
    gridCols: number;
    showColored?: boolean;
    cellSize?: number;
    style?: React.CSSProperties;
}

const FILL_COLOR = '#93c5fd';
const STROKE = '#000';

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function piePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const p1 = polarToXY(cx, cy, r, startDeg);
    const p2 = polarToXY(cx, cy, r, endDeg);
    const largeArc = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`;
}

export default function FractionShapeSVG({
    denominator, shape, coloredIndices,
    gridRows, gridCols, showColored = true, cellSize = 35, style,
}: Props) {
    if (shape === 'circle') {
        const r = 44;
        const margin = 6;
        const svgSize = r * 2 + margin * 2;
        const cx = svgSize / 2, cy = svgSize / 2;
        const sliceDeg = 360 / denominator;

        return (
            <svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={style}>
                {denominator === 1 ? (
                    <circle cx={cx} cy={cy} r={r} fill={showColored && coloredIndices.includes(0) ? FILL_COLOR : 'white'} stroke={STROKE} strokeWidth={1.5} />
                ) : (
                    Array.from({ length: denominator }, (_, i) => (
                        <path
                            key={i}
                            d={piePath(cx, cy, r, i * sliceDeg, (i + 1) * sliceDeg)}
                            fill={showColored && coloredIndices.includes(i) ? FILL_COLOR : 'white'}
                            stroke={STROKE}
                            strokeWidth={1.5}
                        />
                    ))
                )}
            </svg>
        );
    }

    // square / rectangle grid
    const width = gridCols * cellSize;
    const height = gridRows * cellSize;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={style}>
            {Array.from({ length: gridRows }, (_, row) =>
                Array.from({ length: gridCols }, (_, col) => {
                    const idx = row * gridCols + col;
                    return (
                        <rect
                            key={idx}
                            x={col * cellSize}
                            y={row * cellSize}
                            width={cellSize}
                            height={cellSize}
                            fill={showColored && coloredIndices.includes(idx) ? FILL_COLOR : 'white'}
                            stroke={STROKE}
                            strokeWidth={1.5}
                        />
                    );
                })
            )}
        </svg>
    );
}
