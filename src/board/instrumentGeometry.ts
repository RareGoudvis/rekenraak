import { PX_PER_MM } from '../components/viewer/cijferGrid';
import type { Instrument, InstrumentKind, Stroke } from './boardTypes';

// Pure geometry for the meetinstrumenten (lat, geodriehoek, passer): board units, snapping,
// local ↔ board transforms. No React, no store — the layer and the ink tool call in here.

// One board mm = one CSS mm at 96 dpi, the same constant the sheet is laid out in, so a
// 5 cm line on the board's lat is 5 cm on the sheet's ruler too.
export const BOARD_MM_PX = PX_PER_MM;
export const BOARD_CM_PX = PX_PER_MM * 10;

export const INSTRUMENT_KINDS: InstrumentKind[] = ['lat', 'geodriehoek', 'passer'];
export const INSTRUMENT_LABELS: Record<InstrumentKind, string> = {
    lat: 'Lat', geodriehoek: 'Geodriehoek', passer: 'Passer',
};

// Owner rule: instruments snap. Rotation to 0/45/90° multiples (15° with the grid on) within
// 3°; the reference point to grid points and stroke endpoints within 8 px.
export const ROTATION_SNAP_DEG = 3;
export const POINT_SNAP_PX = 8;

// ── Dimensions (board px, in each instrument's local frame) ─────────────────
// Lat: x runs along the measuring edge (y = 0) from its zero mark; the body hangs below (+y).
export const LAT = {
    cm: 20,
    pad: 0.6 * BOARD_CM_PX,            // plastic before 0 and after 20
    h: 3.2 * BOARD_CM_PX,
};
// Geodriehoek: origin = hypotenuse midpoint, hypotenuse on y = 0 from -8 to 8 cm, the right
// angle at (0, 8 cm): an isosceles right triangle with a 16 cm hypotenuse.
export const GEO = {
    half: 8 * BOARD_CM_PX,
};
// Passer: legs of 12 cm; the opening runs from 0.5 cm to 90 % of the span the legs allow.
export const PASSER = {
    leg: 12 * BOARD_CM_PX,
    minR: 0.5 * BOARD_CM_PX,
    maxR: 21.5 * BOARD_CM_PX,
};

// ── Transforms ───────────────────────────────────────────────────────────────
type Placed = Pick<Instrument, 'x' | 'y' | 'rotation'>;
const RAD = Math.PI / 180;

export function toWorld(inst: Placed, lx: number, ly: number): [number, number] {
    const c = Math.cos(inst.rotation * RAD), s = Math.sin(inst.rotation * RAD);
    return [inst.x + lx * c - ly * s, inst.y + lx * s + ly * c];
}

export function toLocal(inst: Placed, wx: number, wy: number): [number, number] {
    const c = Math.cos(inst.rotation * RAD), s = Math.sin(inst.rotation * RAD);
    const dx = wx - inst.x, dy = wy - inst.y;
    return [dx * c + dy * s, -dx * s + dy * c];
}

export const normDeg = (d: number) => ((d % 360) + 360) % 360;
export const round1 = (v: number) => Math.round(v * 10) / 10;

// ── Snapping ─────────────────────────────────────────────────────────────────
export function snapRotation(deg: number, gridOn: boolean, tol = ROTATION_SNAP_DEG): { deg: number; snapped: boolean } {
    const d = normDeg(deg);
    let best: number | null = null;
    for (const step of gridOn ? [45, 15] : [45]) {
        const target = Math.round(d / step) * step;
        if (Math.abs(target - d) <= tol && (best === null || Math.abs(target - d) < Math.abs(best - d))) best = target;
    }
    return best === null ? { deg: d, snapped: false } : { deg: normDeg(best), snapped: true };
}

export type SnapKind = 'grid' | 'endpoint';
export function snapPoint(
    x: number, y: number,
    opts: { gridSize: number | null; points: number[]; tol?: number },
): { x: number; y: number; snapped: SnapKind | null } {
    const tol = opts.tol ?? POINT_SNAP_PX;
    let best: { x: number; y: number; d: number; kind: SnapKind } | null = null;
    const pts = opts.points;
    for (let i = 0; i + 1 < pts.length; i += 2) {
        const d = Math.hypot(pts[i] - x, pts[i + 1] - y);
        if (d <= tol && (!best || d < best.d)) best = { x: pts[i], y: pts[i + 1], d, kind: 'endpoint' };
    }
    if (opts.gridSize && opts.gridSize > 0) {
        const gx = Math.round(x / opts.gridSize) * opts.gridSize;
        const gy = Math.round(y / opts.gridSize) * opts.gridSize;
        const d = Math.hypot(gx - x, gy - y);
        // Endpoints win ties: joining a drawn figure matters more than the grid.
        if (d <= tol && (!best || d < best.d)) best = { x: gx, y: gy, d, kind: 'grid' };
    }
    return best ? { x: best.x, y: best.y, snapped: best.kind } : { x, y, snapped: null };
}

