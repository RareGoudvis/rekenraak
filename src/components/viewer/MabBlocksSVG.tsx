import type { MabStyle } from '../../services/math/types';

// Renders place-value blocks for one MAB exercise. Three visual conventions:
//   symbolic:   units = dot, tens = horizontal bar, hundreds = small outlined square,
//               thousands = stacked-square stamp. Compact textbook abbreviation.
//   mab-bw:     Dienes blocks — units = 1×1 cube, tens = 1×10 rod (horizontal),
//               hundreds = 10×10 flat, thousands = 10×10×10 cube.
//   mab-color:  Same as mab-bw but coloured per place value (yellow/green/red/blue).

export type MabPlace = 'thousands' | 'hundreds' | 'tens' | 'units';

// The glyph geometry below stays written in px (a tens rod IS ten unit cubes wide), but it
// is emitted as the SVG viewBox and as `em` on the element, so the whole Dienes figure
// follows the teacher's Lettergrootte slider. 13pt (the --sheet-size-math default) = 17.33px,
// so at the default the em values reproduce today's pixels exactly.
// SYNC: MabViewer.tsx repeats these two lines and sets fontSize: var(--sheet-size-math)
// on the figure, so the table columns and the glyphs inside them scale together.
const PX_PER_EM_AT_DEFAULT = 17.33;
const em = (px: number): string => `${px / PX_PER_EM_AT_DEFAULT}em`;

interface ColumnProps {
    count: number;
    place: MabPlace;
    style: MabStyle;
    color?: string;
    // Bordmodus MAB-mat: a teacher-picked fill per place; strokes stay `color`. The sheet never passes it.
    fill?: string;
    // Oefenmodus card: a duizendtal is drawn as a labelled cube (KioskThousands). The sheet never passes it.
    kiosk?: boolean;
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

export function MabPlaceColumn({ count, place, style, color = '#000', fill, kiosk }: ColumnProps) {
    if (count === 0) return null;

    // Kiosk thousands: two labelled cubes fit the D column side by side, five high.
    if (kiosk && place === 'thousands') {
        return <PatternedGrid count={count} maxRows={5} place="thousands" style={style} color={color} fill={fill} kiosk />;
    }

    // Units: column-first 2-row "domino" pattern (1, 2, 3, 4…) for subitizing.
    if (place === 'units') {
        return <PatternedGrid count={count} maxRows={2} place="units" style={style} color={color} fill={fill} />;
    }

    // Hundreds: 3-column × 3-row grid (column-first top-down) — up to 9 fit in the cell.
    if (place === 'hundreds') {
        return <PatternedGrid count={count} maxRows={3} place="hundreds" style={style} color={color} fill={fill} />;
    }

    // Tens / thousands: one glyph per row stacked bottom-up so column width stays fixed.
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column-reverse',
            flexWrap: 'nowrap',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: em(style === 'symbolic' ? SYM_TENS_GAP : 2),
            width: '100%',
            height: '100%',
        }}>
            {Array.from({ length: count }, (_, i) => (
                <Glyph key={i} place={place} style={style} color={color} fill={fill} />
            ))}
        </div>
    );
}

/** One block of a place, as the columns draw it (the kiosk's build tray). */
export function MabGlyph({ place, style, kiosk }: { place: MabPlace; style: MabStyle; kiosk?: boolean }) {
    return <Glyph place={place} style={style} color="#000" kiosk={kiosk} />;
}

