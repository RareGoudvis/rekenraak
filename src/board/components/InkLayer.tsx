import { useEffect, useRef, useState } from 'react';
import { effectiveInk, useBoardStore } from '../useBoardStore';
import { rndId } from '../boardTypes';
import type { BoardTool, Stroke, ToolContext, ToolEngine } from '../boardTypes';
import { splitSubpaths, strokeHit } from '../inkGeometry';
import { createLineTool, createShapeTool } from '../drawTools';
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

export default function InkLayer({ active }: { active: boolean }) {
    const strokes = useBoardStore((s) => s.pages[s.activePageIdx].strokes);
    const tool = useBoardStore((s) => s.tool);
    const addStroke = useBoardStore((s) => s.addStroke);
    const removeStrokes = useBoardStore((s) => s.removeStrokes);

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

    return (
        <svg
            ref={svgRef}
            style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                pointerEvents: active ? 'auto' : 'none', touchAction: 'none',
                cursor: active ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default',
                zIndex: 10,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            {strokes.map(s => strokeEl(s))}
            {draft && strokeEl(draft)}
            {preview && strokeEl(preview, { 'data-ink-preview': '', pointerEvents: 'none' } as React.SVGProps<SVGPathElement & SVGGElement>)}
            {guideReadout && <ReadoutLabel {...guideReadout} />}
        </svg>
    );
}
