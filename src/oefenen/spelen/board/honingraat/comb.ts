// The honeycomb's geometry, in cell widths (Honingraat.tsx places the cells and the bee with it).

// A pointy-top hexagon: height / width.
const HEX_H = 2 / Math.sqrt(3);

// Rows of the comb; a short row sits half a cell in, so the cells interlock.
export function combRows(n: number): number[] {
    const pattern = n >= 14 ? [5, 4, 5] : [4, 5, 4];
    const out: number[] = [];
    let left = n;
    for (let r = 0; left > 0; r++) {
        const p = pattern[r % pattern.length];
        out.push(Math.min(p, left));
        left -= p;
    }
    return out;
}

/** Each cell's centre in cell widths, and the comb's size. */
export function combLayout(n: number): { cells: { x: number; y: number }[]; width: number; height: number } {
    const pattern = n >= 14 ? [5, 4, 5] : [4, 5, 4];
    const rows = combRows(n);
    const width = Math.max(...pattern);
    const cells: { x: number; y: number }[] = [];
    rows.forEach((count, r) => {
        const x0 = (width - pattern[r % pattern.length]) / 2;
        for (let c = 0; c < count; c++) cells.push({ x: x0 + c + 0.5, y: HEX_H / 2 + r * HEX_H * 0.75 });
    });
    return { cells, width, height: HEX_H * (1 + 0.75 * (rows.length - 1)) };
}

// The flower meadow's grid, in cell widths: a head (a bit bigger than a comb cell, so its heart holds the comb's text
// size) and a clear gap side by side, rows half a step apart so each stem runs down between the heads below. A phone in
// portrait gets narrow rows of 3 and 2. SYNC: honingraat.css .hx-meadow --hx-head.
export const MEADOW = { dx: 1.3, dy: 1, dyUpright: 1.06, head: 1.12 } as const;

/** Each flower head's centre in cell widths, and the bed's size (heads only; the stems hang below). */
export function meadowLayout(n: number, portrait: boolean): { cells: { x: number; y: number }[]; width: number; height: number } {
    const pattern = portrait ? [3, 2] : n >= 14 ? [5, 4, 5] : [4, 5, 4];
    const rows: number[] = [];
    for (let left = n, r = 0; left > 0; r++) {
        rows.push(Math.min(pattern[r % pattern.length], left));
        left -= pattern[r % pattern.length];
    }
    const width = Math.max(...pattern) * MEADOW.dx;
    const dy = portrait ? MEADOW.dyUpright : MEADOW.dy;
    const cells: { x: number; y: number }[] = [];
    rows.forEach((count, r) => {
        const x0 = (width - pattern[r % pattern.length] * MEADOW.dx) / 2;
        for (let c = 0; c < count; c++) cells.push({ x: x0 + (c + 0.5) * MEADOW.dx, y: MEADOW.head / 2 + r * dy });
    });
    return { cells, width, height: (rows.length - 1) * dy + MEADOW.head };
}

// The wax around the cells to find: the comb's edge, in cell widths beyond the cells.
export const COMB_RIM = { side: 0.45, top: 0.3, bottom: 0.4 } as const;

export type DecorKind = 'wax' | 'honey' | 'capped' | 'egg' | 'larva';
const DECOR: readonly DecorKind[] = ['wax', 'capped', 'egg', 'honey', 'larva', 'wax', 'capped', 'larva', 'egg', 'honey', 'wax'];

/** The lattice cells around the comb (cut off by its wax edge): honey, capped honey, an egg or a larva. Seeded by position. */
export function combDecor(n: number): { x: number; y: number; kind: DecorKind }[] {
    const { cells, width, height } = combLayout(n);
    const rows = combRows(n).length;
    const taken = new Set(cells.map(c => `${c.x}|${c.y}`));
    // Row 0's centres sit on whole or half cell widths; the lattice alternates from there.
    const parity0 = cells[0].x % 1;
    const out: { x: number; y: number; kind: DecorKind }[] = [];
    for (let r = -1; r <= rows; r++) {
        const y = HEX_H / 2 + r * HEX_H * 0.75;
        if (y - HEX_H / 2 > height + COMB_RIM.bottom || y + HEX_H / 2 < -COMB_RIM.top) continue;
        const off = (parity0 + (Math.abs(r) % 2) * 0.5) % 1;
        for (let x = off - 1; x <= width + 1; x += 1) {
            if (taken.has(`${x}|${y}`)) continue;
            out.push({ x, y, kind: DECOR[Math.abs(Math.round(x * 7 + r * 13 + n)) % DECOR.length] });
        }
    }
    return out;
}
