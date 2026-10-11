import { useEffect, useRef, useState } from 'react';
import { effectiveInk, useBoardStore } from '../useBoardStore';
import { rndId } from '../boardTypes';
import type { BoardTool, Stroke, ToolContext, ToolEngine } from '../boardTypes';
import { splitSubpaths, strokeHit } from '../inkGeometry';
import { createLineTool, createShapeTool } from '../drawTools';
import { createSelectTool, selectionBox, type SelectEngine, type SelectPreview } from '../selectTool';
import { pageInstrumentGeometry, startGuidedLine, type GuidedLine, type GuidedSegment } from '../instrumentGeometry';
import { ReadoutLabel } from './InstrumentLayer';

// SVG ink layer. Receives pointer events only while an ink tool is active
// (BoardPageCanvas flips pointer-events between this and the widget layer).
// Strokes are SVG paths — serializable, per-stroke erasable, and ready for
// instrument-emitted exact geometry (P4 snapping).

// Quadratic-midpoint smoothing: each segment curves through the midpoint of
// consecutive samples, which kills pointer jitter without lag.
function pathFrom(pts: number[]): string {
    if (pts.length < 4) return pts.length ? `M ${pts[0]} ${pts[1]} l 0.01 0` : '';
    let d = `M ${pts[0]} ${pts[1]}`;
    for (let i = 2; i < pts.length - 2; i += 2) {
        const mx = (pts[i] + pts[i + 2]) / 2;
        const my = (pts[i + 1] + pts[i + 3]) / 2;
        d += ` Q ${pts[i]} ${pts[i + 1]} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length - 2]} ${pts[pts.length - 1]}`;
    return d;
}

// Drag-to-draw tools (P3) run through a ToolEngine; pen / marker keep the freehand path above.
function engineFor(tool: BoardTool): ToolEngine | null {
    const st = useBoardStore.getState();
    const { drawOptions } = st;
    if (tool === 'line') return createLineTool({ ...effectiveInk(st, 'line'), arrow: drawOptions.arrow, dashed: drawOptions.dashed });
    if (tool === 'shape') return createShapeTool({ ...effectiveInk(st, 'shape'), kind: drawOptions.shape, fill: drawOptions.fill });
    return null;
}

const toolCtx = (shift: boolean): ToolContext => {
    const { gridSnap, gridSize } = useBoardStore.getState();
    return { gridSnap, gridSize, shift };
};

const selectCtx = (shift: boolean) => {
    const b = useBoardStore.getState();
    return { strokes: b.pages[b.activePageIdx].strokes, selected: b.selectedStrokeIds, shift, gridSnap: b.gridSnap, gridSize: b.gridSize };
};

const isTyping = (t: EventTarget | null) => {
    const el = t as HTMLElement | null;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

export default function InkLayer({ active }: { active: boolean }) {
    const strokes = useBoardStore((s) => s.pages[s.activePageIdx].strokes);
    const tool = useBoardStore((s) => s.tool);
    const addStroke = useBoardStore((s) => s.addStroke);
    const removeStrokes = useBoardStore((s) => s.removeStrokes);
    const selectedIds = useBoardStore((s) => s.selectedStrokeIds);

    const drawing = useRef<number[] | null>(null);
    const [draft, setDraft] = useState<Stroke | null>(null);
    // P4: a pen started on an instrument edge follows it (ToolContext.instrument).
    const guided = useRef<{ line: GuidedLine; last: GuidedSegment } | null>(null);
    const [guideReadout, setGuideReadout] = useState<GuidedSegment['readout'] | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const engine = useRef<ToolEngine | null>(null);
    const lastPos = useRef<[number, number]>([0, 0]);
    // Live preview of a line/shape drag: a temporary element, never a stroke in the store.
    const [preview, setPreview] = useState<Stroke | null>(null);
    const [dragging, setDragging] = useState(false);
    // Selecteren: one engine per layer; a press runs from pointerdown to pointerup / cancel.
    const selectEngine = useRef<SelectEngine | null>(null);
    const selecting = useRef(false);
    const [selPreview, setSelPreview] = useState<SelectPreview>(null);
    const [overSelection, setOverSelection] = useState(false);

    // Selecteren keys: Delete / Backspace remove the selection (undoable), Escape drops it.
    useEffect(() => {
        if (tool !== 'lasso') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
            const board = useBoardStore.getState();
            if (e.key === 'Escape') {
                selectEngine.current?.cancel();
                selecting.current = false;
                setSelPreview(null);
                board.selectStrokes([]);
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && board.selectedStrokeIds.length) {
                e.preventDefault();
                board.removeStrokes(board.selectedStrokeIds, { undoable: true });
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [tool]);

    // While a line/shape drag runs: Escape drops it, and pressing / releasing Shift re-shapes
    // the preview at once instead of waiting for the next pointer move.
    useEffect(() => {
        if (!dragging) return;
        const onKey = (e: KeyboardEvent) => {
            const eng = engine.current;
            if (!eng) return;
            if (e.key === 'Escape' && e.type === 'keydown') {
                eng.cancel?.();
                engine.current = null;
                setPreview(null);
                setDragging(false);
            } else if (e.key === 'Shift') {
                eng.onPointerMove(lastPos.current[0], lastPos.current[1], toolCtx(e.type === 'keydown'));
                setPreview(eng.preview?.() ?? null);
            }
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('keyup', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('keyup', onKey);
        };
    }, [dragging]);

    const toLocal = (e: React.PointerEvent) => {
        const r = svgRef.current!.getBoundingClientRect();
        return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10];
    };

    const erase = (x: number, y: number) => {
        const ids = strokes.filter(s => strokeHit(s, x, y, 14)).map(s => s.id);
        if (ids.length) removeStrokes(ids);
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (!active) return;
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        const [x, y] = toLocal(e);
        if (tool === 'eraser') { erase(x, y); return; }
        if (tool === 'lasso') {
            selectEngine.current ??= createSelectTool();
            selectEngine.current.onPointerDown(x, y, selectCtx(e.shiftKey));
            selecting.current = true;
            setSelPreview(null);
            return;
        }
        const eng = engineFor(tool);
        if (eng) {
            engine.current = eng;
            lastPos.current = [x, y];
            eng.onPointerDown(x, y, toolCtx(e.shiftKey));
            setPreview(null);
            setDragging(true);
            return;
        }
        if (tool !== 'pen' && tool !== 'marker') return;
        const cfg = effectiveInk(useBoardStore.getState(), tool);
        const board = useBoardStore.getState();
        const line = startGuidedLine({
            gridSnap: board.gridSnap, gridSize: board.gridSize,
            instrument: pageInstrumentGeometry(board.pages[board.activePageIdx].instruments ?? []),
        }, x, y);
        if (line) {
            const seg = line.to(x, y);
            guided.current = { line, last: seg };
            setDraft({ id: 'draft', tool, color: cfg.color, width: cfg.width, opacity: tool === 'marker' ? 0.45 : 1, path: seg.path, pts: seg.pts });
            setGuideReadout(seg.readout);
            return;
        }
        drawing.current = [x, y];
        setDraft({ id: 'draft', tool, color: cfg.color, width: cfg.width, opacity: tool === 'marker' ? 0.45 : 1, path: pathFrom(drawing.current), pts: drawing.current });
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!active) return;
        const [x, y] = toLocal(e);
        if (tool === 'eraser') { if (e.buttons) erase(x, y); return; }
        if (tool === 'lasso') {
            if (selecting.current && selectEngine.current) {
                selectEngine.current.onPointerMove(x, y, selectCtx(e.shiftKey));
                setSelPreview(selectEngine.current.preview());
            } else {
                // Hover feedback: inside the selection box a press moves, so show the move cursor.
                const b = selectionBox(strokes, selectedIds);
                setOverSelection(!!b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
            }
            return;
        }
        if (engine.current) {
            lastPos.current = [x, y];
            engine.current.onPointerMove(x, y, toolCtx(e.shiftKey));
            setPreview(engine.current.preview?.() ?? null);
            return;
        }
        if (guided.current) {
            const seg = guided.current.line.to(x, y);
            guided.current.last = seg;
            setDraft(d => d ? { ...d, path: seg.path, pts: seg.pts } : d);
            setGuideReadout(seg.readout);
            return;
        }
        if (!drawing.current) return;
        drawing.current.push(x, y);
        // Snapshot now: React may run this updater after a pointerup already nulled the ref.
        const pts = [...drawing.current];
        setDraft(d => d ? { ...d, path: pathFrom(pts), pts } : d);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (selecting.current && selectEngine.current) {
            const sel = selectEngine.current;
            selecting.current = false;
            setSelPreview(null);
            // A cancelled pointer (palm, lost capture) drops a lasso or move half-way.
            if (e.type === 'pointercancel') { sel.cancel(); return; }
            const [x, y] = toLocal(e);
            const done = sel.onPointerUp(x, y, selectCtx(e.shiftKey));
            const board = useBoardStore.getState();
            if (done?.kind === 'select') board.selectStrokes(done.ids);
            else if (done?.kind === 'move') board.moveStrokes(done.ids, done.dx, done.dy);
            return;
        }
        const eng = engine.current;
        if (eng) {
            engine.current = null;
            setPreview(null);
            setDragging(false);
            // A cancelled pointer (palm, lost capture) drops the drag like Escape does.
            if (e.type === 'pointercancel') { eng.cancel?.(); return; }
            const [x, y] = toLocal(e);
            const done = eng.onPointerUp(x, y, toolCtx(e.shiftKey));
            if (done) addStroke(done);
            return;
        }
        // Commit from the ref, not the (possibly one-frame-stale) draft state, so a
        // fast tap-release can never race React's render cycle.
        const pts = drawing.current;
        if (guided.current && (tool === 'pen' || tool === 'marker')) {
            const cfg = effectiveInk(useBoardStore.getState(), tool);
            const { path, pts: gp } = guided.current.last;
            addStroke({ id: rndId(), tool, color: cfg.color, width: cfg.width, opacity: tool === 'marker' ? 0.45 : 1, path, pts: gp });
        }
        guided.current = null;
        setGuideReadout(null);
        if (pts && pts.length >= 2 && (tool === 'pen' || tool === 'marker')) {
            const cfg = effectiveInk(useBoardStore.getState(), tool);
            addStroke({
                id: rndId(), tool, color: cfg.color, width: cfg.width,
                opacity: tool === 'marker' ? 0.45 : 1,
                path: pathFrom(pts), pts: [...pts],
            });
        }
        drawing.current = null;
        setDraft(null);
    };

    const strokeEl = (s: Stroke, extra?: React.SVGProps<SVGPathElement & SVGGElement>) => {
        const look = { stroke: s.color, strokeWidth: s.width, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
        if (s.dash) {
            // Dash only the line itself (first subpath); arrowheads after it stay solid.
            const [shaft, ...heads] = splitSubpaths(s.path);
            return (
                <g key={s.id} opacity={s.opacity ?? 1} {...extra}>
                    <path d={shaft} fill="none" strokeDasharray={`${s.width * 2} ${s.width * 2.5}`} {...look} />
                    {heads.length > 0 && <path d={heads.join(' ')} fill={s.fill ?? 'none'} fillOpacity={s.fillOpacity} {...look} />}
                </g>
            );
        }
        return (
            <path
                key={s.id} d={s.path} fill={s.fill ?? 'none'} fillOpacity={s.fillOpacity} {...look}
                opacity={s.opacity ?? 1}
                style={s.tool === 'marker' ? { mixBlendMode: 'multiply' } : undefined}
                {...extra}
            />
        );
    };

    const moving = selPreview && 'offset' in selPreview ? selPreview : null;
    const box = tool === 'lasso' ? selectionBox(strokes, selectedIds) : null;
    const cursor = !active ? 'default' : tool === 'eraser' ? 'cell' : tool === 'lasso' ? (moving || overSelection ? 'move' : 'default') : 'crosshair';

    return (
        <svg
            ref={svgRef}
            style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                pointerEvents: active ? 'auto' : 'none', touchAction: 'none',
                cursor,
                zIndex: 10,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            {strokes.map(s => (moving && moving.ids.includes(s.id) ? null : strokeEl(s)))}
            {/* A move rides along as a transform; the store changes once, on release (one undo step). */}
            {moving && (
                <g data-ink-moving transform={`translate(${moving.offset[0]} ${moving.offset[1]})`}>
                    {strokes.filter(s => moving.ids.includes(s.id)).map(s => strokeEl(s))}
                </g>
            )}
            {box && (
                <rect
                    data-ink-selection pointerEvents="none" fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="8 5"
                    x={box.x + (moving?.offset[0] ?? 0)} y={box.y + (moving?.offset[1] ?? 0)} width={box.w} height={box.h}
                />
            )}
            {selPreview && 'marquee' in selPreview && (
                <rect
                    data-ink-marquee pointerEvents="none" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="5 4"
                    x={selPreview.marquee.x} y={selPreview.marquee.y} width={selPreview.marquee.w} height={selPreview.marquee.h}
                />
            )}
            {draft && strokeEl(draft)}
            {preview && strokeEl(preview, { 'data-ink-preview': '', pointerEvents: 'none' } as React.SVGProps<SVGPathElement & SVGGElement>)}
            {guideReadout && <ReadoutLabel {...guideReadout} />}
        </svg>
    );
}
