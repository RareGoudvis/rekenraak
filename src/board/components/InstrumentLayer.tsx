import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useBoardStore } from '../useBoardStore';
import type { Instrument, Stroke } from '../boardTypes';
import { rndId } from '../boardTypes';
import { arcPath, arcPts, formatCm, openPasser, placePasserHinge, placeRotateHandle, round1, snapInstrumentPoint, type BoardSize, snapInstrumentRotation, snapOf, strokeEndpoints, unwrapDelta } from '../instrumentGeometry';
import { GeodriehoekShape, LatShape, PasserShape, type Grip } from './InstrumentShapes';
import { IC, NO_POINTER } from './instrumentStyle';

// The meetinstrumenten layer: above the ink, below the bottom bar. The SVG itself never takes
// pointers; each instrument's grips do. Drag the body to move (the reference point snaps to
// grid points and stroke endpoints), drag the round handle to rotate (snaps to 45°, 15° with
// the grid on), keyboard on the selected one: arrows nudge, [ ] rotate, R resets, Esc deselects.
// The passer: its pencil leg sets the opening, its pencil tip drawn round the needle leaves an
// exact arc stroke (a full circle on a full turn) in the pen's (or marker's) colour.

const EMPTY: Instrument[] = [];

type Drag =
    | { grip: 'body'; id: string; startX: number; startY: number; origX: number; origY: number; targets: number[] }
    | { grip: 'rotate'; id: string; pivotX: number; pivotY: number; startAngle: number; origRotation: number }
    | { grip: 'open'; id: string; cx: number; cy: number }
    | { grip: 'draw'; id: string; cx: number; cy: number; r: number; start: number; last: number; sweep: number };

interface Readout { x: number; y: number; text: string }

