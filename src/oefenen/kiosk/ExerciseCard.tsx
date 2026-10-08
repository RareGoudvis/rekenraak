import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MathBlock } from '../../services/math/types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { BlockErrorBoundary } from '../../components/viewer/BlockErrorBoundary';
import { BlockWidthProvider, ScaffoldProvider } from '../../components/viewer/BlockWidthContext';
import { ViewerInteractionProvider, type ViewerInteraction } from '../../components/viewer/ViewerInteractionContext';
import { kioskFor, kioskInputOf } from '../../services/oefenen/kiosk';
import { useOefenStore } from '../useOefenStore';

interface Props {
    typeId: string;
    exercise: unknown;
    constraints: Record<string, unknown>;
    instruction: string;
    // Changes per exercise so a crashed viewer retries on the next one.
    exerciseKey: string;
}

// The viewer lays one exercise out at about a half-width sheet block (338 px), exactly as on
// paper, and the card scales that up to fill itself: the sheet tokens and px geometry all
// grow together, so nothing drifts apart the way it would if only --sheet-size-* moved.
const VIRTUAL_W = 340;
// 3.2 × 13 pt ≈ 55 px digits: readable a metre away on a Chromebook, never comically large.
const MAX_ZOOM = 3.2;

// Horizontal extent of the drawn content (leaf elements), in layout px, so a short sum is
// centred and scaled to the card instead of a 340 px box it fills only partly (a viewer may
// left-align or centre it). Width-100% leaves count as full width, which keeps those whole.
function usedExtent(inner: HTMLElement): { x: number; w: number } {
    const outer = inner.getBoundingClientRect();
    // Rects are post-transform; the layout width is not, so their ratio is the live scale.
    const scale = inner.offsetWidth ? outer.width / inner.offsetWidth : 0;
    let left = Infinity, right = -Infinity;
    inner.querySelectorAll<HTMLElement | SVGElement>('*').forEach((el) => {
        // A parent with its own text ("Een pil weegt ongeveer 500 <blank>.") is measured too,
        // or only its blank would count and the card would crop the sentence off.
        const ownText = [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== '');
        if (el.children.length > 0 && !ownText && !(el instanceof SVGSVGElement)) return;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 && r.height <= 0) return;
        left = Math.min(left, r.left - outer.left);
        right = Math.max(right, r.right - outer.left);
    });
    if (!(scale > 0) || right <= left) return { x: 0, w: VIRTUAL_W };
    // 4 px slack each side: italic glyphs and blank lines can draw past their box.
    const x = Math.max(0, Math.floor(left / scale) - 4);
    // Not capped at VIRTUAL_W: a fixed-width table (getalfunctie's tick columns) overflows the
    // 340 px box, and the card scales it down whole instead of cutting its last columns off.
    return { x, w: Math.ceil(right / scale) + 4 - x };
}

export default function ExerciseCard({ typeId, exercise, constraints, instruction, exerciseKey }: Props) {
    const boxRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState({ k: 1, x: 0, w: VIRTUAL_W, h: 0 });
    const Viewer = EXERCISE_UI[typeId]?.Viewer;
    const interaction = useOefenStore(s => s.interaction);
    const activeCell = useOefenStore(s => s.activeCell);
    const d = kioskFor(typeId);
    const interactKind = d?.interact && kioskInputOf(d, exercise, constraints) === 'interactive' ? d.interact.kind : null;
    // Phase C: the pupil answers on the card itself, so the viewer gets the tap/cell context.
    const ctx = useMemo<ViewerInteraction | null>(() => (interactKind ? {
        kind: interactKind, state: interaction, activeCell,
        set: (next) => useOefenStore.getState().setInteraction(next),
        focusCell: (key) => useOefenStore.getState().focusCell(key),
    } : null), [interactKind, interaction, activeCell]);

    const block = useMemo<MathBlock | null>(() => {
        const def = REGISTRY[typeId];
        if (!def) return null;
        return {
            id: `oefen-${typeId}`, typeId, instructionText: '', instructionMode: 'geen', layoutPreset: 'inline-short',
            steppedLines: 3, numberOfExercises: 1, totalPoints: 0, verticalSpacing: 14, constraints, exercises: [],
            [def.exerciseField]: [exercise],
        } as MathBlock;
    }, [typeId, exercise, constraints]);

    useLayoutEffect(() => {
        const box = boxRef.current, inner = innerRef.current;
        if (!box || !inner) return;
        const measure = () => {
            const boxW = box.clientWidth, boxH = box.clientHeight;
            const { x, w } = usedExtent(inner);
            const h = inner.offsetHeight;
            if (!boxW || !boxH || !h) return;
            const k = Math.max(0.5, Math.min(MAX_ZOOM, boxW / w, boxH / h));
            setFit(f => (f.k === k && f.x === x && f.w === w && f.h === h ? f : { k, x, w, h }));
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(box);
        ro.observe(inner);
        return () => ro.disconnect();
    }, [block]);

    return (
        <div className="kiosk-card">
            <p className="kiosk-instruction">{instruction}</p>
            <div ref={boxRef} className="kiosk-card-body">
                <div className="kiosk-card-sizer" style={{ width: fit.w * fit.k, height: fit.h * fit.k }}>
                    {/* inert: the sheet viewers draw operands as editable inputs (teacher edits on the sheet);
                        here they must not take focus, keys or taps — unless the pupil answers ON the card. */}
                    <div ref={innerRef} className={`kiosk-card-inner${ctx ? ' is-interactive' : ''}`} inert={!ctx}
                        style={{ width: VIRTUAL_W, transform: `translateX(${-fit.x * fit.k}px) scale(${fit.k})` }}>
                        <BlockWidthProvider value={VIRTUAL_W}>
                        <ScaffoldProvider value={false}>
                        <ViewerInteractionProvider value={ctx}>
                            <BlockErrorBoundary resetKey={exerciseKey} label={typeId}
                                fallback={<p className="kiosk-card-fallback">Deze oefening kan niet getoond worden.</p>}>
                                {block && Viewer
                                    ? <Viewer block={block} showSolutions={false} />
                                    : <p className="kiosk-card-fallback">Deze oefening kan niet getoond worden.</p>}
                            </BlockErrorBoundary>
                        </ViewerInteractionProvider>
                        </ScaffoldProvider>
                        </BlockWidthProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}
