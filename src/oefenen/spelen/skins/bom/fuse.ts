// The Bom's fuse and clock, in the skin's SVG units (viewBox 0 0 300 260). Pure, so they are testable.

export const BOM = {
    // The last stretch: the spark flickers faster and the bomb breathes a little (gentle, nothing scary).
    hurryMs: 30_000,
    // More segments than this go on a second row of the "ontmanteld" bar.
    rowMax: 25,
} as const;

type P = readonly [number, number];
// Two cubic pieces from the cap (start) to the free end (where the spark starts burning).
const PIECES: readonly (readonly [P, P, P, P])[] = [
    [[148, 72], [150, 42], [194, 54], [206, 28]],
    [[206, 28], [216, 6], [238, 4], [256, 16]],
];
export const FUSE_PATH = `M148 72 C150 42 194 54 206 28 C216 6 238 4 256 16`;

const cubic = (a: number, b: number, c: number, d: number, t: number) =>
    (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;

// Points along the fuse with their running length, so a fraction of the fuse is a fraction of its length.
const STEPS = 40;
const LUT: { x: number; y: number; len: number }[] = (() => {
    const pts: { x: number; y: number; len: number }[] = [];
    for (const [a, b, c, d] of PIECES) {
        for (let i = pts.length ? 1 : 0; i <= STEPS; i++) {
            const t = i / STEPS;
            const x = cubic(a[0], b[0], c[0], d[0], t);
            const y = cubic(a[1], b[1], c[1], d[1], t);
            const prev = pts.at(-1);
            pts.push({ x, y, len: prev ? prev.len + Math.hypot(x - prev.x, y - prev.y) : 0 });
        }
    }
    return pts;
})();

/** What is left of the fuse (1 = whole, 0 = burnt to the cap). */
export function fuseLeft(msLeft: number | null, msTotal: number | null): number {
    if (msLeft === null || !msTotal) return 1;
    return Math.min(1, Math.max(0, msLeft / msTotal));
}

/** The burning end: the point at this fraction of the fuse's length, from the cap. */
export function fusePoint(f: number): { x: number; y: number } {
    const want = Math.min(1, Math.max(0, f)) * LUT[LUT.length - 1].len;
    const i = LUT.findIndex(p => p.len >= want);
    if (i <= 0) return { x: LUT[0].x, y: LUT[0].y };
    const a = LUT[i - 1];
    const b = LUT[i];
    const k = b.len === a.len ? 0 : (want - a.len) / (b.len - a.len);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

export const isHurry = (msLeft: number | null) => msLeft !== null && msLeft > 0 && msLeft <= BOM.hurryMs;

/** The big clock on the bomb: 3:00, 0:09. */
export function clockText(ms: number | null): string {
    const s = Math.max(0, Math.ceil((ms ?? 0) / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
