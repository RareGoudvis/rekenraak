import type { MabPlace } from './MabBlocksSVG';

// ── Oefenmodus card: pieces scale with the place cell ────────────────────────
// The sheet's glyphs are fixed px (a rod IS ten cubes wide), which left them ~20 px inside a
// 550 px table on a pupil's screen. On the card every place draws at the largest size at which
// its fullest digit (9; the tens' 9 rods in two groups, the units' 9 cubes in 5 + 4) still fits
// the cell's inner box, so sizes stay comparable across exercises and never overflow.
const KIOSK_CELL_FILL = 0.8;   // inner box = 80 % of the cell each way
const KIOSK_CELL_ASPECT = 1.3; // cell height / cell width on the card

export const kioskCellBox = (availableWidth: number, places: number): { w: number; h: number } => {
    const w = Math.floor((availableWidth - 16) / places);
    return { w, h: Math.round(w * KIOSK_CELL_ASPECT) };
};

export interface KioskRect { x: number; y: number; w: number; h: number }

// Rows of `perRow` pieces filled from the bottom, left to right, centred as a block.
function bottomRows(count: number, perRow: number, size: number, gap: number, cellW: number, cellH: number): KioskRect[] {
    const used = Math.min(count, perRow);
    const x0 = (cellW - (used * size + (used - 1) * gap)) / 2;
    const bottom = cellH * (1 - (1 - KIOSK_CELL_FILL) / 2);
    return Array.from({ length: count }, (_, i) => {
        const r = Math.floor(i / perRow), k = i % perRow;
        return { x: x0 + k * (size + gap), y: bottom - (r + 1) * size - r * gap, w: size, h: size };
    });
}

/** Where each piece of a place sits in its cell (px), plus the piece's main size. */
export function kioskMabLayout(place: MabPlace, count: number, cellW: number, cellH: number): { size: number; pieces: KioskRect[] } {
    const W = cellW * KIOSK_CELL_FILL, H = cellH * KIOSK_CELL_FILL;
    if (place === 'units') {
        const size = Math.min(W / (5 + 4 * 0.25), H / (2 + 0.25));
        return { size, pieces: bottomRows(count, 5, size, size * 0.25, cellW, cellH) };
    }
    if (place === 'hundreds') {
        const size = Math.min(W, H) / (3 + 2 * 0.1);
        return { size, pieces: bottomRows(count, 3, size, size * 0.1, cellW, cellH) };
    }
    if (place === 'thousands') {
        const perRow = count > 1 ? 2 : 1, rows = Math.ceil(count / perRow);
        const size = Math.min(W / (perRow * 1.1 - 0.1), H / (rows * 1.1 - 0.1));
        return { size, pieces: bottomRows(count, perRow, size, size * 0.1, cellW, cellH) };
    }
    // Tens: upright rods side by side, a wider gap after every fifth; rod height = ten rod widths.
    const IN = 0.35, GROUP = 1.2;
    const w = Math.min(W / (9 + 7 * IN + GROUP), H / 10);
    const xOf = (i: number) => Math.floor(i / 5) * (5 * (w + IN * w) - IN * w + GROUP * w) + (i % 5) * (w + IN * w);
    const total = xOf(count - 1) + w;
    const x0 = (cellW - total) / 2, bottom = cellH * (1 - (1 - KIOSK_CELL_FILL) / 2);
    return { size: w, pieces: Array.from({ length: count }, (_, i) => ({ x: x0 + xOf(i), y: bottom - 10 * w, w, h: 10 * w })) };
}
