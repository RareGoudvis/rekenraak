import type { MabStyle } from '../../services/math/types';
import { kioskMabLayout, type KioskRect } from './mabKioskLayout';

// Renders place-value blocks for one MAB exercise. Three visual conventions:
//   symbolic:   units = dot, tens = bar, hundreds = small outlined square,
//               thousands = stacked-square stamp. Compact textbook abbreviation.
//   mab-bw:     Dienes blocks — units = 1×1 cube, tens = 1×10 rod,
//               hundreds = 10×10 flat, thousands = 10×10×10 cube.
//   mab-color:  Same as mab-bw but coloured per place value (yellow/green/red/blue).
// Square pattern (herkennen, and every sheet above 1000): every place in 2-row domino pairs
// with upright rods, so nine of any piece (nine duizendtallen too) fit their column.

export type MabPlace = 'thousands' | 'hundreds' | 'tens' | 'units';

// The glyph geometry below stays written in px (a tens rod IS ten unit cubes wide), but it
// is emitted as the SVG viewBox and as `em` on the element, so the whole Dienes figure
// follows the teacher's Lettergrootte slider. 13pt (the --sheet-size-math default) = 17.33px,
// so at the default the em values reproduce today's pixels exactly.
// SYNC: MabViewer.tsx repeats these two lines and sets fontSize: var(--sheet-size-math)
// on the figure, so the table columns and the glyphs inside them scale together.
const PX_PER_EM_AT_DEFAULT = 17.33;
const em = (px: number): string => `${px / PX_PER_EM_AT_DEFAULT}em`;

// Kiosk tens: five to a group is the MAB convention for counting a rod stack; the symbolic bar is
// thicker there because 3.5px bars two apart read as an equals sign on a pupil's screen.
const TENS_GROUP = 5, KIOSK_TENS_GROUP_GAP = 9, KIOSK_TENS_GAP = 4, KIOSK_BAR_H = 5.5;

