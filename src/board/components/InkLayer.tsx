import { useRef, useState } from 'react';
import { useBoardStore } from '../useBoardStore';
import { rndId } from '../boardTypes';
import type { Stroke } from '../boardTypes';
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

export default function InkLayer({ active }: { active: boolean }) {
    const strokes = useBoardStore((s) => s.pages[s.activePageIdx].strokes);
    const tool = useBoardStore((s) => s.tool);
    const inkSettings = useBoardStore((s) => s.inkSettings);
    const addStroke = useBoardStore((s) => s.addStroke);
    const removeStrokes = useBoardStore((s) => s.removeStrokes);

    const drawing = useRef<number[] | null>(null);
    const [draft, setDraft] = useState<Stroke | null>(null);
    // P4: a pen started on an instrument edge follows it (ToolContext.instrument).
    const guided = useRef<{ line: GuidedLine; last: GuidedSegment } | null>(null);
    const [guideReadout, setGuideReadout] = useState<GuidedSegment['readout'] | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const toLocal = (e: React.PointerEvent) => {
        const r = svgRef.current!.getBoundingClientRect();
        return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10];
    };

    const erase = (x: number, y: number) => {
        const hitR = 14;
        const ids: string[] = [];
        for (const s of strokes) {
            // Old autosaves (pre-pts) may carry strokes without sample points.
            const pts = s.pts ?? [];
            const reach = (s.width / 2 + hitR) ** 2;
            for (let i = 0; i < pts.length; i += 2) {
                const dx = pts[i] - x, dy = pts[i + 1] - y;
                if (dx * dx + dy * dy <= reach) { ids.push(s.id); break; }
            }
        }
        if (ids.length) removeStrokes(ids);
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (!active) return;
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        const [x, y] = toLocal(e);
        if (tool === 'eraser') { erase(x, y); return; }
        if (tool !== 'pen' && tool !== 'marker') return;
        const cfg = inkSettings[tool];
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
        if (guided.current) {
            const seg = guided.current.line.to(x, y);
            guided.current.last = seg;
            setDraft(d => d ? { ...d, path: seg.path, pts: seg.pts } : d);
            setGuideReadout(seg.readout);
            return;
        }
        if (!drawing.current) return;
        drawing.current.push(x, y);
        setDraft(d => d ? { ...d, path: pathFrom(drawing.current!), pts: drawing.current! } : d);
    };

    const onPointerUp = () => {
        // Commit from the ref, not the (possibly one-frame-stale) draft state, so a
        // fast tap-release can never race React's render cycle.
        const pts = drawing.current;
        if (guided.current && (tool === 'pen' || tool === 'marker')) {
            const cfg = inkSettings[tool];
            const { path, pts: gp } = guided.current.last;
            addStroke({ id: rndId(), tool, color: cfg.color, width: cfg.width, opacity: tool === 'marker' ? 0.45 : 1, path, pts: gp });
        }
        guided.current = null;
        setGuideReadout(null);
        if (pts && pts.length >= 2 && (tool === 'pen' || tool === 'marker')) {
            const cfg = inkSettings[tool];
            addStroke({
                id: rndId(), tool, color: cfg.color, width: cfg.width,
                opacity: tool === 'marker' ? 0.45 : 1,
                path: pathFrom(pts), pts: [...pts],
            });
        }
        drawing.current = null;
        setDraft(null);
    };

    const strokeEl = (s: Stroke) => (
        <path
            key={s.id} d={s.path} fill="none"
            stroke={s.color} strokeWidth={s.width} strokeLinecap="round" strokeLinejoin="round"
            opacity={s.opacity ?? 1}
            style={s.tool === 'marker' ? { mixBlendMode: 'multiply' } : undefined}
        />
    );

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
            {strokes.map(strokeEl)}
            {draft && strokeEl(draft)}
            {guideReadout && <ReadoutLabel {...guideReadout} />}
        </svg>
    );
}
