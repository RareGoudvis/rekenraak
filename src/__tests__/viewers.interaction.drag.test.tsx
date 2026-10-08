// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useState } from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { EMPTY_INTERACTION, ViewerInteractionProvider, type InteractionState } from '../components/viewer/ViewerInteractionContext';
import { dragHandleProps, dragSurfaceProps } from '../components/viewer/kioskDrag';
import type { ClockExercise, MathBlock } from '../services/math/types';
import { kioskFor, kioskInteractOf } from '../services/oefenen/kiosk';
import { checkAnswer } from '../services/oefenen/check';
import { makeBlock } from './helpers/makeBlock';

// Phase C4 (Oefenmodus): the pupil drags a handle on an SVG figure. Real pointer events on the
// surface (down / move / up with the surface's client rect) and the arrow keys on a focused
// handle must land the same values the descriptor checks. Without a drag context the helpers
// add nothing (the sheet path: viewers.interaction.test.tsx proves the DOM unchanged).

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => { consoleError = vi.spyOn(console, 'error').mockImplementation(() => { }); });
afterEach(() => {
    cleanup();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
});

function oneExercise(typeId: string, constraints: Record<string, unknown>, patch: Record<string, unknown> = {}): { block: MathBlock; ex: Record<string, unknown> } {
    const def = REGISTRY[typeId];
    const block = makeBlock(typeId, { constraints });
    const list = def.generate(block) as Record<string, unknown>[];
    const ex = { ...list[0], ...patch };
    (block as unknown as Record<string, unknown>)[def.exerciseField] = [ex];
    return { block, ex };
}

function Harness({ block, onState }: { block: MathBlock; onState: (s: InteractionState) => void }) {
    const [state, setState] = useState<InteractionState>(EMPTY_INTERACTION);
    const { Viewer } = EXERCISE_UI[block.typeId];
    const set = (next: InteractionState) => { setState(next); onState(next); };
    return (
        <BlockWidthProvider value={340}>
            <ViewerInteractionProvider value={{ kind: 'drag', state, set }}>
                <Viewer block={block} showSolutions={false} />
            </ViewerInteractionProvider>
        </BlockWidthProvider>
    );
}

// The surface's client rect = its viewBox at `scale` (the card's CSS zoom), offset like a card.
const OFFSET = { left: 30, top: 50 };
function mount(block: MathBlock, scale = 2) {
    let last: InteractionState = EMPTY_INTERACTION;
    const view = render(<Harness block={block} onState={s => { last = s; }} />);
    const svg = view.container.querySelector<SVGSVGElement>('svg[data-kiosk-drag]')!;
    expect(svg).not.toBeNull();
    const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    svg.getBoundingClientRect = () => ({ left: OFFSET.left, top: OFFSET.top, width: w * scale, height: h * scale, right: OFFSET.left + w * scale, bottom: OFFSET.top + h * scale, x: OFFSET.left, y: OFFSET.top, toJSON: () => ({}) });
    const at = (x: number, y: number) => ({ clientX: OFFSET.left + x * scale, clientY: OFFSET.top + y * scale, pointerId: 1, button: 0, pointerType: 'touch' });
    return {
        view, svg, w, h, state: () => last,
        // One gesture through viewBox points.
        drag: (...pts: Array<[number, number]>) => {
            fireEvent.pointerDown(svg, at(...pts[0]));
            for (const p of pts.slice(1)) fireEvent.pointerMove(svg, at(...p));
            fireEvent.pointerUp(svg, at(...pts[pts.length - 1]));
        },
        handle: (key: string) => view.container.querySelector<SVGElement>(`[data-kiosk-handle="${key}"]`)!,
    };
}

function answerOf(typeId: string, block: MathBlock, ex: unknown, state: InteractionState) {
    const c = block.constraints as Record<string, unknown>;
    const d = kioskFor(typeId)!;
    const ia = kioskInteractOf(d, c)!;
    const given = ia.fromState(state, ex, c);
    return { given, ok: checkAnswer(d, ex, c, given), want: ia.answerOf(ex, c) };
}

describe('helpers', () => {
    test('nothing without a drag context', () => {
        const surface = { width: 10, height: 10, pick: () => 'a', move: () => ({}) };
        const spec = { label: 'x', valueText: 'x', value: 0, min: 0, max: 1, step: () => ({}) };
        expect(dragSurfaceProps(null, surface)).toEqual({});
        expect(dragHandleProps(null, 'a', spec)).toEqual({});
        const tap = { kind: 'tap' as const, state: EMPTY_INTERACTION, set: () => { } };
        expect(dragSurfaceProps(tap, surface)).toEqual({});
        expect(dragHandleProps(tap, 'a', spec)).toEqual({});
    });
});

// SYNC: AnalogClockSVG geometry (r = size / 2 − 4, centre in the middle of the viewBox).
const pointOnFace = (w: number, angle: number, frac: number): [number, number] => {
    const r = 110 / 2 - 4, c = w / 2;
    return [c + Math.sin((angle * Math.PI) / 180) * r * frac, c - Math.cos((angle * Math.PI) / 180) * r * frac];
};

