// Pure geometry of the breuk pictures (BreukPicture.tsx): every part of one picture has the same
// angle or the same rectangle, so the tests can prove the parts are equal without a browser.

export type BreukKind = 'pizza' | 'taart' | 'reep' | 'strook' | 'cirkel';
export const BREUK_KINDS: readonly BreukKind[] = ['pizza', 'taart', 'reep', 'strook', 'cirkel'];

export const BREUK_MIN_D = 2;
export const BREUK_MAX_D = 12;

// Every picture is drawn in a square box of this many user units; `size` scales it.
export const BOX = 100;
export const CENTER = BOX / 2;

/** d clamped to 2..12 and n to 0..d, both whole: a picture never breaks on odd input. */
export function clampBreuk(n: number, d: number): { n: number; d: number } {
    const dd = Math.min(BREUK_MAX_D, Math.max(BREUK_MIN_D, Math.round(Number.isFinite(d) ? d : BREUK_MIN_D)));
    const nn = Math.min(dd, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));
    return { n: nn, d: dd };
}

// ── Round kinds (pizza, taart, cirkel) ───────────────────────────────────────

/** One slice: degrees clockwise from 12 o'clock. */
export interface Wedge { start: number; end: number }

/** d slices of 360/d degrees each, the first cut straight up (a half is cut top to bottom). */
export const wedgesOf = (d: number): Wedge[] =>
    Array.from({ length: d }, (_, i) => ({ start: (i * 360) / d, end: ((i + 1) * 360) / d }));

export function polar(r: number, deg: number): { x: number; y: number } {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

const f = (v: number) => v.toFixed(2);

/** A slice of radius r as an SVG path (centre, out, arc, back). */
export function wedgePath(r: number, w: Wedge): string {
    const a = polar(r, w.start), b = polar(r, w.end);
    const large = w.end - w.start > 180 ? 1 : 0;
    return `M ${f(CENTER)} ${f(CENTER)} L ${f(a.x)} ${f(a.y)} A ${r} ${r} 0 ${large} 1 ${f(b.x)} ${f(b.y)} Z`;
}

export interface Spot { x: number; y: number; r: number }

/**
 * Round toppings spread over one slice (pepperoni, cherries, cream dots): rings at the given radii,
 * as many per ring as the arc holds at `spacing`, each small enough to stay inside its slice.
 * The same d gives every slice the same count, so the slices stay visibly equal.
 */
export function spotsIn(w: Wedge, radii: readonly number[], spacing: number, maxR: number, minR = 2.5): Spot[] {
    const span = ((w.end - w.start) * Math.PI) / 180;
    const out: Spot[] = [];
    for (const ring of radii) {
        const arc = span * ring;
        const count = Math.max(1, Math.floor(arc / spacing));
        const r = Math.min(maxR, (arc / count) * 0.34);
        if (r < minR) continue;
        for (let k = 0; k < count; k++) {
            const p = polar(ring, w.start + ((w.end - w.start) * (k + 0.5)) / count);
            out.push({ x: p.x, y: p.y, r });
        }
    }
    return out;
}

// ── Rectangle kinds (reep, strook) ───────────────────────────────────────────

export interface Cell { x: number; y: number; w: number; h: number }

// Rows × columns of a chocolate bar: the most square-like factor pair; a prime d is one row.
const REEP_GRID: Readonly<Record<number, readonly [number, number]>> = {
    2: [1, 2], 3: [1, 3], 4: [2, 2], 5: [1, 5], 6: [2, 3], 7: [1, 7],
    8: [2, 4], 9: [3, 3], 10: [2, 5], 11: [1, 11], 12: [3, 4],
};
export const reepGrid = (d: number): { rows: number; cols: number } => {
    const [rows, cols] = REEP_GRID[d] ?? [1, d];
    return { rows, cols };
};

// The bar's rim around its pieces and the groove between two pieces (user units); a long one-row bar
// gets a thinner rim and groove so its pieces stay as wide as the box allows.
const rimOf = (cols: number) => (cols >= 7 ? 2.4 : 3);
const gapOf = (cols: number) => (cols >= 7 ? 1.8 : 2.4);

/**
 * The bar (frame) and its d equal pieces, centred in the box; read row by row. A one-row bar of 5 or
 * more pieces is a row of tall fingers (5, 7 and 11 have no grid), so each piece stays big enough to count.
 */
export function reepLayout(d: number): { frame: Cell; pieces: Cell[] } {
    const { rows, cols } = reepGrid(d);
    const rim = rimOf(cols), gap = gapOf(cols);
    const pw = Math.min(36, (BOX - 4 - 2 * rim - (cols - 1) * gap) / cols);
    const ph = rows === 1 && cols >= 5
        ? Math.min(54, pw * 3.2)
        : Math.min(pw * 0.8, (BOX - 20 - 2 * rim - (rows - 1) * gap) / rows);
    const fw = cols * pw + (cols - 1) * gap + 2 * rim;
    const fh = rows * ph + (rows - 1) * gap + 2 * rim;
    const frame = { x: (BOX - fw) / 2, y: (BOX - fh) / 2, w: fw, h: fh };
    const pieces = Array.from({ length: d }, (_, i) => ({
        x: frame.x + rim + (i % cols) * (pw + gap),
        y: frame.y + rim + Math.floor(i / cols) * (ph + gap),
        w: pw, h: ph,
    }));
    return { frame, pieces };
}

/** d equal squares side by side, centred in the box. */
export function strookCells(d: number): Cell[] {
    const s = Math.min(30, (BOX - 6) / d);
    const x0 = (BOX - s * d) / 2, y0 = (BOX - s) / 2;
    return Array.from({ length: d }, (_, i) => ({ x: x0 + i * s, y: y0, w: s, h: s }));
}

// ── Labels ───────────────────────────────────────────────────────────────────

/** What a screen reader hears: "Pizza in 8 stukken, 3 met beleg". */
export function breukAriaLabel(kind: BreukKind, n: number, d: number): string {
    switch (kind) {
        case 'pizza': return `Pizza in ${d} stukken, ${n} met beleg`;
        case 'taart': return `Taart in ${d} stukken, ${n} met glazuur`;
        case 'reep': return `Chocoladereep in ${d} stukjes, ${n} gekleurd`;
        case 'strook': return `Strook in ${d} vakjes, ${n} gekleurd`;
        case 'cirkel': return `Cirkel in ${d} delen, ${n} gekleurd`;
    }
}
