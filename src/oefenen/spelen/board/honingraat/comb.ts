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