describe('klok tekenen: drag the hands', () => {
    test('both hands: the minute hand dragged round carries the hour, the hour hand snaps to its hour', () => {
        const { block, ex } = oneExercise('klok-kloklezen', { clockType: 'analoog', exerciseMode: 'tekenen', handChoice: 'beide' }, { hours: 4, minutes: 20, timeText: '20 over 4' });
        const m = mount(block);
        // Untouched: no hands drawn yet, two hollow knobs, no answer.
        expect(m.svg.querySelectorAll('.kiosk-knob.is-unset')).toHaveLength(2);
        expect(answerOf('klok-kloklezen', block, ex, m.state()).given).toBe('');
        // The kleine wijzer first: pressed near 3 o'clock on the inner ring.
        m.drag(pointOnFace(m.w, 80, 0.4), pointOnFace(m.w, 95, 0.45));
        expect(m.state().drag).toEqual({ h: 3 });
        // The grote wijzer from 12 round past 12 again to 20 past: the hour moves on to 4.
        m.drag(pointOnFace(m.w, 2, 0.9), pointOnFace(m.w, 120, 0.9), pointOnFace(m.w, 240, 0.9), pointOnFace(m.w, 350, 0.9), pointOnFace(m.w, 30, 0.9), pointOnFace(m.w, 121, 0.9));
        expect(m.state().drag).toEqual({ h: 4, m: 20 });
        const a = answerOf('klok-kloklezen', block, ex, m.state());
        expect(a).toMatchObject({ given: '4:20', ok: true, want: '4:20' });
        expect(m.svg.querySelectorAll('.kiosk-knob.is-unset')).toHaveLength(0);
        // A press on the inner ring right over the grote wijzer still takes the kleine one.
        m.drag(pointOnFace(m.w, 121, 0.35), pointOnFace(m.w, 200, 0.4));
        expect(m.state().drag).toEqual({ h: 6, m: 20 });
    });

    test('keyboard: arrows step the hour by 1 and the minutes by the leaf step, carrying the hour', () => {
        const { block, ex } = oneExercise('klok-kloklezen', { clockType: 'analoog', exerciseMode: 'tekenen', handChoice: 'beide', timeTypes: ['uren', 'nauwkeurig_5'] }, { hours: 2, minutes: 55, timeText: '5 voor 3' });
        const m = mount(block);
        const hh = m.handle('h'), mm = m.handle('m');
        expect(hh.getAttribute('role')).toBe('slider');
        expect(hh.getAttribute('tabindex')).toBe('0');
        fireEvent.keyDown(hh, { key: 'ArrowUp' }); fireEvent.keyDown(hh, { key: 'ArrowRight' }); fireEvent.keyDown(hh, { key: 'ArrowUp' });
        expect(m.state().drag).toEqual({ h: 3 });
        fireEvent.keyDown(mm, { key: 'ArrowDown' });
        expect(m.state().drag).toEqual({ h: 2, m: 55 });
        expect(answerOf('klok-kloklezen', block, ex, m.state()).ok).toBe(true);
        fireEvent.keyDown(mm, { key: 'ArrowUp' });
        expect(m.state().drag).toEqual({ h: 3, m: 0 });
        fireEvent.keyDown(mm, { key: 'a' });
        expect(m.state().drag).toEqual({ h: 3, m: 0 });
    });

    test('only the grote wijzer (the hour hand printed): per minute on a nauwkeurig_1 leaf', () => {
        const { block, ex } = oneExercise('klok-kloklezen', { clockType: 'analoog', exerciseMode: 'tekenen', handChoice: 'minuut', timeTypes: ['nauwkeurig_1'] }, { hours: 7, minutes: 13, timeText: '13 over 7' });
        const m = mount(block);
        expect(m.view.container.querySelectorAll('[data-kiosk-handle]')).toHaveLength(1);
        // Pressed anywhere (even near the centre) it is the only hand to move.
        m.drag(pointOnFace(m.w, 40, 0.3), pointOnFace(m.w, 78.4, 0.8));
        expect(m.state().drag).toEqual({ m: 13 });
        expect(answerOf('klok-kloklezen', block, ex, m.state())).toMatchObject({ given: '7:13', ok: true });
        fireEvent.keyDown(m.handle('m'), { key: 'ArrowUp' });
        expect(answerOf('klok-kloklezen', block, ex, m.state())).toMatchObject({ given: '7:14', ok: false });
    });

    test('a 24-hour face: 15:45 is set as kwart voor 4 on the 12-hour hands', () => {
        const { block, ex } = oneExercise('klok-kloklezen', { clockType: 'analoog', exerciseMode: 'tekenen', handChoice: 'uur', is24hour: true }, { hours: 15, minutes: 45, timeText: 'kwart voor 16', is24hour: true });
        const m = mount(block, 3);
        expect(m.w).toBe(134);
        m.drag(pointOnFace(m.w, 110, 0.5));
        expect(answerOf('klok-kloklezen', block, ex as unknown as ClockExercise, m.state())).toMatchObject({ given: '3:45', ok: true });
    });
});
