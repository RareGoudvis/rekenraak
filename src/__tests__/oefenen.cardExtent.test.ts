// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { usedExtent } from '../oefenen/kiosk/cardExtent';

// Pupil-play pass 2026-10-10: plaatswaarde's underline (a border under an inline digit) draws below
// its line box, so the card's sizer (overflow hidden, sized from the inner's offsetHeight) cut it off
// and the pupil could not see which digit was asked. The measured extent includes every drawn part.

type Box = { left: number; top: number; width: number; height: number };
const rect = ({ left, top, width, height }: Box) => ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

// An inner box laid out at 340 × 40 px and drawn at `scale`, with leaf children at the given layout boxes.
function inner(scale: number, children: Box[]): HTMLElement {
    const el = document.createElement('div');
    Object.defineProperty(el, 'offsetWidth', { value: 340 });
    Object.defineProperty(el, 'offsetHeight', { value: 40 });
    el.getBoundingClientRect = () => rect({ left: 0, top: 0, width: 340 * scale, height: 40 * scale });
    for (const b of children) {
        const span = document.createElement('span');
        span.textContent = '2';
        span.getBoundingClientRect = () => rect({ left: b.left * scale, top: b.top * scale, width: b.width * scale, height: b.height * scale });
        el.appendChild(span);
    }
    return el;
}

describe('usedExtent: what the card must show of the drawn exercise', () => {
    test('content inside the box: the box height', () => {
        expect(usedExtent(inner(2, [{ left: 10, top: 5, width: 100, height: 30 }]), 340)).toEqual({ x: 6, w: 108, h: 40 });
    });
    test('an underline below the line box grows the height to include it', () => {
        // The underlined digit's box ends at 44 px, 4 px under the 40 px the layout reports.
        const { h } = usedExtent(inner(2, [{ left: 10, top: 5, width: 20, height: 30 }, { left: 40, top: 10, width: 12, height: 34 }]), 340);
        expect(h).toBeGreaterThanOrEqual(44);
    });
    test('nothing measurable: the virtual width, the box height', () => {
        expect(usedExtent(inner(0, []), 340)).toEqual({ x: 0, w: 340, h: 40 });
    });
});
