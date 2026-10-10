// @vitest-environment jsdom
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { useState } from 'react';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import { EXERCISE_UI } from '../config/exerciseUI';
import { REGISTRY } from '../config/exerciseRegistry';
import { flattenLeaves } from '../config/appstructure';
import { BlockWidthProvider } from '../components/viewer/BlockWidthContext';
import { EMPTY_INTERACTION, ViewerInteractionProvider, type InteractionKind, type InteractionState } from '../components/viewer/ViewerInteractionContext';
import type { MathBlock } from '../services/math/types';
import type { OefenType } from '../services/oefenen/types';
import OefenApp from '../oefenen/OefenApp';
import { useOefenStore } from '../oefenen/useOefenStore';
import { makeBlock } from './helpers/makeBlock';
import { hashOf, resetKiosk, starterSessie, tapAnswer } from './helpers/oefenKiosk';
import { makeDraftBlock } from '../components/curriculum/draftBlock';
import { kioskFor } from '../services/oefenen/kiosk';

// Phase C1b: the grid / colour families (deelbaarheid tabel + kleuren, breuken kleuren) answer
// by tapping their own parts on the card.

const st = () => useOefenStore.getState();
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    resetKiosk();
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    cleanup();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
});

function oneExercise(typeId: string, constraints: Record<string, unknown>): MathBlock {
    const def = REGISTRY[typeId];
    const block = makeBlock(typeId, { constraints });
    const list = def.generate(block) as unknown[];
    (block as unknown as Record<string, unknown>)[def.exerciseField] = list.slice(0, 1);
    return block;
}

function Harness({ block, kind, onState }: { block: MathBlock; kind: InteractionKind; onState?: (s: InteractionState) => void }) {
    const [state, setState] = useState<InteractionState>(EMPTY_INTERACTION);
    const { Viewer } = EXERCISE_UI[block.typeId];
    const set = (next: InteractionState) => { setState(next); onState?.(next); };
    return (
        <BlockWidthProvider value={340}>
            <ViewerInteractionProvider value={{ kind, state, set }}>
                <Viewer block={block} showSolutions={false} />
            </ViewerInteractionProvider>
        </BlockWidthProvider>
    );
}

const parts = (c: Element) => [...c.querySelectorAll<HTMLElement | SVGElement>('[data-kiosk-key]')];
const picked = (c: Element) => parts(c).filter(p => p.getAttribute('aria-pressed') === 'true').map(p => p.getAttribute('data-kiosk-key'));

function leafType(leafId: string, extra: Record<string, unknown> = {}): OefenType {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints, ...extra }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId, label: leafId, constraints, limit: 3, weight: 1 };
}

const controleer = () => screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement;

// breuken kleuren answers a COUNT of parts, so its pupil taps the first n keys (or one too many).
const tapCount = (right: boolean) => {
    const cur = st().shown!;
    const n = (cur.exercise as { numerator: number }).numerator;
    const keys = kioskFor('breuken')!.interact!.keys!(cur.exercise, cur.constraints);
    st().setInteraction({ ...EMPTY_INTERACTION, selected: keys.slice(0, right ? n : n + 1 > keys.length ? n - 1 : n + 1) });
};

function cardFlow(leafId: string, partCount: number | null, tap: (right: boolean) => void = tapAnswer) {
    st().load(hashOf(starterSessie({ types: [leafType(leafId)] })));
    st().start();
    const { container } = render(<OefenApp />);
    expect(container.querySelector('.kiosk-card-inner')!.hasAttribute('inert')).toBe(false);
    if (partCount !== null) expect(parts(container)).toHaveLength(partCount);
    tap(true);
    fireEvent.click(controleer());
    expect(st().lastCorrect).toBe(true);
    st().next();
    tap(false);
    st().answer();
    expect(st().lastCorrect).toBe(false);
}

