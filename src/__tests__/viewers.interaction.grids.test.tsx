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
const picked = (c: Element) => parts(c).filter(p => p.getAttribute('aria-pressed') === 'true').map(p => (p as HTMLElement).dataset.kioskKey);

function leafType(leafId: string, extra: Record<string, unknown> = {}): OefenType {
    const leaf = flattenLeaves().find(l => l.id === leafId)!;
    const constraints = makeDraftBlock(leaf.typeId, { ...leaf.defaultConstraints, ...extra }).constraints as Record<string, unknown>;
    return { typeId: leaf.typeId, leafId, label: leafId, constraints, limit: 3, weight: 1 };
}

const controleer = () => screen.getByRole('button', { name: 'Controleer' }) as HTMLButtonElement;

function cardFlow(leafId: string, partCount: number | null) {
    st().load(hashOf(starterSessie({ types: [leafType(leafId)] })));
    st().start();
    const { container } = render(<OefenApp />);
    expect(container.querySelector('.kiosk-card-inner')!.hasAttribute('inert')).toBe(false);
    if (partCount !== null) expect(parts(container)).toHaveLength(partCount);
    tapAnswer(true);
    fireEvent.click(controleer());
    expect(st().lastCorrect).toBe(true);
    st().next();
    tapAnswer(false);
    st().answer();
    expect(st().lastCorrect).toBe(false);
}

describe('deelbaarheid tabel', () => {
    test('a cell per divisor toggles and shows its tick', () => {
        const block = oneExercise('deelbaarheid', { layout: 'tabel', divisors: [2, 5, 10] });
        const { container } = render(<Harness block={block} kind="tap-multi" />);
        const ps = parts(container);
        expect(ps.map(p => (p as HTMLElement).dataset.kioskKey)).toEqual(['0', '1', '2']);
        fireEvent.click(ps[0]); fireEvent.click(ps[2]);
        expect(picked(container)).toEqual(['0', '2']);
        expect(ps[0].textContent).toBe('✓');
        fireEvent.click(ps[0]);
        expect(picked(container)).toEqual(['2']);
        expect(ps[0].textContent).toBe('');
    });

    test('kiosk flow: juist and fout', () => cardFlow('deelbaarheid-tabel', 3));
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
