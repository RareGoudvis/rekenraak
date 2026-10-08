import type { KeyboardEvent, PointerEvent } from 'react';
import type { ViewerInteraction } from './ViewerInteractionContext';

// Oefenmodus Phase C4: the pupil drags a handle on an SVG figure (clock hands, the mercury,
// a weegschaal needle, an angle's ray). Like the tap / cell helpers, everything here returns
// `{}` without a drag context, so the sheet keeps its exact DOM (viewers.interaction tests).

export type DragValues = Record<string, number>;

/** A point in the SVG's viewBox units. */
export interface DragPoint { x: number; y: number }

export interface DragSurface {
    // The SVG's viewBox size: pointer positions are mapped from the rendered box into it.
    width: number;
    height: number;
    // The handle a press at `p` grabs (the nearest hand, the only needle); null = none.
    pick(p: DragPoint, drag: DragValues): string | null;
    // The values after handle `key` is moved to `p` (snapped; a hand may carry another one along).
    move(key: string, p: DragPoint, drag: DragValues): DragValues;
}

export const dragValuesOf = (ctx: ViewerInteraction | null): DragValues => ctx?.state.drag ?? {};

// One gesture per surface: the handle it grabbed and the values it last wrote. Pointer moves
// can outrun React's re-render, so a move continues from what the gesture wrote, not the
// (possibly stale) state captured at render time.
const gestures = new WeakMap<Element, { pointerId: number; key: string; drag: DragValues }>();

function pointIn(el: Element, surface: DragSurface, clientX: number, clientY: number): DragPoint {
    // The card scales the viewer with a CSS transform; the client rect already includes it.
    const r = el.getBoundingClientRect();
    return {
        x: r.width ? ((clientX - r.left) * surface.width) / r.width : 0,
        y: r.height ? ((clientY - r.top) * surface.height) / r.height : 0,
    };
}

export interface DragSurfaceProps {
    'data-kiosk-drag'?: 'true';
    onPointerDown?(e: PointerEvent<Element>): void;
    onPointerMove?(e: PointerEvent<Element>): void;
    onPointerUp?(e: PointerEvent<Element>): void;
    onPointerCancel?(e: PointerEvent<Element>): void;
}

/** Pointer handlers for the SVG the pupil drags on (kiosk.css gives it touch-action: none); `{}` on the sheet. */
export function dragSurfaceProps(ctx: ViewerInteraction | null, surface: DragSurface): DragSurfaceProps {
    if (!ctx || ctx.kind !== 'drag') return {};
    const apply = (el: Element, key: string, e: PointerEvent<Element>, from: DragValues) => {
        const next = surface.move(key, pointIn(el, surface, e.clientX, e.clientY), from);
        gestures.set(el, { pointerId: e.pointerId, key, drag: next });
        ctx.set({ ...ctx.state, drag: next });
    };
    const end = (e: PointerEvent<Element>) => {
        if (gestures.get(e.currentTarget)?.pointerId === e.pointerId) gestures.delete(e.currentTarget);
    };
    return {
        'data-kiosk-drag': 'true',
        onPointerDown: (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            const el = e.currentTarget;
            const from = dragValuesOf(ctx);
            const key = surface.pick(pointIn(el, surface, e.clientX, e.clientY), from);
            if (key === null) return;
            e.preventDefault();
            // Keeps the moves coming while a finger slides off the figure.
            el.setPointerCapture?.(e.pointerId);
            apply(el, key, e, from);
        },
        onPointerMove: (e) => {
            const g = gestures.get(e.currentTarget);
            if (!g || g.pointerId !== e.pointerId) return;
            apply(e.currentTarget, g.key, e, g.drag);
        },
        onPointerUp: end,
        onPointerCancel: end,
    };
}

export interface DragHandleSpec {
    // What the handle sets, read aloud: "grote wijzer", "kwik".
    label: string;
    // The current value as words for a screen reader ("kwart over 3", "12 °C").
    valueText: string;
    value: number;
    min: number;
    max: number;
    // The values after one arrow-key step up (+1) or down (−1).
    step(dir: 1 | -1, drag: DragValues): DragValues;
}

export interface DragHandleProps {
    role?: 'slider';
    tabIndex?: number;
    'aria-label'?: string;
    'aria-valuetext'?: string;
    'aria-valuenow'?: number;
    'aria-valuemin'?: number;
    'aria-valuemax'?: number;
    'data-kiosk-handle'?: string;
    onKeyDown?(e: KeyboardEvent): void;
}

const STEP_KEYS: Record<string, 1 | -1> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 };

/** The keyboard alternative: a focusable slider per handle, ±1 step per arrow key; `{}` on the sheet. */
export function dragHandleProps(ctx: ViewerInteraction | null, key: string, spec: DragHandleSpec): DragHandleProps {
    if (!ctx || ctx.kind !== 'drag') return {};
    return {
        role: 'slider',
        tabIndex: 0,
        'aria-label': spec.label,
        'aria-valuetext': spec.valueText,
        'aria-valuenow': spec.value,
        'aria-valuemin': spec.min,
        'aria-valuemax': spec.max,
        'data-kiosk-handle': key,
        onKeyDown: (e) => {
            const dir = STEP_KEYS[e.key];
            if (!dir) return;
            // The arrows step the handle, never scroll the card.
            e.preventDefault();
            ctx.set({ ...ctx.state, drag: spec.step(dir, dragValuesOf(ctx)) });
        },
    };
}

// ── Shared maths ─────────────────────────────────────────────────────────────

/** Clockwise angle in degrees from 12 o'clock of `p` around (cx, cy): 0 at the top, 90 at the right. */
export function clockAngle(p: DragPoint, cx: number, cy: number): number {
    return ((Math.atan2(p.x - cx, -(p.y - cy)) * 180) / Math.PI + 360) % 360;
}

/** `v` rounded to the nearest multiple of `step` (float tails stripped). */
export const snap = (v: number, step: number): number => Number((Math.round(v / step) * step).toFixed(9));

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