describe('deelbaarheid tabel', () => {
    test('a cell per divisor toggles and shows its tick', () => {
        const block = oneExercise('deelbaarheid', { layout: 'tabel', divisors: [2, 5, 10] });
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        const ps = parts(container);
        expect(ps.map(p => p.getAttribute('data-kiosk-key'))).toEqual(['0', '1', '2']);
        fireEvent.click(ps[0]); fireEvent.click(ps[2]);
        expect(picked(container)).toEqual(['0', '2']);
        expect(ps[0].textContent).toBe('✓');
        fireEvent.click(ps[0]);
        expect(picked(container)).toEqual(['2']);
        expect(ps[0].textContent).toBe('');
    });

    test('kiosk flow: juist and fout', () => cardFlow('deelbaarheid-tabel', 3));
});

describe('breuken kleuren', () => {
    test.each([['rectangle', 6], ['square', 5], ['circle', 4]])('%s: a part per noemer toggles; the sheet stays plain', (shape, d) => {
        const block = oneExercise('breuken', { subType: 'kleuren', shapes: [shape], shape, minDenominator: d, maxDenominator: d });
        const ex = (block.fractionExercises as Array<{ denominator: number }>)[0];
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        const ps = parts(container);
        expect(ps).toHaveLength(ex.denominator);
        expect(ps.every(p => p.getAttribute('role') === 'button' && p.getAttribute('tabindex') === '0')).toBe(true);
        fireEvent.click(ps[1]); fireEvent.click(ps[0]);
        expect(picked(container)).toEqual(['0', '1']);
        fireEvent.keyDown(ps[1], { key: 'Enter' });
        expect(picked(container)).toEqual(['0']);
        expect(ps[0].hasAttribute('data-kiosk-selected')).toBe(true);
    });

    // A kiosk square of d >= 5 is a grid (parts under 44 px as strips); the sheet keeps its strips.
    test.each([[8, 2], [9, 3], [6, 2], [7, 1]])('square d=%i: kiosk grid has %i rows, same part count', (d, rows) => {
        const block = oneExercise('breuken', { subType: 'kleuren', shapes: ['square'], shape: 'square', minDenominator: d, maxDenominator: d });
        const svgOf = (c: Element) => c.querySelector<SVGElement>('svg[viewBox]')!;
        const rects = (c: Element) => [...svgOf(c).querySelectorAll('rect')];
        const ys = (c: Element) => new Set(rects(c).map(r => r.getAttribute('y')));
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        expect(parts(container)).toHaveLength(d);
        expect(svgOf(container).getAttribute('data-kiosk-layout')).toBe('grid');
        expect(ys(container).size).toBe(rows);
        cleanup();
        const { Viewer } = EXERCISE_UI[block.typeId];
        const plain = render(<BlockWidthProvider value={340}><Viewer block={block} showSolutions={false} /></BlockWidthProvider>);
        expect(rects(plain.container)).toHaveLength(d);
        expect(svgOf(plain.container).hasAttribute('data-kiosk-layout')).toBe(false);
        expect(ys(plain.container)).toEqual(new Set(['0']));
        expect(rects(plain.container).every(r => r.getAttribute('width') === rects(plain.container)[0].getAttribute('width'))).toBe(true);
    });

    // BUGS (Tooling): a prime d >= 11 had no grid, so its one row of strips drew ~40 px wide on an
    // 844 x 390 phone card. It becomes two rows of equal-AREA parts (6 + 5 for 11: the row with
    // more parts is taller), and every d from 5 to 13 keeps each part >= 44 px on that card.
    test.each([[11, 6], [13, 7]])('square d=%i: two rows of equal parts (%i on top)', (d, top) => {
        const block = oneExercise('breuken', { subType: 'kleuren', shapes: ['square'], shape: 'square', minDenominator: d, maxDenominator: d });
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        const rects = [...container.querySelectorAll<SVGRectElement>('svg[viewBox] rect')];
        expect(rects).toHaveLength(d);
        const num = (r: SVGRectElement, a: string) => Number(r.getAttribute(a));
        expect(new Set(rects.map(r => r.getAttribute('y'))).size).toBe(2);
        expect(rects.filter(r => num(r, 'y') === 0)).toHaveLength(top);
        const areas = rects.map(r => num(r, 'width') * num(r, 'height'));
        for (const a of areas) expect(a).toBeCloseTo(areas[0], 6);
    });

    test('square d=5..13: every kiosk part is >= 44 px on an 844 x 390 card', () => {
        // The card body of an 844 x 390 landscape phone (ExerciseCard scales the figure into it, <= 3.2x).
        const BOX = { w: 460, h: 250 };
        for (let d = 5; d <= 13; d++) {
            const block = oneExercise('breuken', { subType: 'kleuren', shapes: ['square'], shape: 'square', minDenominator: d, maxDenominator: d });
            const { container } = render(<Harness block={block} kind="tap-multi" />);
            const svg = container.querySelector<SVGElement>('svg[viewBox]')!;
            const [, , w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
            const k = Math.min(3.2, BOX.w / w, BOX.h / h);
            const smallest = Math.min(...[...svg.querySelectorAll('rect')].map(r => Math.min(Number(r.getAttribute('width')), Number(r.getAttribute('height')))));
            expect(smallest * k, `d=${d}`).toBeGreaterThanOrEqual(44);
            cleanup();
        }
    });

    test('square d=4 stays strips in the kiosk', () => {
        const block = oneExercise('breuken', { subType: 'kleuren', shapes: ['square'], shape: 'square', minDenominator: 4, maxDenominator: 4 });
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        expect(container.querySelector('svg[data-kiosk-layout]')).toBeNull();
    });

    test('kiosk flow: any n parts are right, juist and fout', () => cardFlow('breuken-kleuren', null, tapCount));

    // Owner call 12: the kiosk header already says "Kleur 1/5 in.", so the card drops its own prompt; the sheet keeps it.
    test('the card has no "Kleur … in:" prompt of its own; the sheet does', () => {
        const block = oneExercise('breuken', { subType: 'kleuren', shapes: ['rectangle'], shape: 'rectangle', minDenominator: 5, maxDenominator: 5 });
        const kiosk = render(<Harness block={block} kind="tap-multi" />);
        expect(kiosk.container.textContent).not.toMatch(/Kleur|in:/);
        cleanup();
        const { Viewer } = EXERCISE_UI[block.typeId];
        const sheet = render(<BlockWidthProvider value={340}><Viewer block={block} showSolutions={false} /></BlockWidthProvider>);
        expect(sheet.container.textContent).toMatch(/Kleur.*in:/);
    });
});

describe('deelbaarheid kleuren', () => {
    test.each([
        ['rooster', { viewMode: 'strip', divisors: [5], perRow: 10 }, 10],
        ['omcirkelen', { viewMode: 'markeren', divisors: [5], perRow: 10 }, 10],
        // 100 generated numbers, the card shows 20 in rows of 5.
        ['kleurraster', { viewMode: 'strip', rasterVorm: 'rechthoek', divisors: [5], maxGetal: 100, rasterCount: 100, rasterCols: 10 }, 20],
    ])('%s: every number toggles', (_name, constraints, count) => {
        const block = oneExercise('deelbaarheid-kleuren', constraints);
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        const ps = parts(container);
        expect(ps).toHaveLength(count);
        fireEvent.click(ps[0]); fireEvent.click(ps[3]);
        expect(picked(container)).toEqual(['0', '3']);
        fireEvent.click(ps[0]);
        expect(picked(container)).toEqual(['3']);
        expect(ps[3].hasAttribute('data-kiosk-selected')).toBe(true);
    });

    test.each(['deelbaarheid-rooster', 'deelbaarheid-omcirkelen', 'deelbaarheid-kleurraster'])('%s: kiosk flow, juist and fout', leaf => cardFlow(leaf, null));
});
