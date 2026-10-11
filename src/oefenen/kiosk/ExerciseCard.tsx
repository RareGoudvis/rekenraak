import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MathBlock } from '../../services/math/types';
import { REGISTRY } from '../../config/exerciseRegistry';
import { EXERCISE_UI } from '../../config/exerciseUI';
import { BlockErrorBoundary } from '../../components/viewer/BlockErrorBoundary';
import { BlockWidthProvider, KioskCardProvider, ScaffoldProvider } from '../../components/viewer/BlockWidthContext';
import { ViewerInteractionProvider, type ViewerInteraction } from '../../components/viewer/ViewerInteractionContext';
import { kioskFor, kioskInputOf, kioskInteractOf } from '../../services/oefenen/kiosk';
import { useOefenStore } from '../useOefenStore';
import { usedExtent } from './cardExtent';
import { setThousandsSeparator } from '../../services/math/formatters';

// Only the pupil page loads this module, so the sheet and the editor keep their plain space; U+202F = narrow no-break space.
setThousandsSeparator(' ');

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
// fill-cells: a cell never draws under a thumb's target (WCAG 2.5.8 + room for the digit); a
// grid too tall for that at the card's size scrolls inside the card instead of shrinking.
const MIN_CELL_PX = 40;

export default function ExerciseCard({ typeId, exercise, constraints, instruction, exerciseKey }: Props) {
    const boxRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const [fit, setFit] = useState({ k: 1, x: 0, w: VIRTUAL_W, h: 0, scroll: false });
    const Viewer = EXERCISE_UI[typeId]?.Viewer;
    const interaction = useOefenStore(s => s.interaction);
    const activeCell = useOefenStore(s => s.activeCell);
    const d = kioskFor(typeId);
    const ia = d ? kioskInteractOf(d, constraints) : undefined;
    const interactKind = ia && kioskInputOf(d!, exercise, constraints) === 'interactive' ? ia.kind : null;
    // Phase C: the pupil answers on the card itself, so the viewer gets the tap/cell context.
    const ctx = useMemo<ViewerInteraction | null>(() => (interactKind ? {
        kind: interactKind, state: interaction, activeCell,
        set: (next) => useOefenStore.getState().setInteraction(next),
        focusCell: (key) => useOefenStore.getState().focusCell(key),
        typeCell: (key, raw) => useOefenStore.getState().typeCell(key, raw),
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
            const { x, w, h } = usedExtent(inner, VIRTUAL_W);
            if (!boxW || !boxH || !h) return;
            let k = Math.max(0.5, Math.min(MAX_ZOOM, boxW / w, boxH / h));
            const cellH = Math.min(...[...inner.querySelectorAll<HTMLElement>('input[data-kiosk-cell]')].map(el => el.offsetHeight).filter(x => x > 0));
            if (cellH * k < MIN_CELL_PX) k = Math.min(MAX_ZOOM, MIN_CELL_PX / cellH);
            // Raised to MIN_CELL_PX, the grid outgrows the card: it scrolls from its top-left.
            const scroll = w * k > boxW + 1 || h * k > boxH + 1;
            setFit(f => (f.k === k && f.x === x && f.w === w && f.h === h && f.scroll === scroll ? f : { k, x, w, h, scroll }));
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
            <div ref={boxRef} className={`kiosk-card-body${fit.scroll ? ' is-scrolling' : ''}`}>
                <div className="kiosk-card-sizer" style={{ width: fit.w * fit.k, height: fit.h * fit.k }}>
                    {/* inert: the sheet viewers draw operands as editable inputs (teacher edits on the sheet);
                        here they must not take focus, keys or taps — unless the pupil answers ON the card. */}
                    <div ref={innerRef} className={`kiosk-card-inner${ctx ? ' is-interactive' : ''}`} inert={!ctx}
                        style={{ width: VIRTUAL_W, transform: `translateX(${-fit.x * fit.k}px) scale(${fit.k})` }}>
                        <BlockWidthProvider value={VIRTUAL_W}>
                        <ScaffoldProvider value={false}>
                        <KioskCardProvider value={true}>
                        <ViewerInteractionProvider value={ctx}>
                            <BlockErrorBoundary resetKey={exerciseKey} label={typeId}
                                fallback={<p className="kiosk-card-fallback">Deze oefening kan niet getoond worden.</p>}>
                                {block && Viewer
                                    ? <Viewer block={block} showSolutions={false} />
                                    : <p className="kiosk-card-fallback">Deze oefening kan niet getoond worden.</p>}
                            </BlockErrorBoundary>
                        </ViewerInteractionProvider>
                        </KioskCardProvider>
                        </ScaffoldProvider>
                        </BlockWidthProvider>
                    </div>
                </div>
            </div>
        </div>
    );
}