function PatternedGrid({ count, maxRows, place, style, color, fill, kiosk }: {
    count: number; maxRows: number; place: MabPlace; style: MabStyle; color: string; fill?: string; kiosk?: boolean;
}) {
    const cols = Math.ceil(count / maxRows);
    const cells: React.ReactNode[] = [];
    // Fill column by column, top-down within each column.
    for (let k = 0; k < cols; k++) {
        for (let r = 0; r < maxRows; r++) {
            const idx = k * maxRows + r;
            if (idx >= count) break;
            cells.push(
                <div key={`${k}-${r}`} style={{ gridColumn: k + 1, gridRow: r + 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph place={place} style={style} color={color} fill={fill} kiosk={kiosk} />
                </div>
            );
        }
    }
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, auto)`,
            gridTemplateRows: `repeat(${maxRows}, auto)`,
            columnGap: em(3),
            rowGap: em(2),
            justifyContent: 'center',
            alignContent: 'end',
            height: '100%',
        }}>
            {cells}
        </div>
    );
}

function Glyph({ place, style, color, fill: fillOverride, kiosk }: { place: MabPlace; style: MabStyle; color: string; fill?: string; kiosk?: boolean }) {
    if (kiosk && place === 'thousands') return <KioskThousands stroke={color} fill={style === 'symbolic' ? 'white' : fillOverride ?? resolveFill(style, place, color)} />;
    if (style === 'symbolic') {
        // Symbolic glyphs are single-colour marks, so a picked fill recolours the whole mark.
        const mark = fillOverride ?? color;
        if (place === 'thousands') return <SymbolicThousands color={mark} />;
        if (place === 'hundreds')  return <SymbolicHundreds color={mark} />;
        if (place === 'tens')      return <SymbolicTens color={mark} />;
        return <SymbolicUnits color={mark} />;
    }
    const fill = fillOverride ?? resolveFill(style, place, color);
    if (place === 'thousands') return <RealisticThousands stroke={color} fill={fill} />;
    if (place === 'hundreds')  return <RealisticHundreds stroke={color} fill={fill} />;
    if (place === 'tens')      return <RealisticTens stroke={color} fill={fill} />;
    return <RealisticUnits stroke={color} fill={fill} />;
}

// ── Symbolic glyphs ──────────────────────────────────────────────────────────
// Sized to fill the sheet's place cell (64 x 70px, 6px padding) at the most a digit can ask:
// nine 7px dots in two rows, nine 14px squares 3 across, nine 3.5px bars 3px apart (58px).
// At 5px dots / 3px bars 2px apart, nine tens read as one solid block (sweep 2026-09-27).
// SYNC: MabViewer's column width (HUNDRED_GLYPH_PX) and default boxHeight (70).
const SYM_DOT = 7, SYM_BAR_W = 40, SYM_BAR_H = 3.5, SYM_SQ = 14, SYM_TENS_GAP = 3;

function SymbolicUnits({ color }: { color: string }) {
    const r = SYM_DOT / 2;
    return (
        <svg width={em(r * 2)} height={em(r * 2)} viewBox={`0 0 ${r * 2} ${r * 2}`}>
            <circle cx={r} cy={r} r={r} fill={color} />
        </svg>
    );
}

// Horizontal bar — stacked vertically inside the T column by MabPlaceColumn.
function SymbolicTens({ color }: { color: string }) {
    const W = SYM_BAR_W, H = SYM_BAR_H;
    return (
        <svg width={em(W)} height={em(H)} viewBox={`0 0 ${W} ${H}`}>
            <rect width={W} height={H} fill={color} />
        </svg>
    );
}

function SymbolicHundreds({ color }: { color: string }) {
    const SQ = SYM_SQ;
    return (
        <svg width={em(SQ)} height={em(SQ)} viewBox={`0 0 ${SQ} ${SQ}`}>
            <rect width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
        </svg>
    );
}

function SymbolicThousands({ color }: { color: string }) {
    const SQ = SYM_SQ, GAP = 2;
    const total = SQ * 2 + GAP;
    return (
        <svg width={em(total)} height={em(total)} viewBox={`0 0 ${total} ${total}`}>
            <rect x={0} y={0} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
            <rect x={SQ + GAP} y={0} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
            <rect x={0} y={SQ + GAP} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
            <rect x={SQ + GAP} y={SQ + GAP} width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
        </svg>
    );
}

// ── Realistic Dienes glyphs (used by both mab-bw and mab-color) ──────────────

const CELL = 6;            // unit cube / tens-rod cell
// Hundreds sit in a 3x3 grid, not 2x5: the column is as wide as a duizendtal cube, so the
// height was the only thing holding them at 8px while horizontal room went unused. Three
// rows inside the same ~48px budget gives 3 x 14 + 2 x 2 = 46, so the plate nearly doubles
// and stops looking like the runt beside a 60px tens rod.
const HUNDREDS_SQ = 14;
const CELL_THOUSANDS = 7;  // thousands keeps the full 10×10 cube
const STROKE = 0.5;

function RealisticUnits({ stroke, fill }: { stroke: string; fill: string }) {
    return (
        <svg width={em(CELL)} height={em(CELL)} viewBox={`0 0 ${CELL} ${CELL}`}>
            <rect width={CELL} height={CELL} fill={fill} stroke={stroke} strokeWidth={STROKE} />
        </svg>
    );
}

// Tens rendered as a horizontal bar (CELL*10 wide × CELL tall). Stacked vertically
// by MabPlaceColumn so the T column always has a fixed width.
function RealisticTens({ stroke, fill }: { stroke: string; fill: string }) {
    const W = CELL * 10;
    return (
        <svg width={em(W)} height={em(CELL)} viewBox={`0 0 ${W} ${CELL}`}>
            <rect width={W} height={CELL} fill={fill} stroke={stroke} strokeWidth={STROKE} />
            {Array.from({ length: 9 }).map((_, j) => (
                <line key={j} x1={(j + 1) * CELL} y1={0} x2={(j + 1) * CELL} y2={CELL} stroke={stroke} strokeWidth={STROKE} />
            ))}
        </svg>
    );
}

// One hundred = a single filled square (larger than the unit cube). Multiple
// hundreds get tiled by MabPlaceColumn into a 2×5 grid so up to 9 fit.
function RealisticHundreds({ stroke, fill }: { stroke: string; fill: string }) {
    return (
        <svg width={em(HUNDREDS_SQ)} height={em(HUNDREDS_SQ)} viewBox={`0 0 ${HUNDREDS_SQ} ${HUNDREDS_SQ}`}>
            <rect width={HUNDREDS_SQ} height={HUNDREDS_SQ} fill={fill} stroke={stroke} strokeWidth={STROKE} />
        </svg>
    );
}

// Oefenmodus: pupils read the symbolic stamp (four squares) as four hundreds, so the card and the
// tray draw a duizendtal as a heavy-outlined cube with its value on the front face.
// 35 px wide: two side by side still fit the D column (74 px).
function KioskThousands({ stroke, fill }: { stroke: string; fill: string }) {
    const S = 30, OFFSET = 5, total = S + OFFSET;
    return (
        <svg width={em(total)} height={em(total)} viewBox={`0 0 ${total} ${total}`} data-mab-thousand="">
            <path d={`M 0 ${OFFSET} L ${OFFSET} 0 L ${total} 0 L ${total} ${S} L ${S} ${total}`} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
            <line x1={S} y1={OFFSET} x2={total} y2={0} stroke={stroke} strokeWidth={1.5} />
            <rect x={0} y={OFFSET} width={S} height={S} fill={fill} stroke={stroke} strokeWidth={2.5} />
            <text x={S / 2} y={OFFSET + S / 2} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={700}
                fontFamily="'Azeret Mono', monospace" fill={stroke}>1000</text>
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
        <svg width={em(total)} height={em(total)} viewBox={`0 0 ${total} ${total}`}>
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
