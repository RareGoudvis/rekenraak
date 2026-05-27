import type { MabStyle } from '../../services/math/types';

// Renders place-value blocks for one MAB exercise. Three visual conventions:
//   symbolic:   units = dot, tens = horizontal bar, hundreds = small outlined square,
//               thousands = stacked-square stamp. Compact textbook abbreviation.
//   mab-bw:     Dienes blocks — units = 1×1 cube, tens = 1×10 rod (horizontal),
//               hundreds = 10×10 flat, thousands = 10×10×10 cube.
//   mab-color:  Same as mab-bw but coloured per place value (yellow/green/red/blue).

export type MabPlace = 'thousands' | 'hundreds' | 'tens' | 'units';

interface ColumnProps {
    count: number;
    place: MabPlace;
    style: MabStyle;
    color?: string;
}

// 'mab-color' palette per place (fill). Strokes stay black for readability.
const COLOR_FILL: Record<MabPlace, string> = {
    units:     '#fbbf24',  // amber/yellow
    tens:      '#22c55e',  // green
    hundreds:  '#ef4444',  // red
    thousands: '#3b82f6',  // blue
};

// Resolves the fill color for a Dienes glyph. Solution-tint (non-default color)
// always wins so tekenen-mode overlays read uniformly red.
function resolveFill(style: MabStyle, place: MabPlace, color: string): string {
    if (color !== '#000') return color;
    if (style === 'mab-color') return COLOR_FILL[place];
    return 'white';
}

