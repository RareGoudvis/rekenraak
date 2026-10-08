import React from 'react';
import { interactionProps, type ViewerInteraction } from './ViewerInteractionContext';

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
    // Oefenmodus: set by the kleuren item so the pupil taps the parts to colour; null on the sheet.
    ix?: ViewerInteraction | null;
    // Bordmodus breukviz: a teacher-picked fill; the sheet never passes it.
    fillColor?: string;
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

// A phone card is about 3x wider than tall and scales a figure to its height first, so a kiosk
// square of several parts is drawn this many times wider than tall: every part reaches 44 px.
const KIOSK_GRID_ASPECT = 2.4;
// A prime d has no grid (equal parts need one row): its strips keep at least this width (viewBox units).
const KIOSK_MIN_STRIP = 30;

/** Rows x cols for a kiosk square of d >= 5 parts (the most square-like factor pair; a prime d stays one wider row), else null. */
function kioskSquareGrid(d: number, side: number) {
    if (d < 5) return null;
    let rows = 1;
    for (let r = 2; r * r <= d; r++) if (d % r === 0) rows = r;
    if (rows === 1) return { rows, cols: d, cellW: Math.max(side / d, KIOSK_MIN_STRIP), cellH: side };
    const cols = d / rows;
    return { rows, cols, cellW: (side * KIOSK_GRID_ASPECT) / cols, cellH: side / rows };
}

export default function FractionShapeSVG({
    denominator, shape, coloredIndices,
    gridRows, gridCols, showColored = true, cellSize = 35, style,
    fixedWidthPx, fixedHeightPx, fixedSidePx, fixedDiameterPx, physicalSize = false, ix = null, fillColor = FILL_COLOR,
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
                    <circle {...interactionProps(ix, '0')} cx={cx} cy={cy} r={r} fill={showColored && coloredIndices.includes(0) ? fillColor : 'white'} stroke={STROKE} strokeWidth={1.5} />
                ) : (
                    Array.from({ length: denominator }, (_, i) => (
                        <path
                            key={i}
                            {...interactionProps(ix, String(i))}
                            d={piePath(cx, cy, r, i * sliceDeg, (i + 1) * sliceDeg)}
                            fill={showColored && coloredIndices.includes(i) ? fillColor : 'white'}
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
        // Kiosk only (ix set): strips of side/d are under a thumb's 44 px from d = 5 on, so the parts
        // become a rows x cols grid of equal cells in a wider figure; a prime d stays one row, widened.
        const grid = ix ? kioskSquareGrid(denominator, side) : null;
        const cols = grid?.cols ?? denominator;
        const rows = grid?.rows ?? 1;
        const stripW = grid?.cellW ?? side / denominator;
        const cellH = grid?.cellH ?? side;
        const width = grid ? stripW * cols : side;
        return (
            <svg width={size(width)} height={size(side)} viewBox={`0 0 ${width} ${side}`} style={shapeStyle}
                {...(grid && { 'data-kiosk-layout': 'grid' })}>
                {Array.from({ length: denominator }, (_, i) => (
                    <rect
                        key={i}
                        {...interactionProps(ix, String(i))}
                        x={(i % cols) * stripW}
                        y={Math.floor(i / cols) * cellH}
                        width={stripW}
                        height={rows === 1 ? side : cellH}
                        fill={showColored && coloredIndices.includes(i) ? fillColor : 'white'}
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
                            {...interactionProps(ix, String(idx))}
                            x={col * cw}
                            y={row * ch}
                            width={cw}
                            height={ch}
                            fill={showColored && coloredIndices.includes(idx) ? fillColor : 'white'}
                            stroke={STROKE}
                            strokeWidth={1.5}
                        />
                    );
                })
            )}
        </svg>
    );
}
