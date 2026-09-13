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
    // Static-size overrides (cm→px done by caller). When set, the whole shape keeps
    // a fixed size regardless of the denominator. SVG picks the one matching `shape`.
    fixedWidthPx?: number;     // rectangle outer width
    fixedHeightPx?: number;    // rectangle outer height
    fixedSidePx?: number;      // square outer side
    fixedDiameterPx?: number;  // circle diameter
    // The fixed* sizes above are a teacher's cm request ("een vierkant van 4 cm"), so they
    // must stay physical px; everything else follows the Lettergrootte slider.
    physicalSize?: boolean;
}

// 13pt (the --sheet-size-math default) = 17.33px, so writing the shape geometry as em over
// this divisor reproduces today's pixels at the default and grows with the slider above it.
export const PX_PER_EM_AT_DEFAULT = 17.33;

// Widest a shape may be drawn, in viewBox units = px at the 13pt default: one column of the
// 2-up fraction grid. SYNC: FractionViewer turns it into px to pick its column count and
// FractionExerciseItem caps its cell size with it.
export const SHAPE_BUDGET_AT_DEFAULT = 265;

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
    fixedWidthPx, fixedHeightPx, fixedSidePx, fixedDiameterPx, physicalSize = false,
}: Props) {
    // The viewBox always keeps the geometry below in its own units; only the element size
    // switches between physical px and font-relative em.
    const size = (px: number): string => (physicalSize ? `${px}px` : `${px / PX_PER_EM_AT_DEFAULT}em`);
    const shapeStyle: React.CSSProperties = { fontSize: 'var(--sheet-size-math)', ...style };
    if (shape === 'circle') {
        const r = fixedDiameterPx ? fixedDiameterPx / 2 : 44;
        const margin = 6;
        const svgSize = r * 2 + margin * 2;
        const cx = svgSize / 2, cy = svgSize / 2;
        const sliceDeg = 360 / denominator;

        return (
            <svg width={size(svgSize)} height={size(svgSize)} viewBox={`0 0 ${svgSize} ${svgSize}`} style={shapeStyle}>
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

    if (shape === 'square') {
        // SYNC: mirrors the rect branch's fill logic, but the outer shape is always a
        // square divided into `denominator` equal vertical strips (kleuren/herkennen).
        const side = fixedSidePx ?? 90;
        const stripW = side / denominator;
        return (
            <svg width={size(side)} height={size(side)} viewBox={`0 0 ${side} ${side}`} style={shapeStyle}>
                {Array.from({ length: denominator }, (_, i) => (
                    <rect
                        key={i}
                        x={i * stripW}
                        y={0}
                        width={stripW}
                        height={side}
                        fill={showColored && coloredIndices.includes(i) ? FILL_COLOR : 'white'}
                        stroke={STROKE}
                        strokeWidth={1.5}
                    />
                ))}
            </svg>
        );
    }

    // rectangle grid (optionally a fixed outer size, so cells stretch to fit)
    const cw = fixedWidthPx ? fixedWidthPx / gridCols : cellSize;
    const ch = fixedHeightPx ? fixedHeightPx / gridRows : cellSize;
    const width = gridCols * cw;
    const height = gridRows * ch;

    return (
        <svg width={size(width)} height={size(height)} viewBox={`0 0 ${width} ${height}`} style={shapeStyle}>
            {Array.from({ length: gridRows }, (_, row) =>
                Array.from({ length: gridCols }, (_, col) => {
                    const idx = row * gridCols + col;
                    return (
                        <rect
                            key={idx}
                            x={col * cw}
                            y={row * ch}
                            width={cw}
                            height={ch}
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