// SVG path args per command; a repeated command reuses the same count (implicit repeats).
const ARGS: Record<string, number> = { m: 2, l: 2, h: 1, v: 1, q: 4, t: 2, c: 6, s: 4, a: 7, z: 0 };

// First and last point of an SVG path (absolute and relative commands), or null when
// the data is not a path. Lines from the line tool are plain M…L, arcs end on their A.
export function pathEndpoints(d: string): [number, number, number, number] | null {
    const tokens = d.match(/[MmLlHhVvQqTtCcSsAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g);
    if (!tokens || !/^[Mm]$/.test(tokens[0])) return null;
    let cx = 0, cy = 0, sx = 0, sy = 0;
    let first: [number, number] | null = null;
    let i = 0;
    let cmd = '';
    while (i < tokens.length) {
        if (/^[A-Za-z]$/.test(tokens[i])) { cmd = tokens[i++]; if (cmd === 'z' || cmd === 'Z') { cx = sx; cy = sy; continue; } }
        const lower = cmd.toLowerCase();
        const n = ARGS[lower];
        if (!n || i + n > tokens.length) return null;
        const a = tokens.slice(i, i + n).map(Number);
        if (a.some(v => !Number.isFinite(v))) return null;
        i += n;
        const rel = cmd === lower;
        if (lower === 'h') cx = rel ? cx + a[0] : a[0];
        else if (lower === 'v') cy = rel ? cy + a[0] : a[0];
        else {
            const ex = a[n - 2], ey = a[n - 1];
            cx = rel ? cx + ex : ex;
            cy = rel ? cy + ey : ey;
        }
        if (lower === 'm') {
            sx = cx; sy = cy;
            if (!first) first = [cx, cy];
            // A moveto's extra pairs are implicit linetos.
            cmd = rel ? 'l' : 'L';
        }
    }
    return first ? [first[0], first[1], cx, cy] : null;
}

// Every stroke's two endpoints as a flat [x0,y0,x1,y1,…] list (the instruments' snap targets).
export function strokeEndpoints(strokes: Stroke[]): number[] {
    const out: number[] = [];
    for (const s of strokes) {
        const e = pathEndpoints(s.path);
        if (e) { out.push(...e); continue; }
        const p = s.pts ?? [];
        if (p.length >= 2) out.push(p[0], p[1], p[p.length - 2], p[p.length - 1]);
    }
    return out;
}

// ── Placement ────────────────────────────────────────────────────────────────
// A fresh instrument lands centred-ish on the visible board (each kind in its own spot,
// so toggling all three never stacks them).
export function defaultInstrument(kind: InstrumentKind, boardW: number, boardH: number): Omit<Instrument, 'id'> {
    const w = boardW > 0 ? boardW : 1280, h = boardH > 0 ? boardH : 720;
    const cx = w / 2, cy = h / 2;
    switch (kind) {
        case 'lat':
            return { kind, x: Math.round(cx - (LAT.cm * BOARD_CM_PX) / 2), y: Math.round(Math.max(40, cy - 260)), rotation: 0 };
        case 'geodriehoek':
            return { kind, x: Math.round(cx), y: Math.round(Math.max(60, cy - 90)), rotation: 0 };
        case 'passer':
            return { kind, x: Math.round(cx + 10 * BOARD_CM_PX), y: Math.round(Math.min(h - 60, cy + 280)), rotation: 0, radius: 5 * BOARD_CM_PX };
    }
}

// The body outline in local coordinates (lat and geodriehoek); `inset` shrinks it inwards,
// which is the grab zone while an ink tool is active (the band along each edge draws).
export function bodyPolygon(kind: InstrumentKind, inset = 0): number[] {
    if (kind === 'lat') {
        const x0 = -LAT.pad + inset, x1 = LAT.cm * BOARD_CM_PX + LAT.pad - inset;
        return [x0, inset, x1, inset, x1, LAT.h - inset, x0, LAT.h - inset];
    }
    if (kind === 'geodriehoek') {
        // Each side moves inward by `inset`: the hypotenuse to y = inset, the legs (x ± y = half)
        // by inset·√2 along y.
        const k = GEO.half - inset * Math.SQRT2;
        return [-(k - inset), inset, k - inset, inset, 0, k];
    }
    return [];
}

export const polyPoints = (p: number[]) => p.reduce((acc, v, i) => acc + (i % 2 ? `,${round1(v)} ` : `${round1(v)}`), '').trim();

// A pen started within this distance of an edge follows it; the same band stays clear of the
// instrument's grab zone while an ink tool is active.
export const EDGE_TOL_PX = 10;

// Passer hinge in the passer's local frame (needle at the origin, pencil at (r, 0)): legs of
// PASSER.leg meet above the chord's midpoint.
export function passerHinge(radius: number): [number, number] {
    const half = Math.min(radius, PASSER.maxR) / 2;
    return [half, -Math.sqrt(Math.max(0, PASSER.leg ** 2 - half ** 2))];
}