interface ColumnProps {
    count: number;
    place: MabPlace;
    style: MabStyle;
    color?: string;
    // Bordmodus MAB-mat: a teacher-picked fill per place; strokes stay `color`. The sheet never passes it.
    fill?: string;
    // Oefenmodus card: a duizendtal is drawn as a labelled cube (KioskThousands). The sheet never passes it.
    kiosk?: boolean;
    // Oefenmodus card: the place cell's box in px; the column then draws at a scale derived from it.
    cell?: { w: number; h: number };
    // Sheet: lay every place in the 2-row square pattern (PATTERN_GLYPH). The kiosk card ignores it.
    squarePattern?: boolean;
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

export function MabPlaceColumn({ count, place, style, color = '#000', fill, kiosk, cell, squarePattern }: ColumnProps) {
    if (count === 0) return null;

    // Oefenmodus card: one SVG per place cell, pieces sized from the cell's own box.
    if (kiosk && cell) return <KioskColumn count={count} place={place} style={style} color={color} fill={fill} cellW={cell.w} cellH={cell.h} />;

    if (squarePattern && !kiosk) return <SquarePatternGrid count={count} place={place} style={style} color={color} fill={fill} />;

    // Kiosk thousands: two labelled cubes fit the D column side by side, five high.
    if (kiosk && place === 'thousands') {
        return <PatternedGrid count={count} maxRows={5} place="thousands" style={style} color={color} fill={fill} kiosk />;
    }

    // Units: column-first 2-row "domino" pattern (1, 2, 3, 4…) for subitizing.
    if (place === 'units') {
        return <PatternedGrid count={count} maxRows={2} place="units" style={style} color={color} fill={fill} />;
    }

    // Kiosk hundreds: rows of three filled from the bottom, so 5 reads as a full row plus two on top
    // instead of the sheet's ragged column-first stack.
    if (kiosk && place === 'hundreds') {
        return <PatternedGrid count={count} maxRows={3} place="hundreds" style={style} color={color} fill={fill} kiosk rowFirst />;
    }

    // Kiosk tens: groups of five with a gap (MAB convention), so 2 vs 3 bars read at a glance.
    if (kiosk && place === 'tens') {
        const groups = Array.from({ length: Math.ceil(count / TENS_GROUP) }, (_, g) => Math.min(TENS_GROUP, count - g * TENS_GROUP));
        return (
            <div style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: em(KIOSK_TENS_GROUP_GAP), width: '100%', height: '100%' }}>
                {groups.map((n, g) => (
                    <div key={g} data-mab-tens-group style={{ display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: em(style === 'symbolic' ? KIOSK_TENS_GAP : 2) }}>
                        {Array.from({ length: n }, (_, i) => <Glyph key={i} place="tens" style={style} color={color} fill={fill} chunky />)}
                    </div>
                ))}
            </div>
        );
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

// One piece of a place at a rect. Bw/colour pieces show their cells (a flat is 10 x 10, a rod 10 long).
function KioskPieceShape({ place, style, color, fill: fillOverride, r }: { place: MabPlace; style: MabStyle; color: string; fill?: string; r: KioskRect }) {
    const stroke = color, line = Math.max(0.6, r.w * 0.04);
    if (place === 'thousands') return <KioskThousands stroke={stroke} fill={style === 'symbolic' ? 'white' : fillOverride ?? resolveFill(style, place, color)} at={{ x: r.x, y: r.y, size: r.w }} />;
    if (style === 'symbolic') {
        const mark = fillOverride ?? color;
        if (place === 'units') return <circle cx={r.x + r.w / 2} cy={r.y + r.h / 2} r={r.w / 2} fill={mark} />;
        if (place === 'tens') return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={mark} />;
        return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="white" stroke={mark} strokeWidth={Math.max(1, r.w * 0.05)} />;
    }
    const fill = fillOverride ?? resolveFill(style, place, color);
    const cuts = place === 'units' ? 0 : 9;
    return (
        <g>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={fill} stroke={stroke} strokeWidth={line * 1.5} />
            {Array.from({ length: cuts }, (_, j) => place === 'tens'
                ? <line key={j} x1={r.x} x2={r.x + r.w} y1={r.y + (j + 1) * r.h / 10} y2={r.y + (j + 1) * r.h / 10} stroke={stroke} strokeWidth={line} />
                : <g key={j}>
                    <line x1={r.x + (j + 1) * r.w / 10} x2={r.x + (j + 1) * r.w / 10} y1={r.y} y2={r.y + r.h} stroke={stroke} strokeWidth={line} />
                    <line y1={r.y + (j + 1) * r.h / 10} y2={r.y + (j + 1) * r.h / 10} x1={r.x} x2={r.x + r.w} stroke={stroke} strokeWidth={line} />
                </g>)}
        </g>
    );
}

function KioskColumn({ count, place, style, color, fill, cellW, cellH }: { count: number; place: MabPlace; style: MabStyle; color: string; fill?: string; cellW: number; cellH: number }) {
    const { size, pieces } = kioskMabLayout(place, count, cellW, cellH);
    const shape = (r: KioskRect, i: number) => (
        <g key={i} data-mab-piece="" {...(place === 'hundreds' && { 'data-mab-hundred': '', 'data-row': Math.round(r.y) })}>
            <KioskPieceShape place={place} style={style} color={color} fill={fill} r={r} />
        </g>
    );
    // Tens sit in groups of five so 2 vs 3 rods read at a glance.
    const groups = place === 'tens' ? Array.from({ length: Math.ceil(pieces.length / 5) }, (_, g) => pieces.slice(g * 5, g * 5 + 5)) : null;
    return (
        <svg width={cellW} height={cellH} viewBox={`0 0 ${cellW} ${cellH}`} style={{ display: 'block' }} data-mab-kiosk-col={place} data-piece-px={size.toFixed(2)}>
            {groups
                ? groups.map((g, gi) => <g key={gi} data-mab-tens-group="">{g.map((r, i) => shape(r, i))}</g>)
                : pieces.map(shape)}
        </svg>
    );
}

/** One piece for the build tray, drawn like the card's (upright rod, flat with its grid); `px` = its long side. */
export function MabKioskTrayGlyph({ place, style, px }: { place: MabPlace; style: MabStyle; px: number }) {
    const w = place === 'tens' ? px / 10 : px;
    return (
        <svg width={em(w + 2)} height={em(px + 2)} viewBox={`-1 -1 ${w + 2} ${px + 2}`} data-mab-tray-glyph={place}>
            <KioskPieceShape place={place} style={style} color="#000" r={{ x: 0, y: 0, w, h: px }} />
        </svg>
    );
}

function PatternedGrid({ count, maxRows, place, style, color, fill, kiosk, rowFirst }: {
    count: number; maxRows: number; place: MabPlace; style: MabStyle; color: string; fill?: string; kiosk?: boolean;
    // Fill rows of `maxRows` cells from the bottom up (kiosk hundreds) instead of columns top-down.
    rowFirst?: boolean;
}) {
    const cols = rowFirst ? Math.min(count, maxRows) : Math.ceil(count / maxRows);
    const rows = rowFirst ? Math.ceil(count / maxRows) : maxRows;
    const cells: React.ReactNode[] = [];
    // Fill column by column, top-down within each column.
    for (let k = 0; k < cols; k++) {
        for (let r = 0; r < (rowFirst ? rows : maxRows); r++) {
            const idx = rowFirst ? r * maxRows + k : k * maxRows + r;
            if (idx >= count) break;
            cells.push(
                <div key={`${k}-${r}`} {...(rowFirst && { 'data-mab-hundred': true })} style={{ gridColumn: k + 1, gridRow: rowFirst ? rows - r : r + 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Glyph place={place} style={style} color={color} fill={fill} kiosk={kiosk} />
                </div>
            );
        }
    }
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, auto)`,
            gridTemplateRows: `repeat(${rows}, auto)`,
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

function Glyph({ place, style, color, fill: fillOverride, kiosk, chunky }: { place: MabPlace; style: MabStyle; color: string; fill?: string; kiosk?: boolean; chunky?: boolean }) {
    if (kiosk && place === 'thousands') return <KioskThousands stroke={color} fill={style === 'symbolic' ? 'white' : fillOverride ?? resolveFill(style, place, color)} />;
    if (style === 'symbolic') {
        // Symbolic glyphs are single-colour marks, so a picked fill recolours the whole mark.
        const mark = fillOverride ?? color;
        if (place === 'thousands') return <SymbolicThousands color={mark} />;
        if (place === 'hundreds')  return <SymbolicHundreds color={mark} />;
        if (place === 'tens')      return <SymbolicTens color={mark} w={SYM_BAR_W} h={chunky ? KIOSK_BAR_H : SYM_BAR_H} />;
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

// A bar: horizontal (stacked in the T column) or upright in the square pattern.
function SymbolicTens({ color, w, h }: { color: string; w: number; h: number }) {
    const W = w, H = h;
    return (
        <svg width={em(W)} height={em(H)} viewBox={`0 0 ${W} ${H}`}>
            <rect width={W} height={H} fill={color} />
        </svg>
    );
}

function SymbolicHundreds({ color, sq = SYM_SQ }: { color: string; sq?: number }) {
    const SQ = sq;
    return (
        <svg width={em(SQ)} height={em(SQ)} viewBox={`0 0 ${SQ} ${SQ}`}>
            <rect width={SQ} height={SQ} stroke={color} strokeWidth={1} fill="none" />
        </svg>
    );
}

function SymbolicThousands({ color, sq = SYM_SQ }: { color: string; sq?: number }) {
    const SQ = sq, GAP = 2;
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

// ── Square pattern ───────────────────────────────────────────────────────────
// Piece sizes (px at the 13pt default) and gaps: 2 rows, pairs of columns with
// PATTERN_GROUP_GAP between pairs, so 4 reads as a square and 9 as two squares plus one.
// SYNC: MabViewer.tsx PATTERN_GLYPH (column widths and the box-height floor derive from these).
const PATTERN_GROUP_GAP = 3;
// Columns n pieces take: two per full square of four, then the bottom pair of the next.
const patternCols = (n: number) => 2 * Math.floor(n / 4) + Math.min(n % 4, 2);
const PATTERN_GLYPH: Record<'symbolic' | 'mab', Record<MabPlace, { w: number; h: number; colGap: number; rowGap: number }>> = {
    symbolic: {
        units:     { w: SYM_DOT, h: SYM_DOT, colGap: 2, rowGap: 5 },
        // Bars four apart: at two, a pair reads as one thick stroke.
        tens:      { w: 3.5, h: 28, colGap: 4, rowGap: 6 },
        hundreds:  { w: 12, h: 12, colGap: 2, rowGap: 2 },
        thousands: { w: 26, h: 26, colGap: 4, rowGap: 4 },   // stamp of four 12px squares, 2 apart
    },
    mab: {
        units:     { w: 6, h: 6, colGap: 2, rowGap: 5 },
        tens:      { w: 5, h: 30, colGap: 2, rowGap: 6 },     // rod of ten 3px cells; rows 6 apart so a square of rods is not two long ones
        hundreds:  { w: 12, h: 12, colGap: 2, rowGap: 2 },
        thousands: { w: 34, h: 34, colGap: 4, rowGap: 4 },   // 10 x 3px front face + 4px depth
    },
};

function SquarePatternGrid({ count, place, style, color, fill: fillOverride }: { count: number; place: MabPlace; style: MabStyle; color: string; fill?: string }) {
    const g = PATTERN_GLYPH[style === 'symbolic' ? 'symbolic' : 'mab'][place];
    const cols = patternCols(count);
    // Squares of four, each filled bottom pair first: 2 lie side by side (two rods stacked would
    // read as one long rod), 4 is a square, 9 is two squares and one.
    const cells = Array.from({ length: count }, (_, i) => {
        const k = 2 * Math.floor(i / 4) + (i % 2);
        return (
            <div key={i} data-mab-pattern={place} style={{ gridColumn: k + 1, gridRow: i % 4 < 2 ? 2 : 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', marginLeft: k > 0 && k % 2 === 0 ? em(PATTERN_GROUP_GAP) : undefined }}>
                <PatternGlyph place={place} style={style} color={color} fill={fillOverride} w={g.w} h={g.h} />
            </div>
        );
    });
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, auto)`,
            gridTemplateRows: 'repeat(2, auto)',
            columnGap: em(g.colGap),
            rowGap: em(g.rowGap),
            justifyContent: 'center',
            alignContent: 'end',
            height: '100%',
        }}>
            {cells}
        </div>
    );
}