export default function InstrumentLayer() {
    const instruments = useBoardStore((s) => s.pages[s.activePageIdx].instruments) ?? EMPTY;
    const selectedId = useBoardStore((s) => s.selectedInstrumentId);
    const tool = useBoardStore((s) => s.tool);
    const keepHandles = useBoardStore((s) => s.boardSettings.keepHandles);
    const svgRef = useRef<SVGSVGElement>(null);
    // The board's size: the handles are kept inside it ("Handvatten op het bord houden").
    const [board, setBoard] = useState<BoardSize | null>(null);
    const drag = useRef<Drag | null>(null);
    const [snapDot, setSnapDot] = useState<{ x: number; y: number } | null>(null);
    const [readout, setReadout] = useState<Readout | null>(null);
    const [arcDraft, setArcDraft] = useState<Stroke | null>(null);
    const passThrough = tool === 'pen' || tool === 'marker' || tool === 'eraser';
    // P3's line and shape tools ignore the instruments entirely: no guiding, and a drag that
    // starts on an instrument still draws (every grip goes pointer-transparent).
    const inert = tool === 'line' || tool === 'shape';

    const toBoard = (e: React.PointerEvent): [number, number] => {
        const r = svgRef.current!.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
    };

    const begin = (e: React.PointerEvent, id: string, grip: Grip) => {
        // The canvas below would deselect / place a text widget on this press.
        e.stopPropagation();
        const st = useBoardStore.getState();
        const inst = (st.pages[st.activePageIdx].instruments ?? []).find(i => i.id === id);
        if (!inst) return;
        st.selectWidget(null);
        st.selectInstrument(inst.id);
        (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
        const [x, y] = toBoard(e);
        if (grip === 'rotate') {
            drag.current = { grip, id: inst.id, pivotX: inst.x, pivotY: inst.y, startAngle: Math.atan2(y - inst.y, x - inst.x), origRotation: inst.rotation };
        } else if (grip === 'open') {
            drag.current = { grip, id: inst.id, cx: inst.x, cy: inst.y };
        } else if (grip === 'draw') {
            // The arc starts where the pencil is, not where the finger landed on its grip.
            const a = (inst.rotation * Math.PI) / 180;
            drag.current = { grip, id: inst.id, cx: inst.x, cy: inst.y, r: inst.radius ?? 0, start: a, last: a, sweep: 0 };
        } else {
            const strokes = st.pages[st.activePageIdx].strokes;
            drag.current = { grip, id: inst.id, startX: x, startY: y, origX: inst.x, origY: inst.y, targets: strokeEndpoints(strokes) };
        }
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const d = drag.current;
        if (!d) return;
        const [x, y] = toBoard(e);
        const st = useBoardStore.getState();
        const inst = (st.pages[st.activePageIdx].instruments ?? []).find(i => i.id === d.id);
        if (!inst) return;
        const snap = snapOf(inst);
        if (d.grip === 'body') {
            const s = snapInstrumentPoint(d.origX + x - d.startX, d.origY + y - d.startY,
                { gridOn: st.gridSnap, gridSize: st.gridSize, points: d.targets }, snap);
            st.updateInstrument(d.id, { x: round1(s.x), y: round1(s.y) });
            setSnapDot(s.snapped ? { x: s.x, y: s.y } : null);
        } else if (d.grip === 'open') {
            const o = openPasser({ x: d.cx, y: d.cy }, x, y);
            st.updateInstrument(d.id, o);
            setReadout({ x, y: y - 44, text: formatCm(o.radius) });
        } else if (d.grip === 'draw') {
            const a = Math.atan2(y - d.cy, x - d.cx);
            d.sweep = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, d.sweep + unwrapDelta(d.last, a)));
            d.last = a;
            st.updateInstrument(d.id, { rotation: round1((((a * 180) / Math.PI) % 360 + 360) % 360) });
            const ink = inkFor(st.tool, st.inkSettings);
            setArcDraft({ id: 'arc-draft', ...ink, path: arcPath(d.cx, d.cy, d.r, d.start, d.sweep), pts: [] });
            setReadout({ x: d.cx, y: d.cy - 30, text: `${Math.round(Math.abs(d.sweep) * 180 / Math.PI)}°` });
        } else {
            const turned = d.origRotation + ((Math.atan2(y - d.pivotY, x - d.pivotX) - d.startAngle) * 180) / Math.PI;
            const r = snapInstrumentRotation(turned, st.gridSnap, snap);
            st.updateInstrument(d.id, { rotation: round1(r.deg) });
            setSnapDot(r.snapped ? { x: d.pivotX, y: d.pivotY } : null);
            setReadout({ x: d.pivotX, y: d.pivotY - 30, text: `${formatDeg(r.deg)}°` });
        }
    };

    const end = () => {
        const d = drag.current;
        // Less than a degree is a tap on the pencil, not an arc.
        if (d?.grip === 'draw' && Math.abs(d.sweep) >= Math.PI / 180) {
            const st = useBoardStore.getState();
            st.addStroke({
                id: rndId(), ...inkFor(st.tool, st.inkSettings),
                path: arcPath(d.cx, d.cy, d.r, d.start, d.sweep), pts: arcPts(d.cx, d.cy, d.r, d.start, d.sweep),
            });
        }
        setArcDraft(null);
        drag.current = null;
        setSnapDot(null);
        setReadout(null);
    };

    useLayoutEffect(() => {
        const el = svgRef.current;
        if (!el) return;
        const measure = () => {
            const r = el.getBoundingClientRect();
            setBoard(b => (b && b.w === r.width && b.h === r.height ? b : { w: r.width, h: r.height }));
        };
        measure();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Keyboard on the selected instrument; typing in a widget's field is left alone.
    useEffect(() => {
        if (!selectedId) return;
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const st = useBoardStore.getState();
            const inst = (st.pages[st.activePageIdx].instruments ?? []).find(i => i.id === selectedId);
            if (!inst) return;
            const step = e.shiftKey ? 10 : 1;
            const turn = e.shiftKey ? 15 : 1;
            const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (move[e.key]) {
                st.updateInstrument(inst.id, { x: round1(inst.x + move[e.key][0]), y: round1(inst.y + move[e.key][1]) });
            } else if (e.key === '[' || e.key === '{' || e.code === 'BracketLeft') {
                st.updateInstrument(inst.id, { rotation: round1(((inst.rotation - turn) % 360 + 360) % 360) });
            } else if (e.key === ']' || e.key === '}' || e.code === 'BracketRight') {
                st.updateInstrument(inst.id, { rotation: round1((inst.rotation + turn) % 360) });
            } else if (e.key === 'r' || e.key === 'R') {
                st.updateInstrument(inst.id, { rotation: 0 });
            } else if (e.key === 'Escape') {
                st.selectInstrument(null);
                return;
            } else return;
            e.preventDefault();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [selectedId]);

    return (
        <svg
            ref={svgRef} data-instrument-layer
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 12, touchAction: 'none' }}
            onPointerMove={onPointerMove} onPointerUp={end} onPointerCancel={end}
        >
            {/* !important: the grips set pointer-events inline */}
            <style>{'[data-instrument-inert] * { pointer-events: none !important; }'}</style>
            {arcDraft && (
                <path data-arc-draft d={arcDraft.path} fill="none" stroke={arcDraft.color} strokeWidth={arcDraft.width}
                    strokeLinecap="round" opacity={arcDraft.opacity} style={NO_POINTER} />
            )}
            {instruments.map((inst) => {
                const props = {
                    inst, selected: inst.id === selectedId, passThrough, onGrip: (e: React.PointerEvent, g: Grip) => begin(e, inst.id, g),
                    handle: placeRotateHandle(inst, board, keepHandles),
                    passer: inst.kind === 'passer' ? placePasserHinge(inst, board, keepHandles) : undefined,
                };
                return (
                    <g key={inst.id} data-instrument={inst.kind} data-instrument-inert={inert || undefined}
                        transform={`translate(${inst.x} ${inst.y}) rotate(${inst.rotation})`}>
                        {inst.kind === 'lat' && <LatShape {...props} />}
                        {inst.kind === 'geodriehoek' && <GeodriehoekShape {...props} />}
                        {inst.kind === 'passer' && <PasserShape {...props} />}
                    </g>
                );
            })}
            {snapDot && (
                <g style={NO_POINTER}>
                    <circle cx={snapDot.x} cy={snapDot.y} r={14} strokeWidth={2} style={{ fill: IC.tint, stroke: IC.handle }} />
                    <circle data-snap-dot cx={snapDot.x} cy={snapDot.y} r={6} strokeWidth={2} style={{ fill: IC.handle, stroke: IC.handleOn }} />
                </g>
            )}
            {readout && <ReadoutLabel {...readout} />}
        </svg>
    );
}

const formatDeg = (d: number) => String(Math.round(d) % 360);

// The passer draws with the marker when the marker is the active tool, else with the pen.
function inkFor(tool: string, settings: ReturnType<typeof useBoardStore.getState>['inkSettings']): Pick<Stroke, 'tool' | 'color' | 'width' | 'opacity'> {
    const t = tool === 'marker' ? 'marker' : 'pen';
    return { tool: t, color: settings[t].color, width: settings[t].width, opacity: t === 'marker' ? 0.45 : 1 };
}

// A pill with the live value (degrees, cm) next to what is being dragged.
export function ReadoutLabel({ x, y, text }: Readout) {
    const w = 14 + text.length * 11;
    return (
        <g data-instrument-readout transform={`translate(${round1(x)} ${round1(y)})`} style={NO_POINTER}>
            <rect x={-w / 2} y={-15} width={w} height={30} rx={15} style={{ fill: IC.handle }} />
            <text textAnchor="middle" dy="0.35em" fontSize={18} fontWeight={700} fontFamily="var(--font-ui)" style={{ fill: IC.handleOn }}>{text}</text>
        </g>
    );
}
