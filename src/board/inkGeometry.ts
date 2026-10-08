import type { ArrowHeads, ShapeKind, Stroke } from './boardTypes';

// Pure ink geometry: grid / angle snapping, the exact SVG paths the line and shape tools
// emit, and the per-stroke hit-test the eraser uses. No React, no store.

const r1 = (v: number) => Math.round(v * 10) / 10;

export const snapToGrid = (v: number, on: boolean, size: number) => (on && size > 0 ? Math.round(v / size) * size : v);

// Shift on a line: the end moves onto the nearest 0/45/90° ray from the start. The length
// is measured along that ray (diagonals in dx units), so grid snapping keeps it on the grid.
export function snapAngle(x0: number, y0: number, x: number, y: number, grid: number): [number, number] {
    const dx = x - x0, dy = y - y0;
    const step = Math.PI / 4;
    const a = Math.round(Math.atan2(dy, dx) / step) * step;
    const ux = Math.round(Math.cos(a)), uy = Math.round(Math.sin(a));
    let t = ux && uy ? (dx * ux + dy * uy) / 2 : dx * ux + dy * uy;
    if (grid > 0) t = Math.round(t / grid) * grid;
    return [x0 + t * ux, y0 + t * uy];
}

// Arrowhead length scales with the stroke so a thick arrow keeps a readable head; capped at
// 40% of the line so both heads of a short arrow never overlap.
export const headLength = (width: number, len: number) => Math.min(width * 3 + 8, len * 0.4);
const HEAD_HALF_ANGLE = Math.PI / 7;   // ≈ 26°: a slim head that still reads at the back of a class

function headAt(tipX: number, tipY: number, fromX: number, fromY: number, L: number): { path: string; baseX: number; baseY: number } {
    const a = Math.atan2(tipY - fromY, tipX - fromX);
    const lx = tipX - L * Math.cos(a - HEAD_HALF_ANGLE), ly = tipY - L * Math.sin(a - HEAD_HALF_ANGLE);
    const rx = tipX - L * Math.cos(a + HEAD_HALF_ANGLE), ry = tipY - L * Math.sin(a + HEAD_HALF_ANGLE);
    const back = L * Math.cos(HEAD_HALF_ANGLE);
    return {
        path: `M ${r1(tipX)} ${r1(tipY)} L ${r1(lx)} ${r1(ly)} L ${r1(rx)} ${r1(ry)} Z`,
        baseX: tipX - back * Math.cos(a), baseY: tipY - back * Math.sin(a),
    };
}

// Line encoding: the first subpath is the shaft (`M x0 y0 L x1 y1`), each arrowhead a closed
// filled triangle after it. The shaft stops at the head's base so a round cap never pokes
// through the tip; with fill = colour the zero-area shaft stays a line and the heads fill.
export function linePath(x0: number, y0: number, x1: number, y1: number, width: number, arrow: ArrowHeads): string {
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (arrow === 'none' || len === 0) return `M ${r1(x0)} ${r1(y0)} L ${r1(x1)} ${r1(y1)}`;
    const L = headLength(width, len);
    const end = headAt(x1, y1, x0, y0, L);
    let sx = x0, sy = y0, heads = end.path;
    if (arrow === 'both') {
        const start = headAt(x0, y0, x1, y1, L);
        sx = start.baseX; sy = start.baseY;
        heads = `${start.path} ${end.path}`;
    }
    return `M ${r1(sx)} ${r1(sy)} L ${r1(end.baseX)} ${r1(end.baseY)} ${heads}`;
}

// Normalised box from two drag corners; Shift makes it square (side = the larger extent,
// growing in the drag direction).
export function dragBox(x0: number, y0: number, x1: number, y1: number, square: boolean) {
    let w = x1 - x0, h = y1 - y0;
    if (square) {
        const side = Math.max(Math.abs(w), Math.abs(h));
        w = Math.sign(w || 1) * side;
        h = Math.sign(h || 1) * side;
    }
    return { x: Math.min(x0, x0 + w), y: Math.min(y0, y0 + h), w: Math.abs(w), h: Math.abs(h) };
}

// Exact outline per shape: straight edges as L, ellipses as two half-arcs (A). Returns the
// path plus the outline as a closed polyline for the hit-test (ellipse: 48 chords, < 0.3%
// off the true curve at board sizes).
export function shapeGeometry(kind: ShapeKind, box: { x: number; y: number; w: number; h: number }): { path: string; pts: number[] } {
    const { x, y, w, h } = box;
    if (kind === 'ellipse') {
        const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
        const path = `M ${r1(x)} ${r1(cy)} A ${r1(rx)} ${r1(ry)} 0 1 0 ${r1(x + w)} ${r1(cy)} A ${r1(rx)} ${r1(ry)} 0 1 0 ${r1(x)} ${r1(cy)} Z`;
        const pts: number[] = [];
        for (let i = 0; i <= 48; i++) {
            const t = (i / 48) * Math.PI * 2;
            pts.push(r1(cx + rx * Math.cos(t)), r1(cy + ry * Math.sin(t)));
        }
        return { path, pts };
    }
    const corners = kind === 'triangle'
        // Isosceles, apex up — the triangle a pupil draws first.
        ? [x + w / 2, y, x + w, y + h, x, y + h]
        : [x, y, x + w, y, x + w, y + h, x, y + h];
    const c = corners.map(r1);
    let path = `M ${c[0]} ${c[1]}`;
    for (let i = 2; i < c.length; i += 2) path += ` L ${c[i]} ${c[i + 1]}`;
    return { path: `${path} Z`, pts: [...c, c[0], c[1]] };
}

// Squared distance from (x, y) to segment (ax, ay)–(bx, by).
function segDist2(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2)) : 0;
    const px = ax + t * dx - x, py = ay + t * dy - y;
    return px * px + py * py;
}

// Per-stroke hit-test: pts are a polyline (pen samples, a line's two ends, a shape's closed
// outline), so the distance to each segment counts — a two-point line is hittable along its
// whole length, not just at its ends. Old strokes without pts never hit.
export function strokeHit(s: Stroke, x: number, y: number, radius: number): boolean {
    const pts = s.pts ?? [];
    const reach2 = (s.width / 2 + radius) ** 2;
    if (pts.length === 2) {
        const dx = pts[0] - x, dy = pts[1] - y;
        return dx * dx + dy * dy <= reach2;
    }
    for (let i = 0; i + 3 < pts.length; i += 2) {
        if (segDist2(x, y, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= reach2) return true;
    }
    return false;
}

// The subpaths of a path string ("M … M …" → ["M …", "M …"]): a dashed line dashes only its
// shaft, the heads after it stay solid.
export function splitSubpaths(path: string): string[] {
    return path.split(/(?=M)/).map(p => p.trim()).filter(Boolean);
}