function PatternGlyph({ place, style, color, fill: fillOverride, w, h }: { place: MabPlace; style: MabStyle; color: string; fill?: string; w: number; h: number }) {
    if (style === 'symbolic') {
        const mark = fillOverride ?? color;
        if (place === 'thousands') return <SymbolicThousands color={mark} sq={(w - 2) / 2} />;
        if (place === 'hundreds')  return <SymbolicHundreds color={mark} sq={w} />;
        if (place === 'tens')      return <SymbolicTens color={mark} w={w} h={h} />;
        return <SymbolicUnits color={mark} />;
    }
    const fill = fillOverride ?? resolveFill(style, place, color);
    if (place === 'thousands') return <RealisticThousands stroke={color} fill={fill} cell={(w - 4) / 10} />;
    if (place === 'hundreds')  return <RealisticHundreds stroke={color} fill={fill} sq={w} />;
    if (place === 'tens')      return <RealisticTens stroke={color} fill={fill} vertical={{ w, h }} />;
    return <RealisticUnits stroke={color} fill={fill} />;
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

// Tens rendered as a horizontal bar (CELL*10 wide × CELL tall), stacked vertically by
// MabPlaceColumn so the T column keeps a fixed width; `vertical` = the square pattern's upright rod.
function RealisticTens({ stroke, fill, vertical }: { stroke: string; fill: string; vertical?: { w: number; h: number } }) {
    if (vertical) {
        const { w: W, h: H } = vertical, step = H / 10;
        return (
            <svg width={em(W)} height={em(H)} viewBox={`0 0 ${W} ${H}`}>
                <rect x={STROKE / 2} y={STROKE / 2} width={W - STROKE} height={H - STROKE} fill={fill} stroke={stroke} strokeWidth={STROKE} />
                {Array.from({ length: 9 }).map((_, j) => (
                    <line key={j} x1={0} y1={(j + 1) * step} x2={W} y2={(j + 1) * step} stroke={stroke} strokeWidth={STROKE} />
                ))}
            </svg>
        );
    }
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
function RealisticHundreds({ stroke, fill, sq = HUNDREDS_SQ }: { stroke: string; fill: string; sq?: number }) {
    return (
        <svg width={em(sq)} height={em(sq)} viewBox={`0 0 ${sq} ${sq}`}>
            <rect width={sq} height={sq} fill={fill} stroke={stroke} strokeWidth={STROKE} />
        </svg>
    );
}

// Oefenmodus: pupils read the symbolic stamp (four squares) as four hundreds, so the card and the
// tray draw a duizendtal as a heavy-outlined cube with its value on the front face.
// 35 px wide: two side by side still fit the D column (74 px).
function KioskThousands({ stroke, fill, at }: { stroke: string; fill: string; at?: { x: number; y: number; size: number } }) {
    const S = 30, OFFSET = 5, total = S + OFFSET;
    return (
        <svg {...(at ? { x: at.x, y: at.y, width: at.size, height: at.size } : { width: em(total), height: em(total) })} viewBox={`0 0 ${total} ${total}`} data-mab-thousand="">
            <path d={`M 0 ${OFFSET} L ${OFFSET} 0 L ${total} 0 L ${total} ${S} L ${S} ${total}`} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" />
            <line x1={S} y1={OFFSET} x2={total} y2={0} stroke={stroke} strokeWidth={1.5} />
            <rect x={0} y={OFFSET} width={S} height={S} fill={fill} stroke={stroke} strokeWidth={2.5} />
            <text x={S / 2} y={OFFSET + S / 2} textAnchor="middle" dominantBaseline="central" fontSize={9.5} fontWeight={700}
                style={{ fontFamily: 'var(--font-sheet-math)' }} fill={stroke}>1000</text>
        </svg>
    );
}

function RealisticThousands({ stroke, fill, cell = CELL_THOUSANDS }: { stroke: string; fill: string; cell?: number }) {
    const C = cell;
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
