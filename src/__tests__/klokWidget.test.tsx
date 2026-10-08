// @vitest-environment jsdom
import { describe, test, expect, afterEach, beforeAll } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { useBoardStore } from '../board/useBoardStore';
import KlokWidget from '../board/components/widgets/KlokWidget';
import type { BoardWidget } from '../board/boardTypes';

// jsdom has no PointerEvent (testing-library would fall back to a bare Event without
// clientX) and no pointer capture; both are stubbed so the face's pointer maths run.
beforeAll(() => {
    if (!('PointerEvent' in window)) {
        class PointerEventStub extends MouseEvent {
            pointerId: number;
            constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
        }
        (window as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = PointerEventStub;
    }
    HTMLElement.prototype.setPointerCapture = () => {};
});

afterEach(() => {
    cleanup();
    useBoardStore.getState().resetBoard();
});

// A 200 px face at the origin: centre (100, 100), radius 100.
const R = 100;
const at = (angleDeg: number, dist: number) => ({
    clientX: R + Math.sin(angleDeg * Math.PI / 180) * dist,
    clientY: R - Math.cos(angleDeg * Math.PI / 180) * dist,
});
const MINUTE = 85;   // outer zone grabs the grote wijzer
const HOUR = 30;     // inner 45 % grabs the kleine wijzer

function Live() {
    const w = useBoardStore((s) => s.pages[s.activePageIdx].widgets[0]);
    return w ? <KlokWidget widget={w} dark={false} /> : null;
}

function mount(hours: number, minutes: number) {
    useBoardStore.getState().addWidget({ kind: 'klok', x: 0, y: 0, w: 260, props: { hours, minutes, showDigital: true } } as Omit<BoardWidget, 'id' | 'z'>);
    const utils = render(<Live />);
    const face = utils.container.querySelector('[data-klok-face]') as HTMLElement;
    face.getBoundingClientRect = () => ({ left: 0, top: 0, width: 2 * R, height: 2 * R, right: 2 * R, bottom: 2 * R, x: 0, y: 0, toJSON: () => ({}) });
    return { ...utils, face };
}

const time = () => {
    const p = useBoardStore.getState().pages[0].widgets[0].props as { hours: number; minutes: number };
    return `${p.hours}:${String(p.minutes).padStart(2, '0')}`;
};

// Drag along the given angles in small steps, the way a hand is swept round the face.
function sweep(face: HTMLElement, dist: number, from: number, to: number, stepDeg = 3) {
    fireEvent.pointerDown(face, { ...at(from, dist), pointerId: 1 });
    const dir = Math.sign(to - from);
    for (let a = from + dir * stepDeg; dir > 0 ? a < to : a > to; a += dir * stepDeg) fireEvent.pointerMove(face, { ...at(a, dist), pointerId: 1 });
    fireEvent.pointerMove(face, { ...at(to, dist), pointerId: 1 });
    fireEvent.pointerUp(face, { ...at(to, dist), pointerId: 1 });
}

describe('KlokWidget drag', () => {
    test('the minute hand carries the hour forward past 12', () => {
        const { face, getByText } = mount(3, 40);
        sweep(face, MINUTE, 240, 420);   // :40 → round past 12 → :10
        expect(time()).toBe('4:10');
        getByText('04:10');
    });

    test('the minute hand carries the hour back past 12', () => {
        const { face } = mount(4, 10);
        sweep(face, MINUTE, 60, -90);    // :10 → back past 12 → :45
        expect(time()).toBe('3:45');
    });

    test('a full turn of the minute hand advances exactly one hour, also across noon', () => {
        const { face } = mount(11, 30);
        sweep(face, MINUTE, 180, 540);
        expect(time()).toBe('12:30');
    });

    test('the hour hand snaps to whole hours and keeps the minutes', () => {
        const { face } = mount(9, 50);
        // At 3:50 the kleine wijzer stands at 115°, next to the 4: grabbing it there means 3.
        sweep(face, HOUR, 290, 118);
        expect(time()).toBe('3:50');
    });

    test('the written time reads the face hour after the carry passes noon', () => {
        useBoardStore.getState().addWidget({ kind: 'klok', x: 0, y: 0, w: 260, props: { hours: 13, minutes: 15, showText: true, textStyle: 'tekst' } } as Omit<BoardWidget, 'id' | 'z'>);
        const { getByText } = render(<Live />);
        getByText('kwart over 1');
    });
});
