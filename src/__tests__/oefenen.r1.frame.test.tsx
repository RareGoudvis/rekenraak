// @vitest-environment jsdom
import { describe, test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { EMPTY_INTERACTION, ViewerInteractionProvider } from '../components/viewer/ViewerInteractionContext';
import { usedExtent } from '../oefenen/kiosk/cardExtent';
import { makeBlock } from './helpers/makeBlock';

afterEach(cleanup);

const rect = (left: number, right: number) => ({ left, right, top: 0, bottom: 20, width: right - left, height: 20, x: left, y: 0 }) as DOMRect;

describe('R1 getallenrijen: the pill frame is part of the card extent', () => {
    function pill(ix: boolean) {
        const leaf = flattenLeaves().find(l => l.id === 'getalbegrip-getallenrijen-nat')!;
        const block = makeBlock(leaf.typeId, { constraints: leaf.defaultConstraints });
        (block as unknown as Record<string, unknown>)[REGISTRY[leaf.typeId].exerciseField] = REGISTRY[leaf.typeId].generate(block);
        const { Viewer } = EXERCISE_UI[leaf.typeId];
        const view = <Viewer block={block} showSolutions={false} />;
        const wrapped = ix ? <ViewerInteractionProvider value={{ kind: 'fill-cells', state: EMPTY_INTERACTION, set: () => { } }}>{view}</ViewerInteractionProvider> : view;
        return render(<BlockWidthProvider value={340}>{wrapped}</BlockWidthProvider>).container;
    }

    test('only the card marks the frame; the sheet carries no attribute', () => {
        expect(pill(false).querySelector('[data-card-extent]')).toBeNull();
        cleanup();
        expect(pill(true).querySelectorAll('[data-card-extent]').length).toBeGreaterThan(0);
    });

    test('usedExtent spans the marked frame, not just the numbers inside it', () => {
        const root = pill(true);
        const inner = root.firstElementChild as HTMLElement;
        const frame = root.querySelector<HTMLElement>('[data-card-extent]')!;
        // Numbers sit 30 px inside a 340 px frame; the frame's own edges must count.
        Object.defineProperty(inner, 'offsetWidth', { value: 340 });
        inner.getBoundingClientRect = () => rect(0, 340);
        frame.getBoundingClientRect = () => rect(0, 340);
        frame.querySelectorAll<HTMLElement>('*').forEach(el => { el.getBoundingClientRect = () => rect(30, 310); });
        const { x, w } = usedExtent(inner, 340);
        expect(x).toBe(0);
        expect(w).toBeGreaterThanOrEqual(340);
    });
});

import { formatMathNumber } from '../services/math/formatters';
describe('R1 the sheet keeps its plain thousands space', () => {
    test('formatMathNumber without the pupil card loaded', () => {
        expect(formatMathNumber(7400)).toBe('7 400');
    });
});
