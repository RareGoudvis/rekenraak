import { useRef, useState } from 'react';
import { useBoardStore } from '../useBoardStore';
import { rndId } from '../boardTypes';
import type { Stroke } from '../boardTypes';

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
    const svgRef = useRef<SVGSVGElement>(null);

    const toLocal = (e: React.PointerEvent) => {
        const r = svgRef.current!.getBoundingClientRect();
        return [Math.round((e.clientX - r.left) * 10) / 10, Math.round((e.clientY - r.top) * 10) / 10];
    };

    const erase = (x: number, y: number) => {
        const hitR = 14;
        const ids: string[] = [];
        for (const s of strokes) {
            const reach = (s.width / 2 + hitR) ** 2;
            for (let i = 0; i < s.pts.length; i += 2) {
                const dx = s.pts[i] - x, dy = s.pts[i + 1] - y;
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
        drawing.current = [x, y];
        const cfg = inkSettings[tool];
        setDraft({ id: 'draft', tool, color: cfg.color, width: cfg.width, opacity: tool === 'marker' ? 0.45 : 1, path: pathFrom(drawing.current), pts: drawing.current });
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!active) return;
        const [x, y] = toLocal(e);
        if (tool === 'eraser') { if (e.buttons) erase(x, y); return; }
        if (!drawing.current) return;
        drawing.current.push(x, y);
        setDraft(d => d ? { ...d, path: pathFrom(drawing.current!), pts: drawing.current! } : d);
    };

    const onPointerUp = () => {
        if (drawing.current && draft && drawing.current.length >= 2) {
            addStroke({ ...draft, id: rndId(), pts: [...drawing.current] });
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
        </svg>
    );
}
