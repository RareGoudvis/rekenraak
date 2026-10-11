import type { Stroke } from './boardTypes';
import { snapToGrid, strokeBounds, strokeHit } from './inkGeometry';
import { MIN_DRAG_PX } from './drawTools';

// The Selecteren tool (ink select): tap a stroke, lasso a box of strokes, drag the selection.
// Pure decisions only; the InkLayer feeds pointer events and applies the result to the store.

export interface Box { x: number; y: number; w: number; h: number }

// Same reach as the eraser: a finger on a digibord is not a mouse pointer.
export const SELECT_HIT_PX = 14;
// The dashed outline sits this far outside the ink, and a press inside it grabs the selection.
export const SELECTION_PAD_PX = 8;

export function topStrokeAt(strokes: Stroke[], x: number, y: number, radius = SELECT_HIT_PX): Stroke | null {
    // Last drawn is on top, so it wins where strokes cross.
    for (let i = strokes.length - 1; i >= 0; i--) if (strokeHit(strokes[i], x, y, radius)) return strokes[i];
    return null;
}

export function strokesInBox(strokes: Stroke[], box: Box): string[] {
    return strokes.filter(s => {
        const b = strokeBounds(s);
        return !!b && b.x >= box.x && b.y >= box.y && b.x + b.w <= box.x + box.w && b.y + b.h <= box.y + box.h;
    }).map(s => s.id);
}

// Union of the selected strokes' boxes, widened by half the ink width and the padding.
export function selectionBox(strokes: Stroke[], ids: string[], pad = SELECTION_PAD_PX): Box | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of strokes) {
        if (!ids.includes(s.id)) continue;
        const b = strokeBounds(s);
        if (!b) continue;
        const m = s.width / 2 + pad;
        x0 = Math.min(x0, b.x - m); y0 = Math.min(y0, b.y - m);
        x1 = Math.max(x1, b.x + b.w + m); y1 = Math.max(y1, b.y + b.h + m);
    }
    return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

const inside = (b: Box | null, x: number, y: number) => !!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

// With the grid on, the selection's geometry corner lands on a grid point (a line drawn on the
// grid stays on it; an off-grid scribble jumps onto it), so the delta itself is not a multiple.
export function snapMove(strokes: Stroke[], ids: string[], dx: number, dy: number, gridSnap: boolean, gridSize: number): [number, number] {
    if (!gridSnap) return [dx, dy];
    const corner = selectionBox(strokes.map(s => ({ ...s, width: 0 })), ids, 0);
    if (!corner) return [dx, dy];
    return [snapToGrid(corner.x + dx, true, gridSize) - corner.x, snapToGrid(corner.y + dy, true, gridSize) - corner.y];
}

export interface SelectContext {
    strokes: Stroke[];
    selected: string[];
    shift: boolean;
    gridSnap: boolean;
    gridSize: number;
}
export type SelectResult =
    | { kind: 'select'; ids: string[] }
    | { kind: 'move'; ids: string[]; dx: number; dy: number }
    | null;
export type SelectPreview = { marquee: Box } | { offset: [number, number]; ids: string[] } | null;
export interface SelectEngine {
    onPointerDown(x: number, y: number, ctx: SelectContext): void;
    onPointerMove(x: number, y: number, ctx: SelectContext): void;
    onPointerUp(x: number, y: number, ctx: SelectContext): SelectResult;
    preview(): SelectPreview;
    cancel(): void;
}

interface Press { x0: number; y0: number; x: number; y: number; move: boolean; ctx: SelectContext }

export function createSelectTool(): SelectEngine {
    let p: Press | null = null;
    const dragged = () => !!p && Math.hypot(p.x - p.x0, p.y - p.y0) >= MIN_DRAG_PX;
    const marquee = (q: Press): Box => ({ x: Math.min(q.x0, q.x), y: Math.min(q.y0, q.y), w: Math.abs(q.x - q.x0), h: Math.abs(q.y - q.y0) });
    const offset = (q: Press) => snapMove(q.ctx.strokes, q.ctx.selected, q.x - q.x0, q.y - q.y0, q.ctx.gridSnap, q.ctx.gridSize);
    const union = (a: string[], b: string[]) => [...a, ...b.filter(id => !a.includes(id))];

    return {
        onPointerDown(x, y, ctx) {
            // Shift never moves: it only grows or trims the selection.
            const move = !ctx.shift && inside(selectionBox(ctx.strokes, ctx.selected), x, y);
            p = { x0: x, y0: y, x, y, move, ctx };
        },
        onPointerMove(x, y) { if (p) { p.x = x; p.y = y; } },
        onPointerUp(x, y) {
            if (!p) return null;
            const q = p;
            q.x = x; q.y = y;
            const wasDrag = dragged();
            p = null;
            const { ctx } = q;
            if (wasDrag && q.move) {
                const [dx, dy] = offset(q);
                return dx || dy ? { kind: 'move', ids: ctx.selected, dx, dy } : null;
            }
            if (wasDrag) {
                const hit = strokesInBox(ctx.strokes, marquee(q));
                return { kind: 'select', ids: ctx.shift ? union(ctx.selected, hit) : hit };
            }
            const hit = topStrokeAt(ctx.strokes, q.x0, q.y0);
            if (!ctx.shift) return { kind: 'select', ids: hit ? [hit.id] : [] };
            if (!hit) return { kind: 'select', ids: ctx.selected };
            return {
                kind: 'select',
                ids: ctx.selected.includes(hit.id) ? ctx.selected.filter(id => id !== hit.id) : [...ctx.selected, hit.id],
            };
        },
        preview() {
            if (!p || !dragged()) return null;
            return p.move ? { offset: offset(p), ids: p.ctx.selected } : { marquee: marquee(p) };
        },
        cancel() { p = null; },
    };
}