export function MabPlaceColumn({ count, place, style, color = '#000' }: ColumnProps) {
    if (count === 0) return null;

    // Units render in a deterministic two-row column-first pattern (1, 2, 3, 4… domino)
    // so pupils can subitize. Column k gets a top glyph if 2k < count, bottom if 2k+1 < count.
    if (place === 'units') {
        const cols = Math.ceil(count / 2);
        const cells: React.ReactNode[] = [];
        for (let k = 0; k < cols; k++) {
            if (2 * k < count) cells.push(
                <div key={`t${k}`} style={{ gridColumn: k + 1, gridRow: 1, display: 'flex', alignItems: 'flex-end' }}>
                    <Glyph place="units" style={style} color={color} />
                </div>
            );
            if (2 * k + 1 < count) cells.push(
                <div key={`b${k}`} style={{ gridColumn: k + 1, gridRow: 2, display: 'flex', alignItems: 'flex-end' }}>
                    <Glyph place="units" style={style} color={color} />
                </div>
            );
        }
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${cols}, auto)`,
                gridTemplateRows: 'auto auto',
                columnGap: '3px',
                rowGap: '2px',
                justifyContent: 'center',
                alignContent: 'end',
                height: '100%',
            }}>
                {cells}
            </div>
        );
    }

    // Tens / hundreds / thousands: one glyph per row stacked bottom-up (column-reverse)
    // so the column width stays fixed regardless of digit count.
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column-reverse',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: '2px',
            width: '100%',
            height: '100%',
        }}>
            {Array.from({ length: count }, (_, i) => (
                <Glyph key={i} place={place} style={style} color={color} />
            ))}
        </div>
    );
}

function Glyph({ place, style, color }: { place: MabPlace; style: MabStyle; color: string }) {
    if (style === 'symbolic') {
        if (place === 'thousands') return <SymbolicThousands color={color} />;
        if (place === 'hundreds')  return <SymbolicHundreds color={color} />;
        if (place === 'tens')      return <SymbolicTens color={color} />;
        return <SymbolicUnits color={color} />;
    }
    const fill = resolveFill(style, place, color);
    if (place === 'thousands') return <RealisticThousands stroke={color} fill={fill} />;
    if (place === 'hundreds')  return <RealisticHundreds stroke={color} fill={fill} />;
    if (place === 'tens')      return <RealisticTens stroke={color} fill={fill} />;
    return <RealisticUnits stroke={color} fill={fill} />;
}

// ── Symbolic glyphs ──────────────────────────────────────────────────────────

function SymbolicUnits({ color }: { color: string }) {
    const r = 2.5;
    return (
        <svg width={r * 2} height={r * 2}>
            <circle cx={r} cy={r} r={r} fill={color} />
        </svg>
    );
}

// Horizontal bar — stacked vertically inside the T column by MabPlaceColumn.
function SymbolicTens({ color }: { color: string }) {
    const W = 22, H = 3;
    return (
        <svg width={W} height={H}>
            <rect width={W} height={H} fill={color} />
        </svg>
    );
}

function SymbolicHundreds({ color }: { color: string }) {
    const SQ = 10;
    return (
        <svg width={SQ} height={SQ}>
            <rect width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
        </svg>
    );
}

function SymbolicThousands({ color }: { color: string }) {
    const SQ = 10, GAP = 2;
    const total = SQ * 2 + GAP;
    return (
        <svg width={total} height={total}>
            <rect x={0} y={0} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
            <rect x={SQ + GAP} y={0} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
            <rect x={0} y={SQ + GAP} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
            <rect x={SQ + GAP} y={SQ + GAP} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
        </svg>
    );
}

// ── Realistic Dienes glyphs (used by both mab-bw and mab-color) ──────────────

const CELL = 6;            // unit cube / tens-rod cell
const CELL_HUNDREDS = 7;   // each cell of the 10×10 flat → flat 70×70 (visibly biggest)
const CELL_THOUSANDS = 7;  // matches hundreds for visual continuity
const STROKE = 0.5;

function RealisticUnits({ stroke, fill }: { stroke: string; fill: string }) {
    return (
        <svg width={CELL} height={CELL}>
            <rect width={CELL} height={CELL} fill={fill} stroke={stroke} strokeWidth={STROKE} />
        </svg>
    );
}

// Tens rendered as a horizontal bar (CELL*10 wide × CELL tall). Stacked vertically
// by MabPlaceColumn so the T column always has a fixed width.
function RealisticTens({ stroke, fill }: { stroke: string; fill: string }) {
    const W = CELL * 10;
    return (
        <svg width={W} height={CELL}>
            <rect width={W} height={CELL} fill={fill} stroke={stroke} strokeWidth={STROKE} />
            {Array.from({ length: 9 }).map((_, j) => (
                <line key={j} x1={(j + 1) * CELL} y1={0} x2={(j + 1) * CELL} y2={CELL} stroke={stroke} strokeWidth={STROKE} />
            ))}
        </svg>
    );
}

function RealisticHundreds({ stroke, fill }: { stroke: string; fill: string }) {
    const C = CELL_HUNDREDS;
    const S = C * 10;
    return (
        <svg width={S} height={S}>
            <rect width={S} height={S} fill={fill} stroke={stroke} strokeWidth={STROKE} />
            {Array.from({ length: 9 }).map((_, j) => (
                <g key={j}>
                    <line x1={(j + 1) * C} y1={0} x2={(j + 1) * C} y2={S} stroke={stroke} strokeWidth={STROKE} />
                    <line x1={0} y1={(j + 1) * C} x2={S} y2={(j + 1) * C} stroke={stroke} strokeWidth={STROKE} />
                </g>
            ))}
        </svg>
    );
}

function RealisticThousands({ stroke, fill }: { stroke: string; fill: string }) {
    const C = CELL_THOUSANDS;
    const S = C * 10;
    const OFFSET = 4;
    const total = S + OFFSET;
    // Front face = 10x10 grid + isometric back face.
    return (
        <svg width={total} height={total}>
            <rect x={OFFSET} y={0} width={S} height={S} fill="none" stroke={stroke} strokeWidth={STROKE} />
            <line x1={0} y1={OFFSET} x2={OFFSET} y2={0} stroke={stroke} strokeWidth={STROKE} />
            <line x1={S} y1={OFFSET} x2={S + OFFSET} y2={0} stroke={stroke} strokeWidth={STROKE} />
            <line x1={S} y1={S + OFFSET} x2={S + OFFSET} y2={S} stroke={stroke} strokeWidth={STROKE} />
            <rect x={0} y={OFFSET} width={S} height={S} fill={fill} stroke={stroke} strokeWidth={STROKE} />
            {Array.from({ length: 9 }).map((_, j) => (
                <g key={j}>
                    <line x1={(j + 1) * C} y1={OFFSET} x2={(j + 1) * C} y2={S + OFFSET} stroke={stroke} strokeWidth={STROKE} />
                    <line x1={0} y1={OFFSET + (j + 1) * C} x2={S} y2={OFFSET + (j + 1) * C} stroke={stroke} strokeWidth={STROKE} />
                </g>
            ))}
        </svg>
    );
}
