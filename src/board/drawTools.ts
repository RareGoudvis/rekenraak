import { rndId } from './boardTypes';
import type { ArrowHeads, Stroke, ToolContext, ToolEngine } from './boardTypes';
import { linePath, snapAngle, snapToGrid } from './inkGeometry';

// ToolEngines for the drag-to-draw tools (P3): pointer stream in board px → one finished
// Stroke with exact geometry. The InkLayer feeds them and draws preview() while dragging.

// A press that moves less than this is a tap, not a drawing: nothing is emitted.
export const MIN_DRAG_PX = 4;

interface DragState { x0: number; y0: number; x: number; y: number }

// Shared drag bookkeeping: start / last point, the 4 px tap rule, cancel.
function dragEngine(build: (d: DragState, ctx: ToolContext, id: string) => Stroke | null): ToolEngine {
    let d: DragState | null = null;
    let lastCtx: ToolContext = { gridSnap: false, gridSize: 0 };
    const moved = () => !!d && Math.hypot(d.x - d.x0, d.y - d.y0) >= MIN_DRAG_PX;
    return {
        onPointerDown(x, y, ctx) { d = { x0: x, y0: y, x, y }; lastCtx = ctx; },
        onPointerMove(x, y, ctx) { if (d) { d.x = x; d.y = y; lastCtx = ctx; } },
        onPointerUp(x, y, ctx) {
            if (!d) return null;
            d.x = x; d.y = y;
            const out = moved() ? build(d, ctx, rndId()) : null;
            d = null;
            return out;
        },
        preview() { return d && moved() ? build(d, lastCtx, 'preview') : null; },
        cancel() { d = null; },
    };
}

export interface LineOptions { color: string; width: number; arrow: ArrowHeads; dashed: boolean }

export function createLineTool(o: LineOptions): ToolEngine {
    return dragEngine((d, ctx, id) => {
        const g = ctx.gridSnap ? ctx.gridSize : 0;
        const x0 = snapToGrid(d.x0, ctx.gridSnap, ctx.gridSize), y0 = snapToGrid(d.y0, ctx.gridSnap, ctx.gridSize);
        const [x1, y1] = ctx.shift
            ? snapAngle(x0, y0, d.x, d.y, g)
            : [snapToGrid(d.x, ctx.gridSnap, ctx.gridSize), snapToGrid(d.y, ctx.gridSnap, ctx.gridSize)];
        // Grid snapping can fold a short drag onto its own start: no zero-length strokes.
        if (x0 === x1 && y0 === y1) return null;
        return {
            id, tool: 'line', color: o.color, width: o.width, opacity: 1,
            path: linePath(x0, y0, x1, y1, o.width, o.arrow),
            pts: [x0, y0, x1, y1],
            ...(o.arrow !== 'none' ? { fill: o.color } : {}),
            ...(o.dashed ? { dash: true } : {}),
        };
    });
}
